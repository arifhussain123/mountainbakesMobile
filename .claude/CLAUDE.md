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
npm run theme:check      # no hard-coded colour anywhere in src/common/ui
npm run splash:check     # splashTop must equal the native bootsplash colour
npm run fonts:check      # every family/weight the scale uses is registered in Kotlin
npm run verify           # typecheck + shared:check + theme:check + splash:check + fonts:check + test — run this before calling anything done
npm run build:android    # release APK
npm run clean:android    # gradlew clean
```

**This project uses `npm`, not `pnpm`** — it has a `package-lock.json`, unlike both
siblings. `engines` asks for Node >= 22.11 (the siblings pin 24.x); do not "align"
them without a reason.

One test file, or one case:

```bash
npx jest src/api/sync/__tests__/syncManager.test.ts
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

**Android is the only target.** The `ios/` project, its `Gemfile` and the
`.bundle/` CocoaPods config have been removed: iOS was never built, CocoaPods
never ran, and development happens on Linux — carrying a template nobody
compiles only invites claims nobody has checked. Restoring it means `git log --
ios/` and a `react-native init` of the same RN version, not a revert of one
commit. Note `metro.config.js` still declines to block bare `ios/` by name,
because `react-native-screens` ships real JS under such a path in node_modules.

## Architecture

### Where code lives

`src/` is feature-sliced, following `skills/react-native-folder-structure-guidelines`:

```
src/
├── api/          HTTP client, transport services, react-query hooks, the sync engine
├── assets/       fonts, icons, images + a typed barrel
├── common/       cross-feature: ui, theme, till, hooks, utils, helpers, database, storage, boot
├── config/       env.ts
├── features/     the bulk of the app — one slice per domain
├── navigation/   navigators, routes, param lists, helpers
├── shared/       the server mirror — NOT ours to organise (see below)
├── specs/        TurboModule codegen specs
└── state/        global Zustand stores
```

**Rule:** code used by exactly one feature lives inside that feature; the moment a
second feature needs it, it is promoted to `common/` (or `api/`, `state/`). Every
feature has an `index.ts` that is its only import surface — nothing reaches into
`features/<x>/screens/…` from another slice. The `@/` alias maps to `src/` and is
declared in **two places that must stay in sync**: `tsconfig.json` (`paths`) and
`babel.config.js` (`module-resolver`, which does the rewriting for Metro *and* Jest).

Two deliberate departures from that skill, both load-bearing:

- **The design system is `common/`, not `shared/`.** The skill puts ui/theme/hooks/
  utils under `shared/`. That name is already taken here by the byte-identical
  mirror of the server's tree, and `scripts/check-shared-mirror.sh` runs `diff -r`
  against it — so a single file added under `src/shared/` fails `npm run verify`.
  Renaming the mirror instead would break the convention it shares with both
  sibling repos. `common/` is the compromise, and it is the only new bucket.
- **There is no `Routes` const.** The skill asks for `navigation/routes.ts` as the
  only place route names are written. They are already written once, more strongly,
  in `navigation/types.ts`: `AppTabName` is a union and `TAB_ROOT_ROUTE` is
  `satisfies Record<AppTabName, string>`, so an unlisted tab is a *compile* error.
  `routes.ts` exists but only re-exports those — a parallel const of string literals
  would be the second source of truth whose drift `TAB_ROOT_ROUTE`'s own comment
  records fixing.

`src/specs/` also stays put: it is pinned by `codegenConfig.jsSrcsDir` in
`package.json`, and moving it can only be validated by a native Android build.

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
the JWT's `app_metadata` (`src/api/supabase/claims.ts`) — never from a form, and
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

**One write is deliberately outside this**, and it is the endpoint's fault rather
than the screen's: the production counter sale
(`POST /api/orders/production-sale`, `ProductionSalesScreen`) carries **no
`idempotent()` middleware and no `businessDate` field**. Queueing it would mean a
retry that rings up a second sale, and a date Zod strips so the handler stamps
the day the row *drained* — the two failures the queue exists to prevent. So it
posts live, and the screen says so before a cart exists: the FAB is disabled with
no connection and `MBHeader`'s `offlineNote` replaces the offline strip's default
sentence, which promises the transaction is kept on the device. Re-queueing it is
a server change first; `docs/offline-sync.md` has the full account. The
production returns *review* is unqueued too, for the different reason that it is
a decision about a record other people are acting on.

There are **three** outcomes to report, not two (`api/sync/writeOutcome.ts`):
saved, queued ("Saved offline"), and **refused** — a write the server rejected with a
409, which is parked in `sync_conflicts` and will never sync on its own. The rule runs
both directions: never report a queued transaction as saved (that is how the same
expense gets entered twice), and never report a refused one as queued (that is how a
sale nobody looks at goes missing until the till is reconciled). Read the outcome by
`client_operation_id`, never off the `DrainResult` tally — `{synced: 3, conflicts: 1}`
says nothing about which one was *this* write, and on a busy queue that is the normal
case rather than the edge.

`src/api/sync/syncManager.ts` drains the queue. Its failure classification is the
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
`api/sync/conflicts.ts` is that gate, and every conflict type declares it
alongside the resolutions it permits. Getting it backwards is how a stock return that
already moved half its products moves them again. `keep_server` closes the local row as
`superseded` rather than deleting it — it is still the only record of what the operator
actually entered.

### Reads fall back to the mirror — but only on a transport failure

The read half lives in `api/readThrough.ts` over
`common/database/repositories/referenceRepository.ts`: fetch, mirror what came back, and on
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

`state/mirrorStore.ts` publishes which resources are currently mirror-served and how
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
`api/sync/endpoints.ts`); sending the wrong key is silently ignored, which is
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
its tabs, its More list and its account footer, all three inventoried in one file so
they can be compared. `roleNavigation.ts` keeps only the role *predicates*
(`isBranchRole`, `isFinanceRole`, `roleGroupFor`), which are domain rules used well
outside navigation.

**The centre action button is gone as of v5, and this note is here so it is not
reinvented.** v4 carried one create action in the middle of the navigation bar —
an ember circle notched into the pill, New Order for the branch group. The bar is
now five equal cells with nothing rising out of them, and a create action lives
where its resource does: branch reaches New Order from the Orders list, from the
dashboard quick actions, and from the drawer. Removed with it: `CENTRE_ACTIONS`,
`centreActionFor()`, `MBTabBar`'s notch arithmetic and the `navFabRing` layout
token — deleted rather than left dormant, because a config naming a control the
app does not draw is how the next person spends an afternoon looking for the bug.
`roleConfig.ts` carries the full account at the point the const used to be.

What went with it is the rule that **nothing else may offer the same action**.
That rule existed only because the centre button claimed the action globally, so
the corner FAB on the demands list and the `newOrder` quick action are both
*back* — `QUICK_ACTIONS.branch` lists `newSale` and `newOrder`, each naming the
create modal (`NewSale`, `CreateOrder`) rather than the list it opens over.
`MBTabBar`'s `MAX_TABS` is the runtime tripwire for a sixth tab, and
`navigationSurface.test.ts` asserts the tab sets — neither asserts a centre
action, and no test should be written that does.

`resolveTabScreen(role, route)` in `navigation/screenRegistry.tsx` maps (role, tab
name) → component, because **the same tab name means different screens for different
roles**: "Sales" at the production counter allows a `staff` payment method a branch
sale must never offer, and "Home" is four different dashboards. Sales is in fact
three screens behind one word and only one of them is a tab — the branch's day
**register**, which is a list of the day's sales with the till (`NewSaleScreen`)
as a `NewSale` modal inside its own stack, the same shape `CreateOrder` has on
`OrdersStack`. The production counter's till and the admin's cross-branch money
view are both More rows, split by `resolveMoreScreen`, and
`navigation/__tests__/screenRegistry.test.tsx` is what holds all three apart:
`navigationSurface.test.ts` sees only the config, where each is listed exactly
once, so it cannot catch a resolver handing one role another's screen. An unbuilt tab renders
a placeholder naming the phase it lands in, so an unbuilt screen is never mistaken for
an empty one.

**The drawer is a navigation surface again as of v5, and the old "no destination on
two surfaces" rule is gone with it.** That rule was never about duplication being
wrong — it was about three hand-maintained menus drifting apart. So the drawer is
**derived**: `drawerSectionsFor(profile)` reads `tabsFor` and `moreSectionsFor` and
groups them, and there is no third list to drift.
`navigation/__tests__/navigationSurface.test.ts` now asserts, for all eight roles,
coverage (every tab and every More row appears in the drawer), no duplicates within
it, and that every row names a tab the role actually has. A destination is still
declared in exactly one place, however many places can reach it.

What did **not** relax: `ACCOUNT_PANEL` — identity, branch, connection, appearance,
sign-out — is what the drawer carries *outside its rows*, and none of it may be a
tab, a More row or a drawer row. A row goes somewhere; a button does something, and
a sign-out that scrolls with a growing menu is one somebody hits by accident.

**v6 splits the panel across both ends of the drawer** and the rule is unchanged by
it: screen 04 heads the drawer with a plum profile block — logo, role, branch,
presence — and pins only Logout below the scroller, where v5 kept all five in one
footer. The panel still holds no destinations and sign-out still cannot scroll.
Presence on that block needs `onSecondarySuccess` / `onSecondaryOffline` rather than
`success` / `offline`: the latter two are tuned to read as *text on their own light
tint* and land near 1.5:1 against the plum. The drawer's own rows take v6's
hairlines but keep their section headings, because `drawerSectionsFor` is derived
from a grouped More index and v6's flat list is one role's eleven destinations
rather than the admin's twenty. A selected row is the same three signals the tab bar
uses — the ember as a 3dp edge, `accent` for glyph and label, a `primarySoft` tint —
and the edge is *reserved* on every row so selecting one does not shift its label.
`docs/navigation.md` is the full account, including why New Order is a modal on
`OrdersStack` rather than a tab.

`branch_user` is a **shift account carrying its manager's `branchId`**, not a branch of
its own — branch-scoped code must treat it and `branch_manager` identically
(`isBranchRole`) or the shift user sees an empty shop.

**Two gates sit above every navigator, outside `NavigationContainer`**, and
neither is a route: the first-run panels (`features/onboarding`) and the forced
change-password screen, in that order. Both apply before any navigator mounts
and neither can be navigated to or away from — the only way out of each is the
thing it collects, which changes state that re-renders `RootNavigator`.

The onboarding gate is v6's screen 01, and it is **not** the splash. That screen
draws a START button and a row of dots, which describes a sequence the user
drives; `SplashScreen` is `BootGate`'s loading state and unmounts the instant
`runBootSequence` resolves, so a fast boot would blink a START button out from
under the thumb reaching for it. Its own file records why it holds nothing for a
fixed beat. So the panels are a separate screen after boot and before sign-in,
and `shouldShowOnboarding()` carries the one condition that is not about
onboarding: **signed out as well as unseen**. The stored flag reads absent on
every phone that installed the app before it existed, so the flag alone would
hand a tour of the app to the whole shop mid-shift; `RootNavigator` writes it the
first time it sees a live session, or the panels would appear at the next
sign-out — the same evening, on a shift account. `PANELS` is the single source
the dots are counted from, so three dots over four panels is not expressible.

### Local database

`op-sqlite` over JSI, WAL, opened in `common/database/localDb.ts`. Migrations
(`common/database/migrations/index.ts`) are versioned with `PRAGMA user_version` and are
**append-only, forward-only and never destructive**: an app update must not drop a
table holding unsynced work, and editing a shipped migration silently diverges the
schema on devices that already ran it. Domain row and queue row are written in one
`transaction()` — either alone is a lost or a phantom transaction.

The database is **not** encrypted; it holds business records only. Session and tokens
live in MMKV encrypted with a Keychain-held key (`common/storage/secureStorage.ts`).

### API client conventions

`api/client.ts`. There is **no `{success, data}` envelope** — bodies are
resource-keyed (`{user}`, `{orders, total}`), so each caller unwraps its own shape and
the client unwraps nothing. Errors are `{error, details?}`. A 401 triggers exactly one
refresh-and-replay. The token is attached by an interceptor at **send** time, never
frozen onto a queued row — an overnight retry with a captured token would 401.

`api/errors.ts` turns everything into an `ApiError` with a `kind`, and that
`kind` is what the sync queue branches on. Changing the mapping changes retry
behaviour for real money.

### Startup is a declared sequence

Seven steps, in `common/boot/bootSequence.ts` — not `App.tsx`, which now only
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
`api/catalogQueries.ts` — the same module `api/hooks/useCatalogApi.ts` builds
its queries from. That sharing is not tidiness: a prefetch that rebuilt a key by
hand fills a *second* cache entry, the screen then fetches into its own empty one,
and the warm costs a round of requests while looking like it worked.
`__tests__/warmCaches.test.ts` asserts the keys against `qk`.

`sync` fires the first drain of a launch. `useSyncEngine` still drains on mount,
and that is not a duplicate — mount is the sign-in event for a session established
*after* boot. When boot did start one, `syncStore.sync()` has already flipped
`phase` to `syncing` synchronously, so the mount call returns at the guard.

A bootstrap failure shows a retry, never an endless splash, and the whole sequence
is raced against one budget (`common/utils/bootTimeout.ts`) rather than per step — four
slow steps would otherwise add up to a wait none of them individually exceeded.
The failing step is reported through `onStep`, because "startup failed" alone does
not distinguish a locked database from an unreachable API.

### Theme

Light and dark are two token sets behind one interface (`common/theme/`). Do not write
`isDark ? a : b` in a component; add or use a token.

**The palette is a wave, a fill and a mark, and none of the three is
interchangeable with another.** v6 replaced v4/v5's warm system outright — the
cream field and the brown masthead are gone. What it draws instead:

- **the wave** — two plums, `#7A3EA1` in front and `#4A1D70` behind, as the
  masthead on *every* screen, plus `#4A1D70` again as the hero block a KPI sits
  on (`secondaryWave` / `secondary`);
- **the fill** — ember orange for every action: a button, the corner FAB, the
  active chip, a meter, a chart line (`primary`);
- **the mark** — the deep plum for type, icons and links (`accent`).

Reaching for `primary` as a text colour is still the mistake to watch for, and
`contrast.test.ts` still asserts `accent` is at least as readable as `primary`.
What changed is that **the mark finally has a colour of its own**: in v4 `accent`
had to *be* the ink, because the ember cannot carry type and v4 carried
link-ness with weight instead of hue, so the token looked redundant. v6's plum is
a real brand colour that is also readable (12.35:1 on a card), so the mark and
the body text are different colours in both schemes for the first time.

The page is the lilac wash `#F6EFFA` and cards are pure white floating over it,
which inverts v4's relationship (a white card on a cream field). Cards keep the
soft lift (`e1`, 7%) *plus* the hairline; `e2` is the floating nav bar and `e3`
the corner FAB, and nothing else. Shadows are tinted `palette.shadow` `#3A145A`
and deliberately **not** the ink — at 7% opacity the ink's browner cast reads as
a grey smudge on lilac rather than as depth.

**Three of v6's own hexes are corrected, each for the reason v4's were.** The
design file's authority is the `moods` map at the end of it, which defaults to
`Purple wave`; the inline `var(--x, #hex)` fallbacks are stale leftovers from the
v5 pass and disagree with it on most screens. Read the map, not the fallbacks.

- The **ember as a graphic** is `#FB6D34` walked down 9% to `#E4632F`. v6's own
  orange is 2.54:1 on the lilac wash, under the 3:1 WCAG 1.4.11 asks of a
  graphical object carrying information — and the same value paints the stock
  meter and the trend line, both pure graphics with no label to fall back on.
  Note the wash is a *harder* surface than v4's cream: the old `#EC6631`, tuned
  to clear 3:1 on the cream, is only 2.86:1 here.
- The **muted text level** `#7B6C88` is 4.29:1 on the wash, walked to `#776984`.
- A **control's edge** `#E7DCEF` is 1.32:1 — the identical figure v4's `#EADFCD`
  scored, arrived at independently in a different hue — walked to `#8F8894`.

v6's faintest text tier `#A79BB2` is 2.34:1 and is not carried as text at all,
exactly as v4's `#A99884` was not; it folds into `textMuted`.

**The masthead is `MBWave`, and it is two shapes rather than a fill.** v6 draws
two overlapping layers whose elliptical corners are *mirrored* — the back is deep
on the right, the front deep on the left — and it is that crossing, not the
colour, that reads as a wave. React Native's `borderRadius` cannot express an
ellipse, so this is `react-native-svg` with a `0 0 100 h` viewBox and
`preserveAspectRatio="none"`, which makes x units percentages of the width while
y stays real pixels — precisely CSS's `<percentage> / <length>` semantics, so
v6's radii are transcribed with no conversion. Collapsing it to one rounded rect
is the obvious simplification and it loses the design.

`MBHeader`'s `tone` therefore **defaults to `brand`**, which v5's did not. v6
draws 21 screens and every one wears the wave — 21 front layers and 21 back
layers, counted in the file, with no exception for lists, forms or the two auth
screens. `field` no longer means "an ordinary screen"; it means one deliberately
held off the masthead, and nothing uses it today.

**The brand fill is a preference; the wave and the mark are not.**
`common/theme/accents.ts` carries five selectable accents and each replaces
exactly three tokens — `primary`, `primaryPressed`, `onPrimary`. That the wave is
out of reach is v6's own arrangement rather than a restriction invented here: the
design file exposes `accent` and `mood` as two independent controls, and picking
a new swatch there leaves the purple header where it was. Choosing Ember returns
the base maps **by identity**, so the default is not merely equivalent to the
pre-accent app but literally it.

v4's **Ink** swatch is now **Plum**, and that is a correction rather than a
rename. With the neutral axis gone purple a brown button is off-palette, and the
swatch must move to `#4A1D70`, *the mark*, not to `#2E1440`, the ink. v4's ink
and mark were the same hex, so choosing Ink made the fill *be* the mark and the
two coincided — which is the whole reason the accent-vs-mark ordering is asserted
as `>=` rather than `>`. In v6 they are different colours, so a fill set to the
ink would be **more readable than the mark** and break the ordering outright.

`onPrimary` is carried per accent, and that is the interesting part. v6 states
one contrast rule — text on `#FB6D34` is the ink — and then offers four more
swatches the rule is simply false of. Ember keeps ink at 4.75:1; Plum, Pine and
Indigo take white in light. Each value is corrected per scheme rather than
shared: `#4A1D70` is 12.35:1 on a white card and **1.72:1** on the near-black
one, so its dark variant is lifted well toward lilac and lands somewhere that is
no longer the mark — the honest cost of offering the mark as a *fill*.

A press moves **away** from its label — darker where the label is white, lighter
where it is ink. Always-darken is the habit and it drops an ink label to 2.8:1
for the length of the press. `contrast.test.ts` holds all five to the same two
bars in both schemes: fill >=3:1 on the card and the field, label >=4.5:1 on the
fill.

Those two bars name **the card and the field**, and that is the whole list. An
accent fill may not be drawn on the `secondary` block: `contrast.test.ts` never
asserted it there, and one of the five swatches — Plum — *is* `#4A1D70`, which is
`secondary` exactly, so a `primary` button on the plum is 1:1 for anyone who
picked it. Pine is 2.31:1 and Indigo 2.5:1, both under the 3:1 WCAG 1.4.11 asks
of a control's own fill. So a screen that wears the wave puts its action on the
field **below** the wave, where the ember is already held to the bar — which is
what `FirstRunScreen` does, and why v6's white pill on the purple is not
transcribed literally. The rule generalises: `onSecondary`-family tokens are the
only fills that hold on the block, because they are the only ones that are not a
preference.

`MBAccentPicker` is the only place allowed to reach for an accent's `swatch`,
which is v6's own hex rather than the corrected fill: a 32px disc with nothing
set on it, where showing a value 9% off the one being offered would make the row
disagree with itself.

Which scheme is live comes from the app's **stored** mode, not the OS — the OS is
consulted only when that mode is `system`. The native side has to agree, because
Android resolves `values-night/` from its own night setting and would otherwise
splash in a scheme the user did not pick: `settingsStore` mirrors the mode into
`SharedPreferences` through `specs/NativeAppTheme.ts`, and `MainActivity` turns it
into an `AppCompatDelegate` night mode **before** `RNBootSplash.init`. The mirror
lands on the next cold start, never mid-session — applying it live recreates the
activity and remounts the React tree.

**The splash inverted in v6 and two things follow from it.** v4 splashed on a
cream a shade off its field; v6 splashes on the *brand* — the wave at full
height, so `splashTop`/`splashBottom` are `plum500` and `plum700`, **the same
two plums in both schemes**. Dark does not step them down, and `colors.ts`
carries the reason at length: a muted-grey masthead in night mode stopped
carrying the brand at all, and it also means the boot splash is one colour on
every device regardless of the night setting, which removes a whole class of
hand-off flash. First, its type is `onSecondary`/`onSecondaryMuted` rather than
`accent`/`textMuted`: an `accent` wordmark on the new `splashBottom` is 1.00:1,
the same colour on the same colour. Second, the background is dark in **both**
schemes, so the mark is chosen with `logoOn('dark')` and not `logoFor(scheme)` —
`-light`/`-dark` name the background, and a mark picked by scheme comes out
inverted on the light splash.

The splash background is a gradient in `SplashScreen.tsx` and a flat colour
natively, because `windowSplashScreenBackground` takes a colour and not a
drawable. `splashTop` must therefore equal `bootsplash_background` in
`res/values{,-night}/colors.xml` or the hand-off steps rather than fades;
`npm run splash:check` is the only thing enforcing it, and the step it now
guards is a full purple-to-lilac jump rather than v4's barely-visible cream one.
That hand-off happens when `SplashScreen` **mounts** — it calls
`RNBootSplash.hide()` itself, so the JS splash carries the rest of boot. Hiding
at the end of bootstrap, as `App.tsx` used to, meant the fade revealed the
dashboard and the splash was never seen.

### Motion

Motion is **feedback, never decoration** — every duration and curve comes from
`common/theme/motion.ts`, and nothing animates that is not reporting a state change. No
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

`src/common/test-utils/sqliteTestDb.ts` runs migrations and repository SQL against a **real**
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
the drawer, header chrome, badges, deep links, icons), `docs/screen-patterns.md`
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
