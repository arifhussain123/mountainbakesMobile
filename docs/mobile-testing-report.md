# Mobile testing report

## Branch app Slice 12 (Branch Closing, 20 — unblocked) — branchApp.md's 28-screen scope now fully addressed

See `mobile-implementation-plan.md`'s Slice 12 detail. Required a small, justified backend
addition (branchApp.md rule 10): `GET /api/branch-closing` (JSON), composing the exact same
`computeClosingTotals` function the existing `/export` route already used, plus two new
groupings (payment method, expense category) over data the route already fetched.

```
# backend/
npx tsc --noEmit        # clean, no output
```

Backend has no working lint config (`eslint@^9.17.0` in package.json, no
`eslint.config.js` present anywhere in the repo — confirmed pre-existing, not introduced
by this change) and no test suite at all (no `test` script, no `*.test.ts` files anywhere).
`tsc` is the only automated verification available for a backend change in this repo, and
it's clean.

```
# mobile/
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 536 warnings (up from 519 — same pre-existing
                         # categories: react-native/no-inline-styles, no-void)
npx jest                # 1 suite, 4 tests, all passed
```

Not run: the live `GET /branch-closing` read against a real branch session with real
order/expense/stock data for a given day — no device/emulator in this environment, and no
way to run the backend server itself here either (would need Supabase credentials).
The payment-method/expense-category grouping logic was reviewed carefully against the
real `Order`/`Expense` field names and the existing `/export` route's own equivalent
logic, but never exercised end-to-end.

## Production app Slice P7 (Discounts)

See `mobile-production-plan.md` for scope — Production's review board for a branch's
discount claim, reusing the Branch app's own `BranchDiscount` row type rather than
duplicating it (same table, same shape, only the URL differs).

```
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 520 warnings (up from 506 — same pre-existing
                         # categories: react-native/no-inline-styles, no-void)
npx jest                # 1 suite, 4 tests, all passed
```

Not run: anything on a real device (no emulator, same gap as every slice before this),
and the actual review flow against `/production-discounts`.

## Bug fix: "Your session has expired" shown on a plain failed login

**Reported**: logging in shows "Your session has expired. Please sign in again." instead
of a real login error — happens on first login attempt, no prior session existed.

**Root cause, two compounding bugs**:
1. `src/shared/helpers/errorMapper.ts` hard-coded every HTTP 401 to the session-expiry
   copy, discarding the backend's own message. A failed login's 401 carries `"Invalid
   email or password"` (`backend/src/services/auth/auth.service.ts`'s `invalidCredentials()`)
   — a message already written for an end user — but it was never shown.
2. `src/api/client.ts`'s response interceptor treats ANY 401 (including from `/auth/login`
   and `/auth/refresh` themselves) as "an authenticated session's token died mid-request":
   it attempts a silent token refresh and, failing that, calls `onSessionExpired()`
   (forces `signedOut` state, wipes the stored refresh token) — nonsensical for a login
   attempt where there was no session to expire in the first place.

**Fix**:
- `errorMapper.ts`: 401 now passes through `error.message` when the server sent one,
  falling back to the generic session-expiry copy only if it didn't.
- `client.ts`: the interceptor's refresh-and-expire path is skipped when the failing
  request's URL is `/auth/login` or `/auth/refresh` — a 401 there is a rejected request,
  not a dead session.

```
npx tsc --noEmit                                          # clean, no output
npx eslint src/api/client.ts src/shared/helpers/errorMapper.ts  # clean, no output
npx eslint src                                             # 0 errors, 506 warnings (unchanged)
npx jest                                                    # 1 suite, 4 tests, all passed
```

Not run: an actual failed-login attempt against the live backend on a device — no
device/emulator in this environment. The fix was verified by reading both code paths
and the backend's actual 401 response shape (`{ error: 'Invalid email or password' }`),
not by reproducing it end-to-end.

## Production app Slice P6 (Product Returns)

See `mobile-production-plan.md` for scope — two distinct return flows (branch-raised vs.
Production-recorded) sharing one review queue, plus a new branch picker (the first screen
in this app that needs to pick FROM a list of branches rather than being scoped to one).

```
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 506 warnings (up from 473 — same pre-existing
                         # categories: react-native/no-inline-styles, no-void)
npx jest                # 1 suite, 4 tests, all passed
```

Not run: anything on a real device (no emulator, same gap as every slice before this),
and the actual submit/review flow against `/production-returns`.

## Production app Slice P4 (Production Stock, Prepared Products, Adjustment)

See `mobile-production-plan.md` for scope.

```
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 473 warnings (up from 427 — same pre-existing
                         # categories: react-native/no-inline-styles, no-void)
npx jest                # 1 suite, 4 tests, all passed
```

Also fixed in this slice: the mobile `ProductionStockRow` type was missing
`returnTransferIn`/`returned`, two fields the backend's `ProductionStockFigures` always
returns — see the plan doc's Slice P4 detail.

One real error caught and fixed mid-slice: an unused `mapErrorToMessage` import in
`ProductionStockAdjustmentScreen` (the hook already handles the error message internally) —
`eslint` caught it as `@typescript-eslint/no-unused-vars`, fixed before re-running.

Not run: anything on a real device (no emulator, same gap as every slice before this),
and the actual submit flow against `/production-stock/prepare` and
`/production-stock/adjustment`.

## Production app Slice P3 (Sales, New Sale)

See `mobile-production-plan.md` for scope — Production's own counter sale against the
central pool, with the `'staff'` (no-charge) payment method.

```
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 427 warnings (up from 402 — same pre-existing
                         # categories: react-native/no-inline-styles, no-void)
npx jest                # 1 suite, 4 tests, all passed
```

Also fixed in this slice (not new feature work, but surfaced while building it): the
`InsufficientStockDetail` type's field names didn't match the real 409 response body —
see the plan doc's Slice P3 detail for the full explanation. Both the Branch New Sale
screen and this slice's New Sale screen were updated to the correct field names.

Not run: anything on a real device (no emulator, same gap as every slice before this),
and the actual submit flow against `/orders/production-sale`.

## Production app Slices P1+P2 (role dispatch, Dashboard, Orders, Order Detail)

See `mobile-production-plan.md` for scope. This is a role-based expansion of the same
codebase — `production_user` now gets its own app shell instead of the Branch one.

```
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 402 warnings (up from 361 — same pre-existing
                         # categories: react-native/no-inline-styles, no-void)
npx jest                # 1 suite, 4 tests, all passed
```

Not run: anything on a real device (no emulator, same gap as every slice before this),
and the actual Review/Final-Approve mutation flow against the live backend.

**Finance app**: no screens built. `mobile-finance-plan.md` is an architecture audit
only — five backend route files still need a full read before any screen work starts.
`FinanceDrawerNavigator` is a static placeholder, verified only by the same full-tree
`tsc`/`eslint`/`jest` run above (it has no logic of its own to test beyond rendering).


## Full-app verification after Slice 11 (branchApp.md plan complete)

```
npx tsc --noEmit        # clean, no output
npx eslint src          # 0 errors, 361 warnings (all pre-existing style categories)
npx jest                # 1 suite, 4 tests, all passed
```

This is the whole `src/` tree, not a per-slice scope — confirms no slice broke an
earlier one. Still not run anywhere in this report: any Android/iOS device build or
manual visual QA (no device/emulator in this environment, flagged since Slice 1), and
every live-network submit/revise/withdraw flow (flagged per-slice above).


Real command output per slice. Never a fabricated "all green" — if a command couldn't
run (missing device/emulator, missing credentials), that's stated explicitly instead.

## Slice 1 — Foundation (theme, icons, navigation scaffolding)

Commands run from `mobile/`:

```
npx tsc --noEmit
```
Result: clean, no output (no type errors).

```
npx eslint src/shared/theme src/shared/ui/Icon src/navigation
```
Result: 8 warnings, 0 errors — all pre-existing patterns (inline styles, `no-void`,
`react/no-unstable-nested-components` on files not touched by this slice's logic), no new
errors introduced.

```
npx jest
```
Result: 1 suite, 4 tests, all passed (`__tests__/businessDate.test.ts` — unaffected by
this slice, re-run as a regression check).

Not run this slice: Android/iOS device build, manual visual QA against the new dark
theme on small/large phone/tablet sizes (no device/emulator available in this
environment) — flagged as a follow-up for whoever has a device/emulator handy, not
claimed as done.

Full-repo `npx eslint .` (not scoped to changed files) reports 17 errors, but every one is
in `design UIandUX/support.js` (the static HTML mockup's own support script, not part of
the app) — pre-existing, unrelated to this slice. `npx eslint src` confirms 0 errors,
103 warnings (all pre-existing style warnings, e.g. inline styles, `no-void`) across the
whole app source tree.

## Slice 2 — Orders (production demand: New Orders list + Create Order)

Commands run from `mobile/`:

```
npx tsc --noEmit
```
Result: clean, no output (no type errors).

```
npx eslint src/features/orders src/api src/navigation/OrdersStackNavigator
```
Result: 37 warnings, 0 errors — all `react-native/no-inline-styles` (matching the
existing `sales`/`stock` feature convention of inline per-element style objects) and
`no-void` (matching `useSalesApi.ts`'s existing pattern), no new error categories.

```
npx jest
```
Result: 1 suite, 4 tests, all passed (`__tests__/businessDate.test.ts`, re-run as a
regression check — unaffected by this slice).

Not run this slice: Android/iOS device build, manual visual QA (no device/emulator
available in this environment) — same gap as Slice 1, not claimed as done. In particular,
the submit flow against the live backend (`POST /production-orders`) has NOT been
exercised end-to-end — only typecheck/lint/unit-test verified. A `branch_manager` account
and a real device/emulator are needed to confirm the happy path and the order-window /
restriction-rule error paths render sensibly.

## Slice 3 — Stock (Stock Overview reconciliation, Stock Check, Return Items, Return Stock)

Commands run from `mobile/`:

```
npx tsc --noEmit
```
Result: clean, no output (no type errors) — after fixing one real issue found along
the way: `react-native-image-picker`'s `quality` option needs a literal `0.7 as const`,
not a plain `number`, to satisfy its `PhotoQuality` type.

```
npx eslint src/features/stock src/api src/shared/ui/Icon src/navigation/StockStackNavigator
```
Result: first pass caught one real error (`isRefetching` unused in `StockCheckScreen`
before a `RefreshControl` was wired to it) — fixed, then 0 errors, 75 warnings, all
`react-native/no-inline-styles` / `no-void` (same pre-existing convention as every
other screen in this app).

```
npx jest
```
Result: 1 suite, 4 tests, all passed (regression check, unaffected by this slice).

**New dependency, unverified on-device:** `react-native-image-picker@8.3.1` was added
for Return Items' Camera/Gallery capture (the first photo-capture flow in this app).
`npm install` completed cleanly and the JS/TS side type-checks and lints clean, but no
native build was run — no device/emulator in this environment. iOS needs `pod install`
and camera/photo-library `Info.plist` usage-description strings; Android needs its
autolinking to pick up the new package and a `CAMERA`/media permission added where
`ACCESS_FINE_LOCATION` already is in `AndroidManifest.xml`. None of that has been done or
verified — flagging explicitly rather than claiming it works.

Also not run: the actual submit flow for Return Items (`POST /stock/return`, multipart
`POST /attachments`) and Return Stock's Change/Withdraw (`PUT`/`DELETE /stock/returns/:id`)
against the live backend — only typecheck/lint/unit-test verified, same as every
mutation-path gap in this report so far.

## Slice 4 — Discounts (Request Discount, Discounts list)

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/discounts src/api src/navigation/DiscountsStackNavigator src/navigation/DrawerNavigator
```
Result: 0 errors, 43 warnings — all `react-native/no-inline-styles` / `no-void` /
the pre-existing `react/no-unstable-nested-components` on `DrawerNavigator`'s
`drawerContent` prop (from Slice 1, not touched by this slice's logic).

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

Not run: the live submit/revise/withdraw flow against `/branch-discounts` (no
device/emulator), same gap as every mutation path so far in this report.

## Slice 5 — Cash (Cash Deposit, Cash Transfers list)

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/cash src/api src/navigation/CashStackNavigator src/navigation/DrawerNavigator
```
Result: 0 errors, 48 warnings — same pre-existing categories as every prior slice.

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

Not run: the live Save Deposit flow (photo upload + `POST /cash-transfers`) — no
device/emulator, same `react-native-image-picker` caveat as Slice 3.

## Slice 6 — Expenses (Shop Expenses list, New Shop Expense)

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/expenses src/api src/navigation/ExpensesStackNavigator src/navigation/DrawerNavigator
```
Result: 0 errors, 37 warnings — same pre-existing categories as every prior slice.

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

Not run: the live Save Expense flow against `/expenses` — no device/emulator.

## Slice 7 — Special Events (List view), Event Demand

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/events src/api src/navigation/EventsStackNavigator src/navigation/DrawerNavigator
```
Result: 0 errors, 45 warnings — same pre-existing categories as every prior slice.

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

Not run: the live Save Draft / Submit flow against `/special-events/:id/demands` — no
device/emulator.

## Slice 8 — Daily Sale Record, Manual Feed (Branch Closing deliberately not built)

```
npx tsc --noEmit
```
Result: one real error caught and fixed — `ListDailySaleRecordsParams` needed an index
signature to satisfy `apiClient.get`'s generic params type. Clean after the fix.

```
npx eslint src/features/closing src/api src/navigation/ClosingStackNavigator src/navigation/DrawerNavigator src/navigation/types.ts
```
Result: 0 errors, 49 warnings — same pre-existing categories as every prior slice.

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

Not run: the live Generate/Manual Feed/Verify flow against `/daily-sale-records` — no
device/emulator.

## Slice 9 — Reports (Trend, Top Products, Packing)

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/reports src/api src/navigation/ReportsStackNavigator src/navigation/DrawerNavigator
```
Result: 0 errors, 31 warnings — same pre-existing categories as every prior slice.

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

## Slice 11 — Onboarding, Auth navigator, Profile/Settings (final branchApp.md slice)

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/auth src/features/profile src/navigation
```
Result: 0 errors, 34 warnings — same pre-existing categories as every prior slice (plus
one pre-existing `react/no-unstable-nested-components` in `BottomTabNavigator`, not
touched by this slice).

```
npx jest
```
Result: 1 suite, 4 tests, all passed.

Not run: the onboarding flag's actual persistence/first-run behavior and the Sign Out
flow on a real device — no device/emulator.

## Slice 10 — Help Desk, New Query

```
npx tsc --noEmit
```
Result: clean, no output.

```
npx eslint src/features/support src/api src/navigation/HelpDeskStackNavigator src/navigation/DrawerNavigator
```
Result: 0 errors, 39 warnings — same pre-existing categories as every prior slice.

```
npx jest
```
Result: 1 suite, 4 tests, all passed.
