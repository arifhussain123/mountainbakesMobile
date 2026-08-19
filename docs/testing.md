# Testing

231 tests, 22 suites. `npm run verify` runs typecheck + shared-mirror check + tests.

## What is covered

| Area | Suite | The rule being protected |
|---|---|---|
| Money formatting | `utils/money` | Output matches `en-PK` ICU exactly (verified against 4,034 values) — Hermes' incomplete `Intl` must not make a phone disagree with the browser. |
| Business date | `utils/businessDate` | The 2 AM rollover. A 01:30 sale belongs to the previous business date. |
| Sale arithmetic | `utils/saleTotals` | Tax applies to the NET subtotal after discount; discounts clamp to the line gross. |
| Operation ids | `utils/operationId` | UUIDv7, time-ordered, never colliding. |
| Migrations | `database/migrations` | No destructive statement; gapless versions; idempotent DDL. |
| Migration runner | `database/runMigrations` | Atomic per step, clean retry, downgrade safety. |
| Offline writes | `database/offlineWrite` | Domain row + queue row in ONE transaction; business date stamped on device. |
| Sync engine | `services/sync/syncManager` | Failure classification; 401 pauses without burning retries; no double-drain. |
| Claims | `services/supabase/claims` | Fail-closed on an unrecognised role. |
| Auth store | `store/authStore` | Finance role gate, MFA hand-off, refresh-after-password-change. |
| Sign-out | `hooks/useSignOut` | Warns on unsynced work; never traps the user. |
| API contracts | `services/api/catalogApi` | Exact query-param names and resource-keyed unwrapping. |
| Screens | `screens/**` | Six states; queued work never reported as saved; role-correct payment methods. |
| Navigation | `navigation/**` | Every role has tabs; built screens map to real tabs; unbuilt gaps are explicit. |

## Conventions

**`@testing-library/react-native` v14 made `render`, `renderHook` and `fireEvent`
async.** All must be awaited. A missing `await` does not fail loudly — queries
return nothing and `result.current` is undefined.

**Jest hoists `jest.mock()` above every `const`.** A factory closing over an
outer variable captures it while still undefined. Build the mock *inside* the
factory and read it back through the import (`store/__tests__/authStore.test.ts`).

**Use `renderScreen` from `src/test-utils/render`** for anything rendering a
screen. It supplies safe-area metrics (required — `useSafeAreaInsets` throws
without them under Jest), a per-test query client, navigation, and the theme.

**Mock the drain, not the store.** Screen tests mock `syncManager.drainQueue` and
let the real zustand store run, so the store's own wiring is exercised rather
than replaced by a stub.

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
