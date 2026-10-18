# Branch page → mobile sync report

Done 2026-10-18 on mobile `change-on-Drawer-Design` (base `4f9e6f0`, uncommitted at the time of writing). The inventory and how it was gathered are in [branch-mobile-change-audit.md](branch-mobile-change-audit.md).

## 1. Recent Branch page changes found

From the frontend history since 10 Oct 2026 (to `71898e1`), Branch side only:

- **Cash Transfers:** a new month-to-date summary of eight figures (`9bf56d7`, `5c3127c`).
- **Shop Expenses:** opens on the month to date; the total is computed in the database and shown in a full-width total card (`9b988a0`, `c228d7f`).
- **Discounts:** the branch's monthly summary became one full-width total card (`5767f67`, `d4a4a81`).
- **Return Stock:**
  - a monthly summary with row values (`f8ed0c7`, `82af51f`);
  - the branch view's item-wise list removed;
  - the "Month to date · starts again on …" line;
  - the returns table with its actions restored (`9bf56d7`).
- **Sales:** new item lines are added at the top (`6eb6ab2`).
- **Crash fixes:** a malformed row no longer crashes Return Items' product search (`f5d70b4`) or New Orders' discount demand search (`12aa693`).
- **Daily Sale Record:**
  - opens on the current month so far (`fb269dc`);
  - is kept from 1 Sep 2026, with a notice and an empty state for earlier windows (`cce44e8`, `c5efba8`);
  - shows the "out by" amount in red (`79d687b`, `3f50185`);
  - shows Branch Share in place of Source (`1dd0124`, `a5cefcd`).
- **Branch Closing:** prints as a POS receipt (`688e24d`, `4126183`); its print stylesheet was fixed (`3f61e01`, `ca40d0e`).

## 2. Implemented in mobile

| Change | What mobile now does |
|---|---|
| Cash Transfers monthly summary | A new `MonthlyCashTransferSummaryCard` at the top of Cash Transfers. It shows the server's month-to-date figures (`GET /api/cash-transfers/monthly-summary`) in the web's order and words: Total Transferred, Cash, Easypaisa, Bank, Approved, Awaiting Finance, Rejected, Fuel Charges. It follows no list filter. It refreshes on pull-to-refresh, after a new deposit, and when you come back to the screen. It replaces the old strip of totals added up on the phone, which followed the filters and was capped at 200 rows. When more than 200 transfers match, the list now says so. |
| Shop Expenses, month to date | Reads the Data Engine (`/api/data/expenses`, `businessDate.gte=<1st of business month>`, 50 a page, infinite scroll) in place of the legacy `/api/expenses`, which the server fixes to 7 days. The window moves to the new month by itself (`getBusinessMonthStart`, 02:00 Karachi rollover). |
| Shop Expenses total | The total card is the database's `sum:amount` over the same window and search (`/api/data/expenses/aggregate`), labelled "TOTAL · THIS MONTH". It has its own retry when it fails. Search goes to the server, so it covers the whole month. |
| Discounts, branch view | A single full-width total card: "Total discount (since …)", the approved amount, "N claims approved" or "No approved claims yet", and a separate awaiting-review line. The out-of-date notice and the focus refresh are kept. The Production view keeps its per-branch boxes. |
| Return Stock summary, branch view | The item-wise list is dropped, matching the web. The "Month to date, Karachi business day · starts again on …" line is added to both views. |
| Month-to-date line | Shared helpers `formatSummaryWindow` and `formatMonthToDateLine` are used by the returns, cash transfer and discount summaries. Both work from the server's window, never the phone's clock. |
| New sale lines on top | `addLine` prepends. "+ Add Item" moved into the ITEMS header, as on the web, so a new line appears right under it. |
| Malformed-row search guards | A new `includesTerm` (null-safe) is used by the discount demand picker, the Return Items product picker and the return option sheet. The demand picker also matches the demand's date, as the web does. |
| Daily Sale Record window | Opens on the 1st of the business month to today (it was the last 30 days). Earlier than 1 Sep 2026 is never requested: a window that reaches back past it shows the web's notice, and one wholly before it requests nothing and shows the web's empty state. |

Already correct, so not changed: the returns summary and row values, Return Stock's actions, Daily Sale Record's Branch Share and red "out by" amount, and Branch Closing's POS receipt. Branch Closing's print-CSS fixes are web-only (mobile prints its own receipt).

## 3. Files

**Web files inspected:**
- `frontend/src/components/`:
  - `cash-transfers/{MonthlyCashTransferSummary,BranchCashTransfersPage}.tsx`
  - `expenses/ExpensesPage.tsx`
  - `shared/{SummaryTotalCard,MonthlySummary}.tsx`
  - `production-orders/{MonthlyDiscountSummary,BranchDiscountsPage,discountShared}.tsx`
  - `stock/{MonthlyReturnsSummary,BranchReturnStockPage,ReturnItemsModal,returnColumns}.tsx`
  - `sales/SaleForm.tsx`
  - `daily-sale/{DailySaleRecordPage,board,columns}.tsx`
  - `closing/BranchClosingPage.tsx`
- `frontend/src/lib/data-engine/listState.ts`
- `backend/src/routes/{cash-transfers,expenses,data,branches}.routes.ts`
- `backend/src/data-engine/registry.ts`
- `backend/src/shared/utils/cash-transfer-summary.ts`
- `backend/src/services/cash-transfer-summary.service.ts`

**Mobile files modified:**
- `src/api/`:
  - `businessDate.ts`, `index.ts`, `queryKeys.ts`, `types.ts`
  - `hooks/{index,useCashTransfersApi,useDailySaleApi,useDiscountsApi,useExpensesApi}.ts`
  - `services/{cashTransferService,expenseService}.ts`
- `src/features/cash/components/index.ts`, `src/features/cash/screens/CashTransfersScreen/index.tsx`
- `src/features/closing/screens/DailySaleRecordListScreen/index.tsx`
- `src/features/discounts/`:
  - `components/{DemandPickerModal,MonthlyDiscountSummaryCard}.tsx`
  - `discountSummary.ts`
  - `hooks/useDiscountActions.ts`
- `src/features/expenses/screens/ShopExpensesListScreen/index.tsx`
- `src/features/sales/hooks/useNewSaleForm.ts`, `src/features/sales/screens/NewSaleScreen/index.tsx`
- `src/features/stock/components/{MonthlyReturnsSummaryCard,ProductPickerModal,ReturnOptionSheet}.tsx`
- `src/shared/utils/index.ts`
- `__tests__/discountSummary.test.ts`

**Mobile files added:**
- `src/features/cash/cashTransferSummary.ts`
- `src/features/cash/components/MonthlyCashTransferSummaryCard.tsx`
- `src/features/closing/dailySaleWindow.ts`
- `src/features/expenses/expensesWindow.ts`
- `src/shared/utils/{monthToDate,search}.ts`
- `__tests__/branchWebSync.test.ts`, `__tests__/newSaleLineOrder.test.tsx`
- `docs/branch-mobile-change-audit.md`, `docs/branch-mobile-sync-report.md`

## 4. Backend / API changes

None. Mobile uses endpoints that already exist:
- **`GET /api/cash-transfers/monthly-summary`:** live since `7c8ec94`; the branch is pinned to the token.
- **`GET /api/data/expenses` and `/aggregate`:** branch roles are allowed (`OPERATIONS`), and `branchScope` pins `branch_id` to the token's branch.
- **`GET /api/branch-discounts/summary`, `/api/stock/returns/summary`, `/api/daily-sale-records`:** unchanged.

No credentials or privileged keys were added to the app.

## 5. Bug found and fixed along the way

Three summary caches sat under the same cache root as a list, and two parts of the app read the first entry under such a root and expect a list:
- The Discount summary (added earlier on 2026-10-18) sat under `['branchDiscounts']`. `useNavBadges` reads the first `['branchDiscounts']` entry as a claim list and calls `.discounts.filter`. If the summary was that entry, it would crash.
- The first version of the new Cash Transfer summary key sat under `['cashTransfers']`, which the Help Desk's recent records read the same way.
- The paged expenses data would have done the same under `['expenses']`.

All three now have their own roots (`branchDiscountSummary`, `cashTransferMonthlySummary`, `expensesData` / `expensesTotal`). Every write that affects them now refreshes them explicitly: claim writes (online, and queued offline in `useDiscountActions`), new deposits and new expenses. A regression test pins this.

## 6. Tests and builds run (actual results)

All run in `mobile/` with the binaries called directly (no pnpm, see the memory note).

| Command | Result |
|---|---|
| `./node_modules/.bin/tsc --noEmit` | Passed, exit 0 |
| `./node_modules/.bin/jest --maxWorkers=2` (full suite) | **51/51 suites, 526/526 tests passed.** New this round: `branchWebSync.test.ts` (29 tests) and `newSaleLineOrder.test.tsx` (1); `discountSummary.test.ts` updated |
| `./node_modules/.bin/eslint` on the 34 changed or added files | 0 errors; 91 warnings, the codebase's existing `no-inline-styles` / `no-void` style |
| `react-native bundle --platform android --dev false` (release JS bundle) | Built, exit 0, 4.7 MB. It contains the new code (monthly-summary endpoint, `businessDate.gte`, the Daily Sale Record empty state, the "starts again on" line) |
| `./gradlew assembleDebug` (native Android build) | **Not run.** About 5 GB of memory was free with other sessions active, and this machine has OOM-killed sessions on heavy builds before. The release JS bundle above is the part this change affects; no native module or Gradle file was touched |

What the tests cover:
- **Month start:** 1st of the month, mid-month, the 02:00 rollover, December → January, leap-year February, and the Karachi-versus-UTC boundary.
- **Cash Transfers:** the request sent, the eight tiles, and Fuel Charges staying separate.
- **Shop Expenses:** the exact Data Engine requests (list, search, total), Rs. 0 for an empty month, and the window label.
- **Discounts:** the branch total card's wording.
- **Daily Sale Record:** the window floor, the notice and the empty state.
- **Search:** the null-safe matching.
- **Cache keys:** each new key stays off its list's root.
- **Sales:** new lines go on top, earlier lines keep their order, and the last line is never removed.

## 7. Known issues and remaining work

- **Not seen on a device.** The screens type-check, pass their tests and bundle, but nobody has looked at them on a phone or an emulator. The user's handset is in live use and is not driven from here.
- **Shop Expenses has no offline fallback.** The old list had none either. Offline, the screen shows the error state with Retry.
- **Daily Sale Record's offline cache** is still keyed by the picked window. The first time it opens on the new month-to-date window there is no offline copy until a fetch succeeds.
- **The old local totals strip** (`TransferSummaryStrip`, `computeCashTransferTotals`) is no longer rendered but is still exported. It can be deleted once nothing else needs it.
- **Nothing here is committed, pushed or built into an APK yet.**

## 8. Platform limitations / manual configuration

- **No backend deploy needed:** every endpoint used is already live on Railway.
- **Phones need a new build:** the changes reach phones only through a new Android (or iOS) build installed on the devices.
- **Mobile tooling must not use pnpm:** `mobile/` installs with npm. Any `pnpm` command there makes pnpm 11 reinstall `node_modules` and breaks jest.
