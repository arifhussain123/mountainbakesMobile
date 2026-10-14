/** Every route name used anywhere in the app — never a hardcoded string elsewhere. */
export const Routes = {
  // Root stack
  DRAWER: 'Drawer',
  PRODUCTION_DRAWER: 'ProductionDrawer',
  FINANCE_DRAWER: 'FinanceDrawer',
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

  // Stock stack
  STOCK_OVERVIEW: 'StockOverview',
  RETURN_STOCK_LIST: 'ReturnStockList',

  // Orders stack
  ORDERS_LIST: 'OrdersList',

  // Discounts stack
  DISCOUNTS_LIST: 'DiscountsList',

  // Cash stack
  CASH_TRANSFERS_LIST: 'CashTransfersList',

  // Expenses stack
  SHOP_EXPENSES_LIST: 'ShopExpensesList',

  // Events stack
  SPECIAL_EVENTS: 'SpecialEvents',
  EVENT_DEMAND: 'EventDemand',

  // Closing stack
  BRANCH_CLOSING: 'BranchClosing',
  DAILY_SALE_RECORD: 'DailySaleRecord',

  // Reports stack
  REPORTS: 'Reports',

  // Help desk stack
  HELP_DESK: 'HelpDesk',

  // Account
  PROFILE: 'Profile',
  SETTINGS: 'Settings',

  // Auth stack
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',

  // ─── Production app (production_user) ──────────────────────────────────
  PRODUCTION_TABS: 'ProductionTabs',
  PRODUCTION_DASHBOARD_TAB: 'ProductionDashboardTab',
  PRODUCTION_ORDERS_TAB: 'ProductionOrdersTab',
  PRODUCTION_SALES_TAB: 'ProductionSalesTab',
  PRODUCTION_STOCK_TAB: 'ProductionStockTab',
  PRODUCTION_MORE_TAB: 'ProductionMoreTab',

  PRODUCTION_DASHBOARD: 'ProductionDashboard',

  PRODUCTION_ORDERS_LIST: 'ProductionOrdersList',
  PRODUCTION_ORDER_DETAIL: 'ProductionOrderDetail',

  PRODUCTION_SALES_LIST: 'ProductionSalesList',
  PRODUCTION_NEW_SALE: 'ProductionNewSale',

  PRODUCTION_STOCK_OVERVIEW: 'ProductionStockOverview',
  PRODUCTION_PREPARED_PRODUCTS: 'ProductionPreparedProducts',
  PRODUCTION_STOCK_ADJUSTMENT: 'ProductionStockAdjustment',
  PRODUCTION_BRANCH_STOCK: 'ProductionBranchStock',

  PRODUCTION_RETURNS_STACK: 'ProductionReturnsStack',
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
} as const;
