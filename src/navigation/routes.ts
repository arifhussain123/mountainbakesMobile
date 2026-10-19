/** Every route name used anywhere in the app — never a hardcoded string elsewhere. */
export const Routes = {
  // Root stack
  AUTH: 'Auth',
  DRAWER: 'Drawer',
  PRODUCTION_DRAWER: 'ProductionDrawer',
  FINANCE_DRAWER: 'FinanceDrawer',
  SUPER_ADMIN_DRAWER: 'SuperAdminDrawer',
  UNSUPPORTED_ROLE: 'UnsupportedRole',
  COMING_SOON: 'ComingSoon',

  // Drawer
  TABS: 'Tabs',
  DISCOUNTS_STACK: 'DiscountsStack',
  CASH_STACK: 'CashStack',
  EXPENSES_STACK: 'ExpensesStack',
  EVENTS_STACK: 'EventsStack',
  CLOSING_STACK: 'ClosingStack',
  REPORTS_STACK: 'ReportsStack',
  HELP_DESK_STACK: 'HelpDeskStack',

  // Bottom tabs
  HOME_TAB: 'HomeTab',
  SALES_TAB: 'SalesTab',
  ORDERS_TAB: 'OrdersTab',
  STOCK_TAB: 'StockTab',
  MORE_TAB: 'MoreTab',

  // Home stack
  DASHBOARD: 'Dashboard',

  // Sales stack
  SALES_LIST: 'SalesList',
  NEW_SALE: 'NewSale',
  SALE_DETAIL: 'SaleDetail',

  // Stock stack
  STOCK_OVERVIEW: 'StockOverview',
  STOCK_CHECK: 'StockCheck',
  RETURN_STOCK_LIST: 'ReturnStockList',

  // Orders stack
  ORDERS_LIST: 'OrdersList',
  ORDER_DETAIL: 'OrderDetail',

  // Discounts stack
  DISCOUNTS_LIST: 'DiscountsList',
  DISCOUNT_DETAIL: 'DiscountDetail',

  // Cash stack
  CASH_TRANSFERS_LIST: 'CashTransfersList',
  CASH_TRANSFER_DETAIL: 'CashTransferDetail',

  // Expenses stack
  SHOP_EXPENSES_LIST: 'ShopExpensesList',

  // Events stack
  SPECIAL_EVENTS: 'SpecialEvents',
  EVENT_DEMAND: 'EventDemand',

  // Closing stack
  BRANCH_CLOSING: 'BranchClosing',
  DAILY_SALE_RECORD: 'DailySaleRecord',
  DAILY_SALE_DETAIL: 'DailySaleDetail',

  // Reports stack
  REPORTS: 'Reports',

  // Help desk stack (QUERY_DETAIL/NEW_QUERY are root-level modals — see RootStackParamList — so
  // "Report an issue" from any other stack can reach them the same way COMING_SOON does)
  HELP_DESK: 'HelpDesk',
  QUERY_DETAIL: 'QueryDetail',
  NEW_QUERY: 'NewQuery',

  // Notifications — root-level modal, same reasoning as QUERY_DETAIL/NEW_QUERY:
  // the bell lives in several module headers, not one stack.
  NOTIFICATIONS: 'Notifications',

  // Account
  PROFILE: 'Profile',
  SETTINGS: 'Settings',

  // Auth stack
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',
  FORGOT_PASSWORD: 'ForgotPassword',

  // ─── Production app (production_user) ──────────────────────────────────
  PRODUCTION_TABS: 'ProductionTabs',
  PRODUCTION_DASHBOARD_TAB: 'ProductionDashboardTab',
  PRODUCTION_ORDERS_TAB: 'ProductionOrdersTab',
  PRODUCTION_STOCK_TAB: 'ProductionStockTab',
  PRODUCTION_RETURNS_TAB: 'ProductionReturnsTab',
  PRODUCTION_MORE_TAB: 'ProductionMoreTab',

  PRODUCTION_DASHBOARD: 'ProductionDashboard',

  PRODUCTION_ORDERS_LIST: 'ProductionOrdersList',
  PRODUCTION_ORDER_DETAIL: 'ProductionOrderDetail',

  PRODUCTION_SALES_STACK: 'ProductionSalesStack',
  PRODUCTION_SALES_LIST: 'ProductionSalesList',
  PRODUCTION_NEW_SALE: 'ProductionNewSale',

  PRODUCTION_STOCK_OVERVIEW: 'ProductionStockOverview',
  PRODUCTION_PREPARED_PRODUCTS: 'ProductionPreparedProducts',
  PRODUCTION_STOCK_ADJUSTMENT: 'ProductionStockAdjustment',
  PRODUCTION_BRANCH_STOCK: 'ProductionBranchStock',

  PRODUCTION_RETURNS_LIST: 'ProductionReturnsList',
  PRODUCTION_RETURN_DETAIL: 'ProductionReturnDetail',
  PRODUCTION_NEW_RETURN: 'ProductionNewReturn',

  PRODUCTION_DISCOUNTS_STACK: 'ProductionDiscountsStack',
  PRODUCTION_DISCOUNTS_LIST: 'ProductionDiscountsList',
  PRODUCTION_DISCOUNT_DETAIL: 'ProductionDiscountDetail',

  PRODUCTION_EVENTS_STACK: 'ProductionEventsStack',
  PRODUCTION_EVENTS_LIST: 'ProductionEventsList',
  PRODUCTION_EVENT_DEMAND: 'ProductionEventDemand',

  PRODUCTION_REPORTS_STACK: 'ProductionReportsStack',
  PRODUCTION_HELP_DESK_STACK: 'ProductionHelpDeskStack',

  // mountainbakesFinance.html — docs/mobile-finance-plan.md. 13 top-level areas
  // scaffolded now (stack + first screen); each stack's own deeper screens are
  // added route-by-route as that slice is actually built — 23 screens' worth of
  // detail routes up front would outrun what's confirmed buildable this pass.
  FINANCE_TABS: 'FinanceTabs',
  FINANCE_DASHBOARD_TAB: 'FinanceDashboardTab',
  FINANCE_LEDGER_TAB: 'FinanceLedgerTab',
  FINANCE_INCOME_EXPENSE_TAB: 'FinanceIncomeExpenseTab',
  FINANCE_PAYROLL_TAB: 'FinancePayrollTab',
  FINANCE_MORE_TAB: 'FinanceMoreTab',

  FINANCE_DASHBOARD: 'FinanceDashboard',
  FINANCE_DASHBOARD_RECORDS: 'FinanceDashboardRecords',

  FINANCE_LEDGER_STACK: 'FinanceLedgerStack',
  FINANCE_LEDGER_LIST: 'FinanceLedgerList',

  FINANCE_CASH_TRANSFERS_STACK: 'FinanceCashTransfersStack',
  FINANCE_CASH_TRANSFERS_LIST: 'FinanceCashTransfersList',
  FINANCE_CASH_TRANSFER_DETAIL: 'FinanceCashTransferDetail',

  FINANCE_PAYROLL_LIST: 'FinancePayrollList',
  FINANCE_EMPLOYEE_DETAIL: 'FinanceEmployeeDetail',
  FINANCE_SALARY_LEDGER: 'FinanceSalaryLedger',
  FINANCE_PARTNERS_STACK: 'FinancePartnersStack',
  FINANCE_COMPANY_TRANSACTION_DETAILS_STACK: 'FinanceCompanyTransactionDetailsStack',
  FINANCE_LEDGER_HEADS_STACK: 'FinanceLedgerHeadsStack',
  FINANCE_CLOSING_STACK: 'FinanceClosingStack',
  FINANCE_HELP_DESK_LIST: 'FinanceHelpDeskList',
  FINANCE_TICKET_DETAIL: 'FinanceTicketDetail',

  FINANCE_REPORTS_STACK: 'FinanceReportsStack',
  FINANCE_AUDIT_TRAIL_STACK: 'FinanceAuditTrailStack',
  FINANCE_HELP_DESK_STACK: 'FinanceHelpDeskStack',
  FINANCE_SETTINGS_STACK: 'FinanceSettingsStack',

  // Super Admin catalog — Price History (read-only), mounted by the Super Admin shell.
  PRICE_HISTORY_STACK: 'PriceHistoryStack',
  PRICE_HISTORY_LIST: 'PriceHistoryList',
  PRICE_HISTORY_PRODUCT: 'PriceHistoryProduct',

  // Super Admin — closing-summary recipients, mounted by the Super Admin shell.
  RECIPIENTS_STACK: 'RecipientsStack',
  RECIPIENTS_LIST: 'RecipientsList',
  RECIPIENTS_DELIVERY_LOG: 'RecipientsDeliveryLog',

  // Super Admin shell. Orders, Branch Stock and Reports reuse Production's and
  // the branch's screens (the server serves super_admin every branch); the
  // rest are Super Admin's own read-only screens (`features/admin`).
  SUPER_ADMIN_TABS: 'SuperAdminTabs',
  SUPER_ADMIN_DASHBOARD_TAB: 'SuperAdminDashboardTab',
  SUPER_ADMIN_ORDERS_TAB: 'SuperAdminOrdersTab',
  SUPER_ADMIN_BRANCH_STOCK_TAB: 'SuperAdminBranchStockTab',
  SUPER_ADMIN_REPORTS_TAB: 'SuperAdminReportsTab',
  SUPER_ADMIN_MORE_TAB: 'SuperAdminMoreTab',
  SUPER_ADMIN_CUSTOMERS: 'SuperAdminCustomers',
  SUPER_ADMIN_DAILY_SALE: 'SuperAdminDailySale',
  SUPER_ADMIN_PRODUCTS: 'SuperAdminProducts',
  SUPER_ADMIN_CATEGORIES: 'SuperAdminCategories',
  SUPER_ADMIN_PRICE_LIST: 'SuperAdminPriceList',
  SUPER_ADMIN_BRANCHES: 'SuperAdminBranches',
  SUPER_ADMIN_BRANCH_LOCATIONS: 'SuperAdminBranchLocations',
  SUPER_ADMIN_USERS: 'SuperAdminUsers',
  SUPER_ADMIN_SECURITY: 'SuperAdminSecurity',
  SUPER_ADMIN_BACKUP: 'SuperAdminBackup',
  SUPER_ADMIN_SETTINGS: 'SuperAdminSettings',
} as const;
