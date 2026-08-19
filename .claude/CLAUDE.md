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
npm run verify           # typecheck + shared:check + theme:check + test — run this before calling anything done
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

A Gradle build prints ~65 deprecation warnings. They come from sixteen third-party
native modules' own `build.gradle` files (skia, screens, nitro-modules, op-sqlite,
…) plus AGP's internal dependency declarations — **none from this tree**, which was
cleaned up. They become errors only in Gradle 10; the libraries will have moved by
then. Do not go patching `node_modules` over them.

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

### Startup order is deliberate

`config → encrypted storage → settings → SQLite migrations → session → network`
(`App.tsx`). Storage precedes session restore because the session lives in it; the
database precedes the session because signing in can trigger a drain immediately. A
bootstrap failure shows a retry, never an endless splash.

### Theme

Light and dark are two token sets behind one interface (`theme/`). Do not write
`isDark ? a : b` in a component; add or use a token.

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
