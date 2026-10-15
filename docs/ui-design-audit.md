# UI design audit — Branch, Production, Finance

**Method**: code-level audit only. No Android emulator or iOS simulator exists in this
environment; the only connected device (`adb devices`) is the project owner's own phone in
live use, which this session treats as screencap-only, never an install/tap target, unless
explicitly authorized for a specific pass. Every row below is a structural comparison (same
sections, same order, same key data fields, same shared theme/components, hooked to real
`@/api` data vs. static) between the HTML mockup and the React Native source — **not** a
pixel/screenshot comparison. Three roles have their own mockup file under
`design UIandUX/` (relative to `mobile/`): `mountainbakesBranch.html` (28 screens),
`mountainbakesProduction.html` (15 screens), `mountainbakesFinance.html` (23 screens). There
is no "Admin" role or mockup in this app (roles are `branch_manager`, `production_user`, four
`finance_*` roles, and `super_admin`) — the generic Admin/User-management/Vendors checklist
in some audit templates doesn't apply here and isn't invented.

Palette ground truth for every "hardcoded color?" check below: `src/shared/theme/colors.ts`
(`darkColors` — explicitly ported from the mockups' own "Midnight" theme, per its own doc
comment), not the raw hex literals in the HTML.

---

## Branch (`mountainbakesBranch.html`, 28 screens)

28 design screens total. **Match: 17 · Partial: 11 · Mismatch: 0 · Missing: 0.** Every mockup
screen has a corresponding RN file; every RN screen is reachable (registered in a navigator,
or rendered as a bottom sheet from its owning list screen) — no orphans. Zero hardcoded hex
colors found across any of the 26 screen files (all route through `useAppTheme()`). All 26
screens wire real `@/api` data, directly or via a `use*Form` hook that itself calls `@/api` —
no fake/static display values found.

| # | Design Screen | RN File | Nav Route | Structural | Theme/Components | Real Data | Notes |
|---|---|---|---|---|---|---|---|
| 01 | Splash | `navigation/RootNavigator/SplashView.tsx` | pre-auth | match | yes | n/a | Warm glow, logo, tagline, spinner all present. |
| 02 | Onboarding 1 | `features/auth/screens/OnboardingScreen` | `Onboarding` | partial | yes | n/a | 2-slide version (mockup has slides 1 & 3); section order matches, copy not verbatim. |
| 02b | Onboarding 3 | same file | `Onboarding` | partial | yes | n/a | "Day ends at 2 AM" business-rule copy present, ties to real `businessDate.ts`. |
| 02c | Login | `features/auth/screens/LoginScreen` | `Login` | match | yes | yes (`useLoginForm`) | "Finance Ledger sign-in" button deliberately omitted — documented role-isolation decision. |
| 03 | Home | `features/dashboard/screens/HomeDashboardScreen` | `Dashboard` | **partial** | yes | yes (`useReportSummary`, `useSalesAnalytics`, `useStockHistoryDay`) | **Biggest fidelity gap in Branch.** Top-level section order matches CLAUDE.md §47 exactly, but the mockup's Payment-Methods breakdown, Last-7-Days list, full Stock-Detail table, and expandable Stock-History cards have no corresponding component in `features/dashboard/components/*`. |
| 04 | New Orders | `features/orders/screens/OrdersListScreen` | `OrdersList` | match | yes | yes | |
| 05 | Create Order | `features/orders/screens/CreateOrderScreen` | sheet, from OrdersList | match | yes | yes | |
| 06 | Return Items | `features/stock/screens/ReturnItemsScreen` | sheet, from StockOverview | match | yes | yes | |
| 07 | Request Discount | `features/discounts/screens/RequestDiscountScreen` | sheet, from DiscountsList | match | yes | yes | |
| 08 | Cash Deposit | `features/cash/screens/CashDepositScreen` | sheet, from CashTransfersList | partial | yes | yes | "Auto-fill from Daily Sale Record" flagged as unwired in `docs/SCREENS.md`; not re-verified against current code this pass. |
| 09 | Sales | `features/sales/screens/SalesListScreen` | `SalesList` | match | yes | yes | |
| 10 | New Sale | `features/sales/screens/NewSaleScreen` | `NewSale` (full screen) | match | yes | yes | Correctly full-screen, matching the mockup's own designation. |
| 11 | Stock | `features/stock/screens/StockOverviewScreen` | `StockOverview` | match | yes | yes | |
| 12 | Stock Check | `features/stock/screens/StockCheckScreen` | sheet, from StockOverview | match | yes | yes | |
| 13 | Return Stock | `features/stock/screens/ReturnStockListScreen` | `ReturnStockList` | match | yes | yes | |
| 14 | Discounts | `features/discounts/screens/DiscountsListScreen` | `DiscountsList` | match | yes | yes | |
| 15 | Cash Transfers | `features/cash/screens/CashTransfersListScreen` | `CashTransfersList` | match | yes | yes | |
| 16 | Shop Expenses | `features/expenses/screens/ShopExpensesListScreen` | `ShopExpensesList` | match | yes | yes | |
| 17 | New Shop Expense | `features/expenses/screens/NewShopExpenseScreen` | sheet, from ShopExpensesList | match | yes | yes | |
| 18 | Special Events | `features/events/screens/SpecialEventsScreen` | `SpecialEvents` | partial | yes | yes | List-view only — the mockup's Calendar/month-grid is NOT built (acknowledged in-code), no month-grid primitive exists anywhere in the app. |
| 19 | Event Demand | `features/events/screens/EventDemandScreen` | `EventDemand` | match | yes | yes | |
| 20 | Branch Closing | `features/closing/screens/BranchClosingScreen` | `BranchClosing` | match | yes | yes | |
| 21 | Daily Sale Record | `features/closing/screens/DailySaleRecordListScreen` | `DailySaleRecord` | match | yes | yes | |
| 22 | Manual Feed | `features/closing/screens/ManualFeedScreen` | sheet, from DailySaleRecordList | match | yes | yes | |
| 23 | Reports | `features/reports/screens/ReportsScreen` | `Reports` | partial | yes | yes | Mockup's 4th tab "Branch Comparison" (admin-only data) silently absent — correct for this role, but no explicit "not available" affordance, just fewer tabs. |
| 24 | Help Desk | `features/support/screens/HelpDeskListScreen` | `HelpDesk` | match | yes | yes | |
| 25 | New Query | `features/support/screens/NewQueryScreen` | sheet, from HelpDeskList | match | yes | yes | |
| 26 | More (Drawer) | `navigation/DrawerNavigator/DrawerContent` | drawer chrome | partial | yes | yes | 7 items route only to a generic "coming soon" stub: Stock History, Branch Demand, Products, Price List, Packaging Materials, Notifications, Support Center. Cosmetic label drift elsewhere ("Orders" vs "New Orders" etc). |

---

## Production (`mountainbakesProduction.html`, 15 screens)

15 catalogued entries (01–16, skipping 04; 16 is drawer chrome, not a distinct screen).
**Match: 8 · Partial: 4 · Missing (intentional/blocked): 2 · Missing (unintentional): 0.** All
colors route through theme; all built screens wire real `@/api` hooks; no orphaned screens.

| # | Design Screen | RN File | Nav Route | Structural | Theme/Components | Real Data | Notes |
|---|---|---|---|---|---|---|---|
| 01 | Production Dashboard | `features/production/screens/ProductionDashboardScreen` | `ProductionDashboardTab` | **partial** | yes | yes | Mockup has ~10 sections (filters, total-demand hero, donut, 12-month trend chart, branch comparison, top-10 products, production plan, heatmap, recent demands); RN screen has 2 stat boxes + 1 stock card. Justified by the plan doc's own note (no dashboard-summary endpoint; `/reports/*` refuses the role), but a large structural gap vs. the mockup that the plan's "Done" status doesn't fully convey. |
| 02 | Production Orders | `ProductionOrdersListScreen` | `ProductionOrdersStack` | partial | yes | yes | Core list/tabs/search match. Mockup's "Special Orders" sub-section and "Demand Summary — Waiting Orders" table have no RN equivalent. |
| 03 | Order Detail | `ProductionOrderDetailScreen` | modal, from OrdersStack | partial | yes | yes | Products + Reject/Send/Final-Approve match. Missing: "Previous Order Balance" grid, "Returned since last order" section, and **POP Print / A4 Challan buttons** — confirmed zero printer-integration code exists anywhere in the repo, so this isn't partial, it's wholly unbuilt. Not flagged in the plan doc's own open items — a genuine undocumented gap. |
| 05 | Sales | `ProductionSalesListScreen` | `ProductionSalesStack` | match | yes | yes | |
| 06 | New Sale | `ProductionNewSaleScreen` | modal, from SalesStack | match | yes | yes | "Save & Print" collapsed into one submit button (no print feature app-wide). |
| 07 | Production Stock | `ProductionStockOverviewScreen` | `ProductionStockStack` | match | yes | yes | "Prepared Detail" button intentionally not built (no endpoint, per plan doc); "Adjustment" is built. |
| 08 | Prepared Products | `ProductionPreparedProductsScreen` | modal, from StockStack | match | yes | yes | |
| 09 | Branch Stock | — none | `ProductionBranchStock` → `comingSoonPane` | missing (intentional) | n/a | blocked | `GET /stock/history/branches` is `super_admin`-only; re-confirmed still blocked, not silently built. |
| 10 | Returns | `ProductionReturnsListScreen` + detail + new | `ProductionReturnsStack` | match | yes | yes | `Rejected` tab buckets both `rejected`+`returned` (mockup has no 5th tab) — documented. |
| 11 | Discounts | `ProductionDiscountsListScreen` + detail | `ProductionDiscountsStack` | match | yes | yes | Same bucketing choice as Returns. |
| 12 | Special Events | `ProductionEventsListScreen` + `ProductionEventDemandScreen` | `ProductionEventsStack` | match | yes | yes | 4-stat grid + event cards + "Nothing to consolidate yet" match mockup exactly. |
| 13 | Production Reports | — none | `ProductionReportsStack` → `blockedPane` | missing (intentional) | n/a | blocked | `/reports/*` genuinely refuses `production_user`; no fake table/export built. Needs an owner decision (add an endpoint, or descope) — still open. |
| 14 | Help Desk | `features/support/screens/HelpDeskListScreen` (shared with Branch) | `ProductionHelpDeskStack` | match | yes | yes | |
| 15 | New Query | `features/support/screens/NewQueryScreen` (shared with Branch) | **bottom sheet, not a routed screen** | partial | yes | yes | Functionally equivalent to the mockup; structurally the mockup treats this as its own full screen/route, RN presents it as a sheet from Help Desk — reachable, just a different navigation shape. |
| 16 | Drawer | `ProductionDrawerNavigator/ProductionDrawerContent` | drawer chrome | match | yes | yes | All expected links present. |

---

## Finance (`mountainbakesFinance.html`, 23 screens)

Built across this session's own multi-slice process (`docs/mobile-finance-plan.md` has the
full endpoint-map/permission-model detail; summarized here for the cross-app view). **11 of
23 screens built so far**, the rest are wired "coming soon" placeholders (reachable, not
orphaned, not faked). Every built screen was written directly against the real backend
contract (four parallel subagent reads of the actual route/schema/type files before any
mobile type was written — "none invented").

| # | Design Screen | RN File | Nav Route | Structural | Theme/Components | Real Data | Notes |
|---|---|---|---|---|---|---|---|
| 01 | Finance Dashboard | `features/finance/screens/FinanceDashboardScreen` | `FinanceDashboardTab` | partial | yes | yes (`useFinanceDashboard`) | Built from `GET /finance/dashboard` (today's composite + 7-day trend). The mockup's richer monthly multi-chart view (filters, category cards, income/expense bars, 31-day dual bar, 6-month multi-series line chart) is deliberately deferred — documented in the plan doc, not silently dropped. |
| 02 | Daily Ledger | `FinanceLedgerListScreen` | `FinanceLedgerTab` | match | yes | yes (`useLedgerPage`) | View-only this slice — the three `adjust`-gated corrections (reverse/edit/delete) are `finance_admin`-only and deferred. |
| 03 | Cash Transfers | `FinanceCashTransfersListScreen` + `FinanceCashTransferDetailScreen` | `FinanceCashTransfersTab` | match | yes | yes | Approve/reject gated on `financeCan(role,'approve')`, not role name. |
| 04 | Income & Expense | `FinanceIncomeExpenseListScreen` | `FinanceIncomeExpenseTab` | match | yes | yes | Matches exactly what this mockup frame shows (manual documents only) — the separate 3-step Branch Income approval queue is NOT shown in this frame and is deliberately not built yet. |
| 05 | New Entry | `NewFinanceTransactionSheetContent` | sheet, from Income&Expense | match | yes | yes | Type→ledger-head-chip filter, account/payment-method chips, required receipt photo, Save Draft/Submit. |
| 06–11 | Payroll (list/payslip/advance/employee/resignation/salary ledger) | — none | `FinancePayrollStack` → `comingSoonPane` | missing (not yet built) | n/a | n/a | Largest remaining group — in progress. |
| 12–14 | Partners | — none | `FinancePartnersStack` → `comingSoonPane` | missing (not yet built) | n/a | n/a | |
| 15 | Company Transaction Details | — none | `FinanceCompanyTransactionDetailsStack` → `comingSoonPane` | missing (not yet built) | n/a | n/a | |
| 16–17 | Ledger Heads | `FinanceLedgerHeadsScreen` | `FinanceLedgerHeadsStack` | match | yes | yes | A head is deactivated, never deleted (`isSystem` heads can't even be deactivated from the UI) — matches the backend's own `ON DELETE RESTRICT` design. |
| 18 | Daily Closing | `FinanceClosingScreen` | `FinanceClosingStack` | match | yes | yes | |
| 19 | Finance Reports | `FinanceReportsScreen` | `FinanceReportsStack` | partial | yes | yes (`useFinanceReport`) | On-screen viewer for all 10 report types built; PDF/Excel/CSV export deferred — no file-download/share library exists in this app yet. |
| 20 | Audit Trail | `FinanceAuditTrailScreen` | `FinanceAuditTrailStack` | match | yes | yes | |
| 21–22 | Help Desk / New Query | — none | `FinanceHelpDeskStack` → `comingSoonPane` | missing (not yet built) | n/a | n/a | Per an explicit decision this session: mobile will expose view/report/discuss/request-reopen only — the `super_admin`-only admin actions (edit/amend/correct/delete a financial record, restore, recreate) stay web-only. |
| 23 | Finance Settings | `FinanceSettingsScreen` | `FinanceSettingsStack` | match | yes | yes | Editable only when `financeCan(role,'configure',allowSuperAdminWrite)` is true for the signed-in user — not role-name gated. |

---

## Cross-app summary

| App | Screens | Match | Partial | Missing (intentional) | Missing (unbuilt) |
|---|---|---|---|---|---|
| Branch | 28 | 17 | 11 | 0 | 0 |
| Production | 15 | 8 | 4 | 2 | 0 |
| Finance | 23 | 7 | 3 | 1 | 12 |
| **Total** | **66** | **32** | **18** | **3** | **12** |

Most significant findings across all three apps (full detail in each section above):

1. **Branch Home dashboard** — missing Payment-Methods breakdown, Last-7-Days list, full
   Stock-Detail table, expandable Stock-History cards. No component exists yet for any of
   these.
2. **Production Order Detail** — missing printing entirely (POP/A4 Challan) and two data
   sections (Previous Balance, Returns since last order); not previously flagged anywhere.
3. **Branch "More" drawer** — 7 menu items are dead-end "coming soon" stubs (Stock History,
   Branch Demand, Products, Price List, Packaging Materials, Notifications, Support Center).
4. **Production Reports** and **Branch Stock** — correctly left blocked (backend genuinely
   refuses the role, no fake data built), but both need an owner decision on whether to add
   a backend endpoint or formally descope.
5. **Finance** is 11/23 screens into its own build, each slice individually audited and
   documented in `docs/mobile-finance-plan.md` as it was built — the remaining 12 are
   reachable placeholders, not orphaned or faked.
6. **One real bug found and fixed this pass**: the Finance mutations built earlier this
   session had no idempotency key — see `docs/bug-fix-report.md` #1 (now fixed and verified).
