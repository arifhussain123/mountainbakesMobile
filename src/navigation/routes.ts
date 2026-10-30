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

  // Global Search (the web header's Ctrl+K) — root-level modal, opened from
  // the search icon in every Super Admin header.
  GLOBAL_SEARCH: 'GlobalSearch',

  // Forced password change (web /change-password) — root-level, shown by
  // RootNavigator in place of the role shell while `mustChangePassword`.
  CHANGE_PASSWORD: 'ChangePassword',

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

  // WhatsApp Purchasing — Production buying from outside suppliers.
  PRODUCTION_WHATSAPP_STACK: 'ProductionWhatsAppStack',
  PRODUCTION_WHATSAPP_LIST: 'ProductionWhatsAppList',
  PRODUCTION_WHATSAPP_DEMAND_FORM: 'ProductionWhatsAppDemandForm',
  PRODUCTION_WHATSAPP_DEMAND_DETAIL: 'ProductionWhatsAppDemandDetail',
  PRODUCTION_WHATSAPP_QUOTATION_ENTRY: 'ProductionWhatsAppQuotationEntry',
  PRODUCTION_WHATSAPP_BILL_ENTRY: 'ProductionWhatsAppBillEntry',
  PRODUCTION_WHATSAPP_RECEIPT: 'ProductionWhatsAppReceipt',
  PRODUCTION_WHATSAPP_CONVERSATIONS: 'ProductionWhatsAppConversations',
  PRODUCTION_WHATSAPP_THREAD: 'ProductionWhatsAppThread',
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
  // Supplier payments and credit raised from WhatsApp Purchasing.
  FINANCE_SUPPLIER_PAYMENTS_STACK: 'FinanceSupplierPaymentsStack',
  // Receipts read by the AI into Income & Expense entries.
  FINANCE_AI_CAPTURE_STACK: 'FinanceAiCaptureStack',

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
  // Super Admin Orders tab stack (web /orders — Production Orders, read-only).
  SUPER_ADMIN_ORDERS_LIST: 'SuperAdminOrdersList',
  SUPER_ADMIN_ORDER_DETAIL: 'SuperAdminOrderDetail',
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
  // Super Admin drawer group rows: each lists its pages (SuperAdminHubScreen).
  SUPER_ADMIN_CATALOG_HUB: 'SuperAdminCatalogHub',
  SUPER_ADMIN_BRANCHES_HUB: 'SuperAdminBranchesHub',
  SUPER_ADMIN_FINANCE_HUB: 'SuperAdminFinanceHub',
  SUPER_ADMIN_ADMIN_HUB: 'SuperAdminAdminHub',
  // Inside SuperAdminSettingsStackNavigator (mounted at SUPER_ADMIN_SETTINGS): Settings → Restriction Rules.
  SUPER_ADMIN_SETTINGS_HOME: 'SuperAdminSettingsHome',
  SUPER_ADMIN_RESTRICTION_RULES: 'SuperAdminRestrictionRules',

  // Super Admin — Special Events (web /special-events), read-only this phase.
  SUPER_ADMIN_EVENTS_STACK: 'SuperAdminEventsStack',
  SUPER_ADMIN_EVENTS_LIST: 'SuperAdminEventsList',
  SUPER_ADMIN_EVENT_DETAIL: 'SuperAdminEventDetail',
  // Super Admin — Support Center (web /support), read-only this phase.
  SUPER_ADMIN_SUPPORT_STACK: 'SuperAdminSupportStack',
  SUPER_ADMIN_SUPPORT_LIST: 'SuperAdminSupportList',
  SUPER_ADMIN_SUPPORT_TICKET: 'SuperAdminSupportTicket',
  SUPER_ADMIN_FINANCE_TICKET: 'SuperAdminFinanceTicket',
  // Super Admin — Daily Ledger (web /finance-ledger), read-only this phase.
  SUPER_ADMIN_LEDGER_STACK: 'SuperAdminLedgerStack',
  SUPER_ADMIN_LEDGER_LIST: 'SuperAdminLedgerList',
  // Super Admin — the web's other finance pages (`canAccessFinance`), mounted
  // in the Super Admin drawer from the Finance role's own screens. The ones
  // that are drawer screens in the Finance shell keep their FINANCE_* names
  // there too; these two are tabs in that shell, so they get drawer names here.
  SUPER_ADMIN_FINANCE_ENTRIES: 'SuperAdminFinanceEntries',
  SUPER_ADMIN_FINANCE_PAYROLL_STACK: 'SuperAdminFinancePayrollStack',
  // Super Admin — Daily Sale Records (web /daily-sale-records): the board and
  // one record's read-only View. The stack mounts under SUPER_ADMIN_DAILY_SALE.
  SUPER_ADMIN_DAILY_SALE_LIST: 'SuperAdminDailySaleList',
  SUPER_ADMIN_DAILY_SALE_DETAIL: 'SuperAdminDailySaleDetail',
} as const;
