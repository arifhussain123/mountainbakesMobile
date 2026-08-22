# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The sibling `mountainbakes-server/` (Express + Supabase) and `mountainbakes-frontend/`
(Next.js static export) each have their own `.claude/CLAUDE.md`; the parent folder's
`CLAUDE.md` covers what spans all three. Read this one for anything in this tree.

## Commands

```bash
npm start                # Metro
npm run android          # debug build → device/emulator
npm run typecheck        # tsc --noEmit
npm run lint             # eslint (clean — keep it that way)
npm test                 # jest
npm run shared:check     # src/shared must equal the server's, byte for byte
npm run theme:check      # no hard-coded colour anywhere in src/components
npm run splash:check     # splashTop must equal the native bootsplash colour
npm run verify           # typecheck + shared:check + theme:check + splash:check + test — run this before calling anything done
npm run build:android    # release APK
npm run clean:android    # gradlew clean
```

**This project uses `npm`, not `pnpm`** — it has a `package-lock.json`, unlike both
siblings. `engines` asks for Node >= 22.11 (the siblings pin 24.x); do not "align"
them without a reason.

One test file, or one case:

```bash
npx jest src/services/sync/__tests__/syncManager.test.ts
npx jest -t 'names the date field per endpoint'
```

The API has to be running alongside: `cd ../mountainbakes-server && pnpm dev` (port
3001). Nothing starts both. Android cannot reach your machine's `localhost` on its
own: `.env.development` points at `localhost:3001` and relies on
**`adb reverse tcp:3001 tcp:3001`**, which works on a physical device *and* an
emulator. `10.0.2.2` is the emulator-only alternative — unroutable on a real
phone, which is why it is not what the file says.

`react-native-config` bakes `.env.*` values into the binary at **build** time. Editing
`.env.development` and reloading Metro changes nothing; the app must be rebuilt.
`assertApiReachable()` in `src/config/env.ts` throws loudly on a missing value rather
than letting every request 404 quietly.

A Gradle build used to print a deprecation summary on every run. It is silenced by
`org.gradle.warning.mode=none` in `android/gradle.properties`, and that file carries
the full measurement behind the decision. In short: `--warning-mode all` reports 36
problems and the build's own `problems-report.html` attributes **every one of them
to code outside this repository** — 15 to AGP, 6 to the Kotlin plugins, and 15 to
three node modules (`op-sqlite` 6, `react-native-blob-util` 5,
`react-native-bootsplash` 4), all three of which are already pinned at their newest
published release. Nothing in `android/build.gradle`, `android/app/build.gradle` or
`android/settings.gradle` contributes one.

So it is suppression, not a fix, because there is nothing here to fix — and the cost
is that it also hides deprecations from **our** Gradle files. Comment the property
out, or run `--warning-mode all`, before changing anything under `android/`. Do not
patch `node_modules`: the next `npm install` undoes it. They become hard errors only
in Gradle 10, which this project is not on.

**iOS has never been built.** The project exists from the template, CocoaPods has
never run, and development happens on Linux. Treat any iOS claim as unverified.

## Architecture

### A third client of the same API — never a second backend

```
this app ──REST──> mountainbakes-server ──> Supabase
```

The server holds the service-role key and owns every privileged write. This app holds
only the Supabase **anon** key and the signed-in user's session; it reads no
privileged table directly and computes no financial truth of its own. When an
endpoint is missing, the fix is in the server, not a Supabase call from here.

Auth is `supabase.auth.signInWithPassword` against Supabase directly, then the access
token rides on every API call as `Authorization: Bearer`. Role and branch come from
the JWT's `app_metadata` (`src/services/supabase/claims.ts`) — never from a form, and
never from anything the user can type. Two sign-in routes exist because Finance is a
separate product surface: e-mail for the main app, a Finance User ID (resolved via
`POST /api/auth/finance-lookup`) plus TOTP for Finance.

Navigation gating is UX, not a boundary. The API re-authorises every request.

### Every write is offline-first, through one code path

There is no `if (isOnline)` branch at submit time, deliberately: branching would make
the offline case the rarely-exercised one, and that is the case staff in a basement
shop actually rely on. A write always goes:

```
form → writeOffline() → SQLite row + sync_queue row (one transaction) → drain attempt
```

There are **three** outcomes to report, not two (`services/sync/writeOutcome.ts`):
saved, queued ("Saved offline"), and **refused** — a write the server rejected with a
409, which is parked in `sync_conflicts` and will never sync on its own. The rule runs
both directions: never report a queued transaction as saved (that is how the same
expense gets entered twice), and never report a refused one as queued (that is how a
sale nobody looks at goes missing until the till is reconciled). Read the outcome by
`client_operation_id`, never off the `DrainResult` tally — `{synced: 3, conflicts: 1}`
says nothing about which one was *this* write, and on a busy queue that is the normal
case rather than the edge.

`src/services/sync/syncManager.ts` drains the queue. Its failure classification is the
whole design: network/timeout/5xx back off and retry; **401 pauses the entire drain**
without burning the row's retry budget; 409 is recorded as a conflict for a human; a
4xx judgement parks the row as failed. **Nothing is ever deleted on failure** — a
parked row is still the only copy of a transaction the server never accepted. The
drain lock is claimed *synchronously* before any `await`, or two drains send the same
row twice.

### `client_operation_id` is the spine

A UUIDv7 minted when a transaction is **created**, not when it is sent, and reused as:
the domain row's primary key, `sync_queue.client_operation_id`, and the
`Idempotency-Key` header on every attempt. **Never regenerate it on retry** — that is
exactly how a request the server already processed becomes a second sale. The server
honours the header (its migration 84) on the five offline-capable writes and returns
the original response on a repeat.

That yields the one invariant the conflict UI is built on: **re-sending with the same
key is always safe** (the server replays its answer); **re-sending with a new key
bypasses the dedupe and executes**. So `resend_as_new` — the one resolution that mints
a fresh id, because the payload or business date changed — is offered only where the
operation certainly never landed. `mayHaveLanded` on the policy in
`services/sync/conflicts.ts` is that gate, and every conflict type declares it
alongside the resolutions it permits. Getting it backwards is how a stock return that
already moved half its products moves them again. `keep_server` closes the local row as
`superseded` rather than deleting it — it is still the only record of what the operator
actually entered.

### Reads fall back to the mirror — but only on a transport failure

The read half lives in `services/query/readThrough.ts` over
`database/repositories/referenceRepository.ts`: fetch, mirror what came back, and on
failure serve the mirror instead. Three rules carry the design, and each is a bug if
inverted:

- **Only transport failures fall back.** A 403 is an *answer* — the server considered
  the request and refused it. Serving cache over a refusal shows a branch data it is no
  longer allowed to see and hides a role change from the person it happened to. Falling
  back is limited to network / offline / timeout, plus 5xx where the server failed
  rather than decided.
- **A known-offline read does not wait to find out.** When NetInfo is *sure* there is no
  connection, the mirror is read first and the network is never touched — otherwise
  every screen hangs for the client timeout before showing data that was on the phone
  all along. `isOnline` is deliberately optimistic (null reachability counts as online),
  so a captive portal still goes through the request path.
- **Empty is not absent.** A mirror that was never written rethrows rather than
  returning `[]`. "No products" and "we could not reach the server" are different
  screens.

`store/mirrorStore.ts` publishes which resources are currently mirror-served and how
old they are. It exists because TanStack Query's `dataUpdatedAt` is when the *query*
resolved, and a mirror-served read resolves successfully **now** — that clock would
stamp the current time on hours-old data, the one reading that makes stale data look
fresh. The mirror's own `synced_at` is the truth. It clears the moment a live fetch
succeeds, so the mark cannot outlive its cause.

### Business date is captured on the device

The day rolls at **02:00 Asia/Karachi**, not midnight (`@mb/shared/utils/timezone`). A
sale rung up at 21:00 offline and synced at 07:00 belongs to the evening it was made,
so the queue row carries the date and the send merges it into the payload. The field
is **named per endpoint** (`date` on expenses, `businessDate` elsewhere — see
`services/sync/endpoints.ts`); sending the wrong key is silently ignored, which is
precisely how a queued transaction lands on the wrong day with nothing appearing to
fail. The server bounds it (no future dates, ≤7 business days, closed days refused).

### `src/shared/` is a mirror of two other trees

It is byte-identical to `mountainbakes-server/src/shared/`, which
`mountainbakes-frontend/` also mirrors. Nothing enforces it mechanically — separate
repos, no shared package, no failing build. Editing a schema here means making the
identical edit in **both** other trees, and `npm run shared:check` is what catches a
slip. A stale copy of `timezone.ts` bills sales to the wrong day.

### Screens are resolved by role, not by name

`navigation/roleConfig.ts` is the single source of truth for what a role can reach —
its tabs, its More list and its account panel, all three inventoried in one file so
they can be compared. `roleNavigation.ts` keeps only the role *predicates*
(`isBranchRole`, `isFinanceRole`, `roleGroupFor`), which are domain rules used well
outside navigation.

The floating nav bar carries **one create action in its centre** per role group
(`CENTRE_ACTIONS`) — branch gets New Order. It adds no destination, so it is not
in the single-path inventory; but nothing else may offer the same action, which
is why the corner FAB on the demands list and the `newOrder` quick action are
both gone. `navigationSurface.test.ts` asserts that.

`resolveTabScreen(role, route)` in `navigation/screenRegistry.tsx` maps (role, tab
name) → component, because **the same tab name means different screens for different
roles**: "Sales" at the production counter allows a `staff` payment method a branch
sale must never offer, and "Home" is four different dashboards. An unbuilt tab renders
a placeholder naming the phase it lands in, so an unbuilt screen is never mistaken for
an empty one.

**No screen is reachable from two surfaces**, and
`navigation/__tests__/navigationSurface.test.ts` enforces that for all eight roles: no
More route is also a tab name, none is listed twice, and nothing in the account panel
is also a tab or a More row. The drawer is the account panel, not navigation — it holds
identity, connection state, appearance and sign-out, and there is not one `navigate()`
call in `AccountDrawer.tsx`. Adding a destination means adding it in exactly one place;
`docs/navigation.md` is the full account, including why New Order is a modal on
`OrdersStack` rather than a tab.

`branch_user` is a **shift account carrying its manager's `branchId`**, not a branch of
its own — branch-scoped code must treat it and `branch_manager` identically
(`isBranchRole`) or the shift user sees an empty shop.

### Local database

`op-sqlite` over JSI, WAL, opened in `database/localDb.ts`. Migrations
(`database/migrations/index.ts`) are versioned with `PRAGMA user_version` and are
**append-only, forward-only and never destructive**: an app update must not drop a
table holding unsynced work, and editing a shipped migration silently diverges the
schema on devices that already ran it. Domain row and queue row are written in one
`transaction()` — either alone is a lost or a phantom transaction.

The database is **not** encrypted; it holds business records only. Session and tokens
live in MMKV encrypted with a Keychain-held key (`services/storage/secureStorage.ts`).

### API client conventions

`services/api/client.ts`. There is **no `{success, data}` envelope** — bodies are
resource-keyed (`{user}`, `{orders, total}`), so each caller unwraps its own shape and
the client unwraps nothing. Errors are `{error, details?}`. A 401 triggers exactly one
refresh-and-replay. The token is attached by an interceptor at **send** time, never
frozen onto a queued row — an overnight retry with a captured token would 401.

`services/api/errors.ts` turns everything into an `ApiError` with a `kind`, and that
`kind` is what the sync queue branches on. Changing the mapping changes retry
behaviour for real money.

### Startup is a declared sequence

Seven steps, in `services/boot/bootSequence.ts` — not `App.tsx`, which now only
gates on it:

```
open → settings → network → session → profile → sync → cache
```

Four constraints are load-bearing and the rest is convention. **Database before
session**, because signing in can trigger a drain immediately and the queue
tables have to exist. **Storage before settings and before session**, because
both are read out of encrypted MMKV and the Keychain has to hand over its key
first. **Network before session**, so the first reads of the run know whether
they are offline — `readThrough` skips the request entirely when NetInfo is *sure*
there is no connection, and a probe still in flight means a phone that has been
offline all afternoon hangs on the client timeout for data already on the device.
**Profile before cache**, because the stock mirror is keyed by the branch the
profile carries.

**`open` is the database and encrypted storage together**, under `Promise.all`.
They need nothing from each other — one is SQLite opening a file and running
migrations, the other is the Keychain handing over a key for MMKV — and both are
native I/O the JS thread does nothing but wait on, so the wait is the slower of
the two rather than their sum. They are **one declared step** and not two
overlapping ones: a sequence whose declared order is not its real order is a
document that lies, and both constraints running through this step are satisfied
by it as a whole. `Promise.all` and never two bare promises awaited in turn —
the latter leaves a window where one has rejected and nothing is listening yet,
which Hermes reports as an unhandled rejection: a red box on a start that was
already failing, in front of the retry the user needs to see. `settings` stays
its own step after it, because hydrating settings is a handful of synchronous
MMKV reads with nothing left to overlap it against.

`bootSequence.ts` takes its steps as injectable `BootDeps`, and that seam exists
for one reason: the order *is* the design, and order is exactly what a test cannot
observe through separately-mocked native modules. `__tests__/bootSequence.test.ts`
asserts the four constraints as relationships rather than indices, so reordering a
conventional step does not rewrite the test and breaking a real one does fail it.
It also asserts that `open` genuinely overlaps — that storage starts before the
database has resolved, and that neither half is skipped past.

**The last two steps are started, not awaited.** A drain is as long as the queue
and the connection make it, and a warm may go to the network; navigation waits for
neither, and neither can fail the start — a drain that cannot reach the server is
the case the queue exists for, and a cache that did not warm costs a skeleton on
one screen. Both swallow their own rejections *and* are wrapped against a
synchronous throw, because an unhandled rejection during startup is a red box over
the first screen.

`profile` resolves the access profile from the session's claims and does **not**
fetch one. Role and branch ride in the JWT; a profile endpoint would be a second
answer to "what may this user reach", and the two would disagree the day a role
changed mid-session. An unrecognised role gets the minimal shell and a warning
rather than a failed start, matching `AppNavigator`.

`cache` warms through `queryClient.prefetchQuery` against the definitions in
`services/query/catalogQueries.ts` — the same module `hooks/useCatalog.ts` builds
its queries from. That sharing is not tidiness: a prefetch that rebuilt a key by
hand fills a *second* cache entry, the screen then fetches into its own empty one,
and the warm costs a round of requests while looking like it worked.
`__tests__/warmCaches.test.ts` asserts the keys against `qk`.

`sync` fires the first drain of a launch. `useSyncEngine` still drains on mount,
and that is not a duplicate — mount is the sign-in event for a session established
*after* boot. When boot did start one, `syncStore.sync()` has already flipped
`phase` to `syncing` synchronously, so the mount call returns at the guard.

A bootstrap failure shows a retry, never an endless splash, and the whole sequence
is raced against one budget (`utils/bootTimeout.ts`) rather than per step — four
slow steps would otherwise add up to a wait none of them individually exceeded.
The failing step is reported through `onStep`, because "startup failed" alone does
not distinguish a locked database from an unreachable API.

### Theme

Light and dark are two token sets behind one interface (`theme/`). Do not write
`isDark ? a : b` in a component; add or use a token.

**The palette is a fill and a mark, and they are not interchangeable.** v4 runs
two colours: ember orange for every **fill** — a button, the active chip, the
centre action button, a meter, a chart line — and deep brown `#3E1B00` for every
**mark**: type, icons, links, and the hero blocks a KPI sits on. It never sets a
link or a figure in orange, and it cannot: the ember is 3.2:1 on a card.

So `primary` is a fill and `accent` is the mark, and reaching for `primary` as a
text or glyph colour is the mistake to watch for — `contrast.test.ts` asserts
`accent` is strictly the more readable of the two, and `primary` is held to the
3:1 non-text bar rather than 4.5:1. In light `accent` happens to equal `text`,
because v4 carries link-ness with **weight** rather than hue; that is deliberate
and documented on the token.

`ember500` is v4's `#FB6D34` walked down 6%. Its own orange is 2.73:1 against its
own field, under the 3:1 that WCAG 1.4.11 asks of a graphical object carrying
information — and that bar is not academic, because the same value paints the
stock meter and the trend line, both of which are pure graphics with no label to
fall back on.

**Cards carry a soft lift again** (`e1`, 7% opacity) *plus* the hairline. An
earlier revision of v4 separated with borders alone and this file said so; the
current one draws both. The border is still what separates a card from the
field — `surface` on `bg` is 1.05:1 — and `e1` only stops white-on-cream looking
pasted on. `e2` and `e3` remain the floating nav bar and the centre action button
and nothing else.

Which scheme is live comes from the app's **stored** mode, not the OS — the OS is
consulted only when that mode is `system`. The native side has to agree, because
Android resolves `values-night/` from its own night setting and would otherwise
splash in a scheme the user did not pick: `settingsStore` mirrors the mode into
`SharedPreferences` through `specs/NativeAppTheme.ts`, and `MainActivity` turns it
into an `AppCompatDelegate` night mode **before** `RNBootSplash.init`. The mirror
lands on the next cold start, never mid-session — applying it live recreates the
activity and remounts the React tree.

The splash background is a gradient in `SplashScreen.tsx` and a flat colour
natively, because `windowSplashScreenBackground` takes a colour and not a
drawable. `splashTop` must therefore equal `bootsplash_background` in
`res/values{,-night}/colors.xml` or the hand-off steps rather than fades;
`npm run splash:check` is the only thing enforcing it. That hand-off happens when
`SplashScreen` **mounts** — it calls `RNBootSplash.hide()` itself, so the JS
splash carries the rest of boot. Hiding at the end of bootstrap, as `App.tsx`
used to, meant the fade revealed the dashboard and the splash was never seen.

### Motion

Motion is **feedback, never decoration** — every duration and curve comes from
`theme/motion.ts`, and nothing animates that is not reporting a state change. No
bounce, no parallax headers, no confetti, no counters ticking up; the only two
loops in the app (sync spinner, skeleton pulse) run solely while the work they
describe is in flight.

Every tappable surface is `MBPressable`, which scales to 0.98 with a small
opacity shift over 120ms. Do not reach for a bare `Pressable` — press feedback
used to be four different idioms, and `MBTabBar` is the one deliberate exception
(the platform's ripple wins on a tab bar). Screen transitions live in
`navigation/screenAnimations.ts`; tab switches are instant by declaration, not by
inheriting a default.

`useReducedMotion()` subscribes to the OS setting. Honouring it means suppressing
the *movement* and keeping the change — a cross-fade instead of a slide, a jump
instead of travel, the dim without the scale. Slowing an animation down is not
honouring it. `docs/motion.md` is the full account, including the drawer, which
cannot honour it at all because the library exposes no control.

### Test harness

Two setup files, and the split is load-order, not taste. `jest.setup.js` holds native
module mocks, which must register **before** the framework loads; `jest.after-env.js`
holds anything needing a live runtime (`expect`, fake timers, a React act
environment). Putting one in the other's file fails in ways that read as a broken
component.

`jest.after-env.js` also reschedules React Query's `notifyManager` onto a microtask.
The default `setTimeout(…, 0)` flushes subscribers on a later tick — outside the
test's `act()` scope, producing standing "not wrapped in act(...)" noise plus
"worker process failed to exit gracefully". Deferral itself is kept deliberately:
calling inline also silences the warnings but drops the coalescing hop, which slowed
the screen suites ~10x. Defer, just not as far.

`src/test-utils/sqliteTestDb.ts` runs migrations and repository SQL against a **real**
database via `node:sqlite` (built into the pinned Node, no native module, no new
dependency), behind the four things the repositories use from op-sqlite — `execute`,
`executeBatch`, `transaction`, and the `{rows, rowsAffected}` shape. Prefer it for
anything where the SQL's *meaning* matters. The older database tests fake `getDb()`
and assert on SQL text, which catches a malformed statement but not a wrong one: a
`markSynced` that updates the queue row and not the domain row passes a string
comparison and fails in a shop.

## Other docs

`docs/mobile-architecture-audit.md` (the backend audit this app was built from — API
surface, roles, domain values, decisions), `docs/navigation.md` (tabs vs More vs the
account panel, header chrome, badges, deep links, icons), `docs/screen-patterns.md`
(dashboard composition, stat cards, quick actions, the FAB rule, lists, sheets, and
how the outcome of a write is reported), `docs/motion.md` (what animates, what
deliberately does not, and what Reduce Motion suppresses), `docs/local-database.md` (what the device stores, what it deliberately does not,
and the reference-mirror gap), `docs/offline-sync.md`,
`docs/cache-policy.md`, `docs/performance.md` (what was optimised and why, what
was measured versus reasoned about, and what was deliberately left alone),
`docs/timezone.md` (the one zone, the two helper families and why picking the
wrong one is the bug, what each layer stores, and the single display funnel),
`docs/testing.md`, `docs/troubleshooting.md`. `README.md`
carries the phase-by-phase status table and what is verified versus not.
