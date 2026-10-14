# Mobile Production app rebuild — "productionApp.md" 20-step plan

This is a **separate, newer plan from `mobile-production-plan.md`** — read that one
first for context. `mobile-production-plan.md` tracks the Production role's existing
build (P1–P10 slices, 10/16 screens done against `shared/ui`/`shared/theme`, reusing the
same design system as Branch). This doc tracks a deliberate **rebuild** of the Production
role's UI against a newer, more detailed design spec ("productionApp.md", pasted in full
by the user), screen-numbered 01–16 against `design UIandUX/mountainbakesProduction.html`.

Three explicit architecture decisions were confirmed with the user before any code was
written (the spec's own Step 1/Step 4 conflicted with what already exists — see
`mobile-implementation-plan.md` Slice 13's own note that Branch and Production share one
theme today):

1. **New parallel `src/theme/`, not an extension of `src/shared/theme/`.** Production's
   rebuilt screens will read `useProductionTheme()` (this new module); Branch and any
   not-yet-rebuilt Production screen keep reading `useAppTheme()` from
   `src/shared/theme/`. The app now has two design-token systems side by side — a known,
   deliberate tradeoff, not an oversight.
2. **Build the full SQLite offline write queue (spec Step 4), including retrofitting
   Branch's existing mutations.** Not started yet — Step 4 is still several steps away in
   the spec's own order and this doc follows that order strictly (finish one step, report,
   stop).
3. **Keep the existing hand-rolled `useXForm` hook pattern** (no React Hook Form + Zod
   migration) — consistency with every Branch form already built this way.

The spec's own rule governs how this doc gets used: finish one step completely, run
`tsc`/`eslint`/`jest`, then stop and report before starting the next one. Do not batch
steps.

## Status

| Step | Scope | Status |
|---|---|---|
| 1 | Design tokens and theme (`src/theme/`) | **Done** |
| 2 | Shared components (`src/components/`) | Not started |
| 3 | Navigation shell and auth gate | Not started |
| 4 | Data layer: typed API client, SQLite cache + write queue | **Done — infra only, not yet retrofitted into Branch's existing mutations (see note)** |
| 5–19 | Screens 01–16 | Not started |
| 20 | Final QA pass | Not started |

**Note on Step 4's scope, jumped ahead of Step 2/3 by request:** the Finance module
("financeApp.md", a separate initiative — see `docs/mobile-finance-rebuild-plan.md`) needs
the same offline write-queue infrastructure, so it was built once, here, as shared
app-level infra rather than per-module. What's done is the queue+cache engine itself and
its wiring into the real API client; retrofitting it into Branch's existing mutation hooks
(Orders/Sales/Stock/Expenses/etc.) is still open — that's a per-hook change across ~15
mutation hooks, each needing a decision on what "offline" means for that specific
financial/stock write, and is scoped as its own follow-up pass rather than folded silently
into this one.

## Step 1 detail (done) — design tokens and theme

New `src/theme/` (separate from `src/shared/theme/`):

- `colors.ts` — every token from the spec's table as a literal (`bg`, `bgGlowViolet`,
  `bgGlowTeal`, `surface`, `surfaceStrong`, `border`, `divider`, `text`, `textSoft`,
  `textMuted`, `textDim`, `onAccent`, `ink`, `success`, `warning`, `danger`, `dangerSoft`,
  `info`, `violet`), plus `ACCENT_OPTIONS`/`DEFAULT_ACCENT` and a `tint(hex, alpha)` helper
  (hex → `rgba(...)` at the given alpha — used for status-pill backgrounds at 14–16%,
  exercised at 15% in the showcase).
- `typography.ts` — `display`/`sheetTitle`/`heroNumber`/`heroNumberCompact`/`title`/
  `body`/`label`/`overline`, sized/weighted/letter-spaced per the spec. Three of the
  spec's token sizes are given as a range rather than one value
  (`title` 14–16, `body` 12–13, `overline` 9–10/letterSpacing 1–1.2) — one value picked
  from each range, documented inline in the file rather than silently chosen.
  **Space Grotesk font files do not exist anywhere in this repo and this agent has no way
  to source/license font binaries on its own** — every style renders in the OS system font
  until real `.ttf` files are added under `assets/fonts/` and linked; swapping the family
  in at that point touches only `typography.ts`. Flagging rather than silently
  approximating with a different bundled font.
- `radii.ts`, `spacing.ts` — literal per the spec's table (`cardPadding`/`pillBadge` kept
  as the spec's own range where it gave one, rather than collapsing to a guessed single
  number).
- `useAccentStore.ts` — Zustand store (`persist` + `AsyncStorage`, same storage mechanism
  `authStore.ts` already uses elsewhere in the app) holding the selected accent from
  `ACCENT_OPTIONS`; nothing reads `DEFAULT_ACCENT` directly outside this store's own
  initializer.
- `index.ts` — `useProductionTheme()`, the one accessor every Production-rebuild screen
  reads from (mirrors `useAppTheme()`'s own role in `shared/theme`).
- `ThemeShowcase.tsx` — a dev-only component rendering every token, every typography
  style, and a status-pill sample per status color at 15% tint, plus a row of accent
  swatches that call `setAccent` on press. **Not wired into any navigator** — that's Step
  3's job. Needs a live device to actually view; none is available in this environment,
  same gap as every UI change in this build.

Verified: `npx tsc --noEmit` (clean), `npx eslint src App.tsx` (0 errors, 556 warnings —
up from 542, same pre-existing categories: `react-native/no-inline-styles`, `no-void`;
`ThemeShowcase.tsx` itself carries most of the new ones, being a dev-only grid of inline
swatches), `npx jest` (4/4 passed).

Not run: visually confirming the palette/type styles on a device — no device/emulator in
this environment. Flagging per the spec's own "Done when" criterion (visual confirmation
at random accent picks), which this pass could not satisfy.

## Step 4 detail (infra done) — SQLite offline cache + write queue

Built as **shared, app-wide infrastructure** (`src/shared/offline/`), not under
`src/theme`/a Production-only folder — Finance's own spec needs the identical queue and
explicitly says to reuse the repo's existing choice rather than fork it per module.

- **Library chosen: `@op-engineering/op-sqlite@18.2.5`** (added to `package.json`), over
  `react-native-quick-sqlite` — op-sqlite is the actively maintained one of the two, built
  for the New Architecture this repo's RN/Reanimated/Worklets versions require, with sync
  and async execute APIs. Native pod/gradle linking not run — no device/emulator in this
  environment, same gap as every native dependency added in this build.
- `src/shared/offline/types.ts` — `QueuedWrite`, `QueueStorage` (the storage port),
  `EnqueueWriteInput`. `shared/offline` never imports `@/api` (architecture skill's import
  direction — lower layers don't depend on higher ones); a `MinimalApiError` shape is
  duplicated locally in `writeQueue.ts` instead of importing `@/api`'s real `ApiError`.
- `src/shared/offline/db.ts` — one lazily-opened SQLite database
  (`mountainbakes-offline.sqlite`) with two tables: `write_queue` and `response_cache`.
- `src/shared/offline/sqliteQueueStorage.ts` — the real `QueueStorage` implementation
  against that database.
- `src/shared/offline/writeQueue.ts` — `createWriteQueue({storage, executor, invalidate,
  onQueueChanged, now})`: storage- and executor-agnostic by construction, so the retry/
  backoff/idempotency logic is unit-tested (`__tests__/writeQueue.test.ts`, 6 tests) with
  an in-memory `QueueStorage` fake and a mock executor — no native SQLite touched by the
  test. Rules implemented: the queued row's id IS its idempotency key (minted once by the
  caller, never regenerated — `generateIdempotencyKey()` already existed app-wide in
  `api/client.ts`); a `status: null` (no internet) or `429`/`5xx` failure reschedules the
  SAME row with exponential backoff (2s base, doubling, capped at 5 minutes) up to 5
  attempts before giving up (`status: 'failed'`); any other 4xx is marked `failed`
  immediately, never retried (a human needs to look at a rejected write, not hammer the
  server with it).
- `src/shared/offline/responseCache.ts` — `getCachedResponse`/`setCachedResponse` against
  the `response_cache` table, keyed by an arbitrary cache-key string (intended: a
  serialized TanStack Query key) — the "Showing saved data from HH:MM" read path neither
  module has wired up a screen to yet.
- `src/api/offlineQueue.ts` — the one place that wires the generic queue to the real app:
  executor calls the real `apiClient` (reusing its existing `idempotencyKey` option),
  `invalidate` calls `queryClient.invalidateQueries` per queued write's own
  `invalidateKeys`, and `onQueueChanged` mirrors into `state/offlineQueueStore.ts` (a new
  Zustand store, same shape/location as `authStore`). Exposes `enqueueOfflineWrite`,
  `flushOfflineQueue`, and `startOfflineQueueRetryWorker()` (flushes once immediately,
  then again on every `NetInfo` reconnect and every `AppState` → `active`) — wired into
  `App.tsx`'s existing bootstrap `useEffect`, idempotent against being called twice.
- `shared/ui/SyncBadge` (new) — a small pill, prop-driven (`pendingCount`/`failedCount`),
  same pattern as every other `shared/ui` component (none of them read a Zustand store
  directly) — a screen that wants it calls `useOfflineQueueStore()` itself and passes the
  counts in. Not yet placed on any screen's header — that's part of the retrofit, below.

**Deliberately NOT done in this pass** (flagged above in the status table, not silently
dropped): retrofitting Branch's ~15 existing mutation hooks (`useCreateProductionOrder`,
`useCreateBranchDiscount`, `useCreateCashTransfer`, `useCreateExpense`,
`useCreateBranchReturn`, the Sales/Stock-check mutations, etc.) to go through
`enqueueOfflineWrite` instead of calling `apiClient` directly. Each one needs its own
answer to "what does retrying this specific write offline actually mean" (e.g. a Sale
needs server-side stock re-validated at sync time, not just blindly replayed) — a
mechanical find-and-replace would be the wrong move for financial/stock mutations, so this
is scoped as its own reviewed pass per hook rather than one sweeping, unverified commit.

Verified: `npx tsc --noEmit` (clean), `npx eslint src App.tsx __tests__` (0 errors, 560
warnings — up from 556, same pre-existing categories), `npx jest` (10/10 passed, 6 of them
new: enqueue reuses the idempotency key as the row id, flush succeeds and invalidates,
retryable failure reschedules the same row without duplicating it, non-retryable 4xx fails
immediately, exhausting all attempts gives up, `onQueueChanged` fires on both paths).

Not run: anything against the real SQLite binary (open/execute/transaction) — no device/
emulator in this environment to link the native module on. The storage port
(`sqliteQueueStorage.ts`) is reviewed against op-sqlite's documented API but has never
executed a single real query.
