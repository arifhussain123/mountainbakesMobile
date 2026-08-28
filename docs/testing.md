# Testing

722 tests, 63 suites. `npm run verify` runs typecheck + shared-mirror check + tests.

## What is covered

| Area | Suite | The rule being protected |
|---|---|---|
| Money formatting | `utils/money` | Output matches `en-PK` ICU exactly (verified against 4,034 values) — Hermes' incomplete `Intl` must not make a phone disagree with the browser. |
| Business date | `utils/businessDate` | The 2 AM rollover. A 01:30 sale belongs to the previous business date. |
| Sale arithmetic | `utils/saleTotals` | Tax applies to the NET subtotal after discount; discounts clamp to the line gross. |
| Operation ids | `utils/operationId` | UUIDv7, time-ordered, never colliding. |
| Migrations | `common/database/migrations` | No destructive statement; gapless versions; idempotent DDL. |
| Migration runner | `common/database/runMigrations` | Atomic per step, clean retry, downgrade safety. |
| Offline writes | `common/database/offlineWrite` | Domain row + queue row in ONE transaction; business date stamped on device. |
| Sync engine | `api/sync/syncManager` | Failure classification; 401 pauses without burning retries; no double-drain. |
| Claims | `api/supabase/claims` | Fail-closed on an unrecognised role. |
| Auth store | `state/authStore` | Finance role gate, MFA hand-off, refresh-after-password-change. |
| Sign-out | `hooks/useSignOut` | Warns on unsynced work; never traps the user. |
| API contracts | `api/catalogApi` | Exact query-param names and resource-keyed unwrapping. |
| Screens | `features/**` | Six states; queued work never reported as saved; role-correct payment methods. |
| Offline write copy | `common/ui/feedback/MBWriteOutcome` | A queued write is never called saved and a refused one is never called queued — the same defect in both directions. Asserted on the pure copy function, not through a screen. |
| Money on the wire | `features/catalog/PriceHistoryScreen` | `numeric(14,2)` arrives as a JSON **string** though the field is typed `number`, so `newPrice > oldPrice` compares lexicographically and reads a cut as a rise. Both amounts in a row format through the same helper. |
| Navigation | `navigation/**` | Every role has tabs; built screens map to real tabs; unbuilt gaps are explicit. |

## Conventions

**`@testing-library/react-native` v14 made `render`, `renderHook` and `fireEvent`
async.** All must be awaited. A missing `await` does not fail loudly — queries
return nothing and `result.current` is undefined.

**Jest hoists `jest.mock()` above every `const`.** A factory closing over an
outer variable captures it while still undefined. Build the mock *inside* the
factory and read it back through the import (`state/__tests__/authStore.test.ts`).

**Use `renderScreen` from `src/common/test-utils/render.tsx`** for anything rendering a
screen. It supplies safe-area metrics (required — `useSafeAreaInsets` throws
without them under Jest), a per-test query client, navigation, and the theme. It
also returns that client as `queryClient`, for the rare test that needs to assert
on the cache itself.

**The per-test client sets `gcTime: 0` on mutations as well as queries**, and
both halves are load-bearing. A settled mutation calls query-core's
`scheduleGc()` — literally `setTimeout(remove, gcTime)` — and an unset mutation
`gcTime` defaults to **five minutes**. With only the query half set, every screen
test that ran a mutation to completion left a five-minute timer alive in the Jest
worker, and a fully green run ended with "A worker process has failed to exit
gracefully". `test-utils/__tests__/render.test.tsx` pins it by asserting the
mutation cache empties, not by asserting the option is present — so it also fails
if a future version changes what `gcTime: 0` means.

**Mock the drain, not the store.** Screen tests mock `syncManager.drainQueue` and
let the real zustand store run, so the store's own wiring is exercised rather
than replaced by a stub.

**Mock every query the screen mounts, not just the one under test.** A screen
usually fetches more than the thing being asserted: `StockScreen` also loads
products, categories and branches for its filter chrome, and the print slip
reads the currency symbol through `useCatalogSettings`. A bare `jest.fn()`
resolves to `undefined`, which React Query rejects outright ("Query data cannot
be undefined"), and anything left unmocked calls the real API layer. Either way
the query settles after the test that triggered it has finished — which is where
most "an update was not wrapped in act(...)" reports actually come from.

**Wrap anything that moves a store while mounted in `act`.** A zustand write, or
an OS event fired at a hook, is a real state transition and re-renders the tree.
Called bare it belongs to no act scope, and React reports it against whichever
test happens to be running when it lands, never the one that caused it — which
is why these are near-impossible to place by reading a single failure.
`hooks/__tests__/useSyncEngine.test.tsx` keeps both moves behind helpers
(`appStateChangesTo`, `connectionChangesTo`) so no test can forget.

**One mounted tree per test.** Mounting, unmounting and remounting inside a
single test interleaves act scopes and React reports "overlapping act() calls";
auto-cleanup gives each case its own mount for free.

**`jest.after-env.js` runs React Query's notifications on a microtask.** The
library defers every store notification through `setTimeout(…, 0)`, which lands
outside the test's act scope and leaves a timer behind at teardown. A microtask
hop keeps the deferral React Query needs to coalesce renders while flushing
inside the awaited scope. Running the callback inline instead (`cb => cb()`)
silences the same warnings but drops that coalescing — it cost roughly 10x in
wall-clock on the screen suites and pushed one case past its 5s budget.

**One warning survives deliberately.** A full run still prints "A worker process
has failed to exit gracefully". It traces to
`features/production/__tests__/ProductionOrdersScreen.test.tsx`, and only appears
when that file shares a run with another — Jest runs a lone file in-band, where
it is silent. `--detectOpenHandles` reports nothing to close, so it is a
worker-pool artifact rather than a leaked timer in this tree. Nothing fails
because of it; it predates the Phase 10 cleanup and is left alone rather than
papered over with `--forceExit`, which would hide a real leak later.

**Pin the clock in any test whose subject is gated on time.** `NewOrderScreen`
refuses to queue a demand outside the 08:00 → 02:00 order window, judged against
the real clock — so its submit tests passed for eighteen hours a day and failed
between 02:01 and 07:59 Karachi, green in the afternoon and red overnight for a
reason unrelated to the code under test. They now run at a pinned 10:00 Karachi
via `jest.useFakeTimers({ now })`, with `doNotFake: ['queueMicrotask']` so React
Query's scheduler still drains. A suite that depends on when it is run is not a
suite. The window gate itself is asserted separately by moving the pinned clock
to 03:00, rather than being left as an ambient condition of the other tests.

**Under heavy CPU load the suite can emit a few `act(...)` warnings naming
`ForwardRef(FlashList)` and `ViewHolderCollection`.** Those come from FlashList's
own layout measurement, which settles on its own schedule rather than the test's;
they appear when something else is saturating the machine (a Gradle build in
another terminal) and not on an idle run. Nothing in this tree triggers them and
no test fails — do not go looking for the screen that caused it.

Reanimated 4 needs `resolver: 'react-native-worklets/jest/resolver.js'` (already
set in `jest.config.js`).

## Not covered

- **No live API calls.** Every contract is read from the server source and
  asserted against a mock. Nothing has been exercised against a running backend.
- **No device or emulator run.** The six offline scenarios in `offline-sync.md`
  are asserted against a faked database, not by killing an app mid-transaction.
- **No iOS.** Developed on Linux; CocoaPods has never run.
- **No multi-branch concurrency test.** Requires a live server and several
  sessions.
- **No E2E.** Maestro is specified in `stack.md` but not set up.
