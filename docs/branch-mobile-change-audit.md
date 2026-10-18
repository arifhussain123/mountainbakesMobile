# Branch page → mobile change audit

Audited 2026-10-18 against the frontend branch `production-dashboard-redesign` at `71898e1`, the backend at `7c8ec94` (live on Railway) and mobile `change-on-Drawer-Design` at `4f9e6f0`.

## How the audit was done

- The mobile Branch screens were rebuilt on 16–17 Oct 2026 (`48f083e` and the commits after it) from the `design UIandUX` mock, not from the web code. So the web code was compared against mobile as it stands, not taken on trust.
- Every frontend commit since 10 Oct 2026 was listed with the Branch-side files it touched: `src/app/(dashboard)/(branch)/*` and the components those routes render (cash transfers, discounts, expenses, sales, stock/returns, closing, daily sale, print).
- Commits that only touch Admin, Production or Finance screens were left out. That includes Production Demand Summary print (`133a26b`, Production → Orders only) and the Admin Dashboard work (`71898e1` and others).
- Uncommitted web work at audit time was Admin-only (`dashboard/admin/*`).
- For each item the mobile counterpart was read, and the backend route was checked before relying on it.

## Inventory

| # | Web change (commit) | Web source | Mobile counterpart | Backend / API | Mobile state | Required mobile change |
|---|---|---|---|---|---|---|
| 1 | Monthly Cash Transfer summary above Branch → Cash Transfer Details (`9bf56d7`, `5c3127c`) | `components/cash-transfers/MonthlyCashTransferSummary.tsx`, `BranchCashTransfersPage.tsx` | `features/cash/screens/CashTransfersListScreen` | `GET /api/cash-transfers/monthly-summary` (`7c8ec94`, live), branch pinned to the JWT | **Missing** | Types, service, hook, a summary card (8 figures: Total Transferred, Cash, Easypaisa, Bank, Approved, Awaiting Finance, Rejected, Fuel Charges) on the list screen; refresh after a new deposit and on pull-to-refresh |
| 2 | Shop Expenses opens on the month to date, not the last 7 days (`9b988a0`) | `components/expenses/ExpensesPage.tsx` | `features/expenses/screens/ShopExpensesListScreen` (legacy `GET /api/expenses`, server-fixed to 7 days) | Data Engine `GET /api/data/expenses` + `/aggregate` (branch roles allowed, `branchScope` pins the branch) | **Outdated** | Read `/data/expenses` with `businessDate.gte=<1st>`; move the window to day 1 by itself |
| 3 | Shop Expenses total is computed in the database over the window, shown in a full-width total card (`9b988a0`, `c228d7f`) | `ExpensesPage.tsx`, `components/shared/SummaryTotalCard.tsx` | Same screen: the total was added up on the phone from loaded rows, labelled "TOTAL (FILTERED)" | `/api/data/expenses/aggregate?metrics=sum:amount,count` | **Outdated** | Total = the server's `sum:amount` for the month to date, labelled with the window; local search only narrows the list |
| 4 | Branch → Discounts summary is one full-width total card: "Total discount (since …)", approved claims, awaiting-review line (`5767f67`, `d4a4a81`) | `production-orders/MonthlyDiscountSummary.tsx` (`OwnBranchSummary`) | `features/discounts/components/MonthlyDiscountSummaryCard.tsx` (branch view drew one branch box) | `GET /api/branch-discounts/summary` (unchanged) | **Outdated** | Branch view = a single total card in the Shop Expenses style; Production view keeps its per-branch boxes |
| 5 | Return Stock: monthly returns summary (`f8ed0c7`, `82af51f`) | `stock/MonthlyReturnsSummary.tsx` | `features/stock/components/MonthlyReturnsSummaryCard.tsx` | `GET /api/stock/returns/summary` | Already correct (`c8fcd1f`, `34ec2bf`) | — |
| 6 | Return Stock: the branch view's "Item-wise returns" list removed (uncommitted 19:05, now in `3ad89fb`) | `MonthlyReturnsSummary.tsx` | Same card: still showed an item-wise list on the branch view | — | **Outdated** | Drop the item-wise list from the branch view |
| 7 | Monthly summaries say "Month to date, Karachi business day · starts again on …" (`3ad89fb`, `9bf56d7`, shared `MonthToDateLine`) | `components/shared/MonthlySummary.tsx` | Returns summary card | — | **Missing** | Same line on the mobile returns, cash transfer and discount summaries, worked out from the server's window |
| 8 | Return Stock table with View / Change / Delete / Resubmit (restored in `9bf56d7`) | `stock/BranchReturnStockPage.tsx` | `ReturnStockListScreen` + `ReturnDetailSheet` / `ReviseReturnModal` (`00757bb`) | `/api/stock/returns*` | Already correct | — |
| 9 | Return rows show unit price × qty = amount and the product code (`82af51f`) | `stock/returnColumns.tsx` | `describeReturnValue` on `ReturnStockCard` (`34ec2bf`) | Row pricing from `priceReturnRows` | Already correct | — |
| 10 | New sale lines are added at the top of the list (`6eb6ab2`) | `sales/SaleForm.tsx` (`prepend`) | `features/sales/hooks/useNewSaleForm.ts` (`addLine` appended) | — | **Outdated** | Prepend new lines |
| 11 | A malformed stock row no longer crashes Return Items' product search (`f5d70b4`) | `stock/ReturnItemsModal.tsx` | `ProductPickerModal`, `ReturnOptionSheet` | — | **Missing guard** | Null-safe matching |
| 12 | A malformed demand row no longer crashes New Orders' discount demand search (`12aa693`) | `production-orders/discountShared.tsx` | `features/discounts/components/DemandPickerModal.tsx` | — | **Missing guard** | Null-safe matching |
| 13 | Daily Sale Record opens on the current month so far (`fb269dc`) | `daily-sale/DailySaleRecordPage.tsx` | `features/closing/screens/DailySaleRecordListScreen` (opened on the last 30 days) | `GET /api/daily-sale-records` | **Outdated** | Default window = 1st of the business month → today |
| 14 | Daily Sale Record is kept from 1 Sep 2026: earlier days are never requested, and a notice says so (`cce44e8`, `c5efba8`) | `DailySaleRecordPage.tsx` | Same screen: no floor | — | **Missing** | Request from max(from, 2026-09-01); notice when the window reaches back past it; an explaining empty state when it lies wholly before it |
| 15 | "This window is out by" notice, amount in red (`79d687b`, `3f50185`) | `daily-sale/board.tsx` | Same screen (`DailySaleRecordListScreen:326`) | — | Already present | Check the amount colour |
| 16 | Branch Share column replaces Source on Daily Sale Record (`1dd0124`, `a5cefcd`) | `daily-sale/columns.tsx` | `DailySaleRecordCard` (`3054dc0`, `c02b8db`) | — | Already correct | — |
| 17 | Branch Closing prints as a POS receipt (`688e24d`, `4126183`) | `closing/BranchClosingPage.tsx`, `lib/print/receipt/branchClosing.ts` | `BranchClosingScreen` (`b17f8f6`) | — | Already correct | — |
| 18 | Branch Closing print shows the payment and stock sections; print clipping fixes (`3f61e01`, `ca40d0e`) | `BranchClosingPage.tsx` (print CSS) | Mobile prints its own receipt, not the page | — | Not applicable (web print stylesheet only) | — |
| 19 | Monthly Discount summary on Branch → Discounts, with a focus refresh and a failed-refresh notice (this session) | `MonthlyDiscountSummary.tsx` | `MonthlyDiscountSummaryCard` + `useSummaryFocusRefresh` | `GET /api/branch-discounts/summary` | Present; the layout changes in #4 | Keep the focus refresh and the out-of-date notice in the new card |

## Plan

1. API layer: Cash Transfer summary types, service and hook; Data Engine expenses list and aggregate service and hooks.
2. Screens: Cash Transfers (#1), Shop Expenses (#2, #3), Discounts branch card (#4), returns card branch view (#6, #7), sale lines (#10), searches (#11, #12), Daily Sale Record window and floor (#13, #14, #15).
3. Pure helpers for each rule (window, floor, labels, null-safe matching), with jest tests.
4. Run tsc, jest and eslint. An Android build is attempted only if a device toolchain is available (see the sync report).
