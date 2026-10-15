# Screen → route → role → completion mapping

Condensed index. See `docs/ui-design-audit.md` for the full structural-comparison detail
behind each status, and `docs/mobile-production-plan.md` / `docs/mobile-finance-plan.md` for
each role's own build log.

## Branch (`branch_manager`) — 28 screens, all reachable

| Screen | Route | File | Status |
|---|---|---|---|
| Splash | pre-auth | `RootNavigator/SplashView` | done |
| Onboarding ×2 | `Onboarding` | `auth/screens/OnboardingScreen` | done (2 of 3 mockup slides) |
| Login | `Login` | `auth/screens/LoginScreen` | done |
| Home | `Dashboard` | `dashboard/screens/HomeDashboardScreen` | partial (see audit) |
| New Orders / Create Order | `OrdersList` | `orders/screens/OrdersListScreen` (+ sheet) | done |
| Return Items | sheet, from `StockOverview` | `stock/screens/ReturnItemsScreen` | done |
| Request Discount | sheet, from `DiscountsList` | `discounts/screens/RequestDiscountScreen` | done |
| Cash Deposit | sheet, from `CashTransfersList` | `cash/screens/CashDepositScreen` | partial (auto-fill from DSR unconfirmed) |
| Sales / New Sale | `SalesList` / `NewSale` | `sales/screens/*` | done |
| Stock / Stock Check | `StockOverview` | `stock/screens/*` | done |
| Return Stock | `ReturnStockList` | `stock/screens/ReturnStockListScreen` | done |
| Discounts | `DiscountsList` | `discounts/screens/DiscountsListScreen` | done |
| Cash Transfers | `CashTransfersList` | `cash/screens/CashTransfersListScreen` | done |
| Shop Expenses / New Expense | `ShopExpensesList` | `expenses/screens/*` | done |
| Special Events | `SpecialEvents` | `events/screens/SpecialEventsScreen` | partial (no calendar view) |
| Event Demand | `EventDemand` | `events/screens/EventDemandScreen` | done |
| Branch Closing | `BranchClosing` | `closing/screens/BranchClosingScreen` | done |
| Daily Sale Record / Manual Feed | `DailySaleRecord` | `closing/screens/*` | done |
| Reports | `Reports` | `reports/screens/ReportsScreen` | partial (Branch Comparison tab absent, correctly) |
| Help Desk / New Query | `HelpDesk` | `support/screens/*` | done |
| More (Drawer) | drawer | `navigation/DrawerNavigator/DrawerContent` | partial (7 stub links) |

## Production (`production_user`) — 15 screens, all reachable

| Screen | Route | File | Status |
|---|---|---|---|
| Production Dashboard | `ProductionDashboardTab` | `production/screens/ProductionDashboardScreen` | partial (2 sections vs. mockup's ~10) |
| Production Orders / Order Detail | `ProductionOrdersStack` | `production/screens/ProductionOrders*` | partial (no print, no Previous Balance section) |
| Sales / New Sale | `ProductionSalesStack` | `production/screens/Production*Sale*` | done |
| Production Stock / Prepared Products | `ProductionStockStack` | `production/screens/Production*Stock*` | done |
| Branch Stock | `ProductionBranchStock` | — | **blocked** (backend refuses role) |
| Returns | `ProductionReturnsStack` | `production/screens/ProductionReturns*` | done |
| Discounts | `ProductionDiscountsStack` | `production/screens/ProductionDiscounts*` | done |
| Special Events | `ProductionEventsStack` | `production/screens/ProductionEvent*` | done |
| Production Reports | `ProductionReportsStack` | — | **blocked** (backend refuses role, needs owner decision) |
| Help Desk | `ProductionHelpDeskStack` | `support/screens/HelpDeskListScreen` (shared) | done |
| New Query | bottom sheet (not routed) | `support/screens/NewQueryScreen` (shared) | done, different nav shape than mockup |
| Drawer | drawer | `ProductionDrawerContent` | done |

## Finance (`finance_admin`/`finance_manager`/`accountant`/`finance_auditor`) — 23 screens, all reachable

| Screen | Route | File | Status |
|---|---|---|---|
| Finance Dashboard | `FinanceDashboardTab` | `finance/screens/FinanceDashboardScreen` | done (today's view; monthly multi-chart deferred) |
| Daily Ledger | `FinanceLedgerTab` | `finance/screens/FinanceLedgerListScreen` | done (view-only) |
| Cash Transfers | `FinanceCashTransfersTab` | `finance/screens/FinanceCashTransfers*` | done |
| Income & Expense / New Entry | `FinanceIncomeExpenseTab` | `finance/screens/FinanceIncomeExpense*` | done |
| Payroll (6 screens) | `FinancePayrollStack` | — | not yet built (next) |
| Partner Transactions (3 screens) | `FinancePartnersStack` | — | not yet built |
| Company Transaction Details | `FinanceCompanyTransactionDetailsStack` | — | not yet built |
| Ledger Heads | `FinanceLedgerHeadsStack` | `finance/screens/FinanceLedgerHeadsScreen` | done |
| Daily Closing | `FinanceClosingStack` | `finance/screens/FinanceClosingScreen` | done |
| Finance Reports | `FinanceReportsStack` | `finance/screens/FinanceReportsScreen` | done (on-screen; export deferred) |
| Audit Trail | `FinanceAuditTrailStack` | `finance/screens/FinanceAuditTrailScreen` | done |
| Help Desk / New Query (2 screens) | `FinanceHelpDeskStack` | — | not yet built; scoped to view/discuss-only per owner decision |
| Finance Settings | `FinanceSettingsStack` | `finance/screens/FinanceSettingsScreen` | done |

## No "Admin" role in this app

Some audit checklists assume a generic Admin role with User/Product/Vendor/Category
management screens. This app has no such role or mockup — `super_admin` exists but has no
dedicated mobile screens of its own; it is routed to `UnsupportedRoleView` except where it
also holds Finance access (then it gets the Finance app, gated by `allowSuperAdminWrite`).
Nothing was invented to fill this template section.
