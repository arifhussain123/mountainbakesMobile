import type { NavigatorScreenParams } from '@react-navigation/native';
import { Routes } from './routes';
import type { DrillTarget } from '@/features/finance/utils/dashboardModel';

export type HomeStackParamList = {
  [Routes.DASHBOARD]: undefined;
};

export type SalesStackParamList = {
  [Routes.SALES_LIST]: undefined;
  [Routes.NEW_SALE]: undefined;
  [Routes.SALE_DETAIL]: { orderId: string };
};

export type StockStackParamList = {
  [Routes.STOCK_OVERVIEW]: undefined;
  [Routes.STOCK_CHECK]: undefined;
  [Routes.RETURN_STOCK_LIST]: undefined;
};

export type OrdersStackParamList = {
  [Routes.ORDERS_LIST]: undefined;
  [Routes.ORDER_DETAIL]: { orderId: string };
};

export type DiscountsStackParamList = {
  [Routes.DISCOUNTS_LIST]: undefined;
  [Routes.DISCOUNT_DETAIL]: { discountId: string };
};

export type CashStackParamList = {
  [Routes.CASH_TRANSFERS_LIST]: undefined;
  [Routes.CASH_TRANSFER_DETAIL]: { transferId: string };
};

export type ExpensesStackParamList = {
  [Routes.SHOP_EXPENSES_LIST]: undefined;
};

export type EventsStackParamList = {
  [Routes.SPECIAL_EVENTS]: undefined;
  [Routes.EVENT_DEMAND]: { eventId: string };
};

export type ClosingStackParamList = {
  [Routes.BRANCH_CLOSING]: undefined;
  [Routes.DAILY_SALE_RECORD]: undefined;
  [Routes.DAILY_SALE_DETAIL]: { businessDate: string };
};

export type ReportsStackParamList = {
  [Routes.REPORTS]: undefined;
};

export type HelpDeskStackParamList = {
  [Routes.HELP_DESK]: undefined;
};

export type BottomTabParamList = {
  [Routes.HOME_TAB]: NavigatorScreenParams<HomeStackParamList> | undefined;
  [Routes.SALES_TAB]: NavigatorScreenParams<SalesStackParamList> | undefined;
  [Routes.ORDERS_TAB]: NavigatorScreenParams<OrdersStackParamList> | undefined;
  [Routes.STOCK_TAB]: NavigatorScreenParams<StockStackParamList> | undefined;
  [Routes.MORE_TAB]: undefined;
};

export type DrawerParamList = {
  [Routes.TABS]: NavigatorScreenParams<BottomTabParamList> | undefined;
  [Routes.DISCOUNTS_STACK]: NavigatorScreenParams<DiscountsStackParamList> | undefined;
  [Routes.CASH_STACK]: NavigatorScreenParams<CashStackParamList> | undefined;
  [Routes.EXPENSES_STACK]: NavigatorScreenParams<ExpensesStackParamList> | undefined;
  [Routes.EVENTS_STACK]: NavigatorScreenParams<EventsStackParamList> | undefined;
  [Routes.CLOSING_STACK]: NavigatorScreenParams<ClosingStackParamList> | undefined;
  [Routes.REPORTS_STACK]: NavigatorScreenParams<ReportsStackParamList> | undefined;
  [Routes.HELP_DESK_STACK]: NavigatorScreenParams<HelpDeskStackParamList> | undefined;
  [Routes.PROFILE]: undefined;
  [Routes.SETTINGS]: undefined;
};

export type AuthStackParamList = {
  [Routes.ONBOARDING]: undefined;
  [Routes.LOGIN]: undefined;
  [Routes.FORGOT_PASSWORD]: undefined;
};

// ─── Production app (production_user) ─────────────────────────────────────

export type ProductionOrdersStackParamList = {
  [Routes.PRODUCTION_ORDERS_LIST]: undefined;
  [Routes.PRODUCTION_ORDER_DETAIL]: { orderId: string };
};

export type ProductionSalesStackParamList = {
  [Routes.PRODUCTION_SALES_LIST]: undefined;
  [Routes.PRODUCTION_NEW_SALE]: undefined;
};

export type ProductionStockStackParamList = {
  [Routes.PRODUCTION_STOCK_OVERVIEW]: undefined;
  [Routes.PRODUCTION_PREPARED_PRODUCTS]: undefined;
  [Routes.PRODUCTION_STOCK_ADJUSTMENT]: undefined;
  [Routes.PRODUCTION_BRANCH_STOCK]: undefined;
};

export type ProductionReturnsStackParamList = {
  [Routes.PRODUCTION_RETURNS_LIST]: undefined;
  [Routes.PRODUCTION_RETURN_DETAIL]: { returnId: string };
  [Routes.PRODUCTION_NEW_RETURN]: undefined;
};

export type RecipientsStackParamList = {
  [Routes.RECIPIENTS_LIST]: undefined;
  [Routes.RECIPIENTS_DELIVERY_LOG]: undefined;
};

/** Super Admin Settings → Restriction Rules (web /settings and /settings/restriction-rules). */
export type SuperAdminSettingsStackParamList = {
  [Routes.SUPER_ADMIN_SETTINGS_HOME]: undefined;
  [Routes.SUPER_ADMIN_RESTRICTION_RULES]: undefined;
};

export type PriceHistoryStackParamList = {
  [Routes.PRICE_HISTORY_LIST]: undefined;
  [Routes.PRICE_HISTORY_PRODUCT]: { productId: string; productName: string };
};

export type ProductionDiscountsStackParamList = {
  [Routes.PRODUCTION_DISCOUNTS_LIST]: undefined;
  [Routes.PRODUCTION_DISCOUNT_DETAIL]: { discountId: string };
};

export type ProductionEventsStackParamList = {
  [Routes.PRODUCTION_EVENTS_LIST]: undefined;
  [Routes.PRODUCTION_EVENT_DEMAND]: { eventId: string; eventName: string };
};

/** WhatsApp Purchasing (drawer stack). */
export type ProductionWhatsAppStackParamList = {
  [Routes.PRODUCTION_WHATSAPP_LIST]: undefined;
  /** No `demandId`: a new demand. With one: edit, verify and send that draft. */
  [Routes.PRODUCTION_WHATSAPP_DEMAND_FORM]: { demandId?: string } | undefined;
  [Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL]: { demandId: string };
  [Routes.PRODUCTION_WHATSAPP_QUOTATION_ENTRY]: { demandId: string };
  [Routes.PRODUCTION_WHATSAPP_BILL_ENTRY]: { demandId: string };
  [Routes.PRODUCTION_WHATSAPP_RECEIPT]: { demandId: string };
  [Routes.PRODUCTION_WHATSAPP_CONVERSATIONS]: { tab?: 'conversations' | 'unmatched' | 'failed' } | undefined;
  [Routes.PRODUCTION_WHATSAPP_THREAD]: { conversationId: string; title: string; windowOpenUntil: string | null; supplierId: string | null };
};

export type ProductionBottomTabParamList = {
  [Routes.PRODUCTION_DASHBOARD_TAB]: undefined;
  [Routes.PRODUCTION_ORDERS_TAB]: NavigatorScreenParams<ProductionOrdersStackParamList> | undefined;
  [Routes.PRODUCTION_STOCK_TAB]: NavigatorScreenParams<ProductionStockStackParamList> | undefined;
  [Routes.PRODUCTION_RETURNS_TAB]: NavigatorScreenParams<ProductionReturnsStackParamList> | undefined;
  [Routes.PRODUCTION_MORE_TAB]: undefined;
};

export type ProductionDrawerParamList = {
  [Routes.PRODUCTION_TABS]: NavigatorScreenParams<ProductionBottomTabParamList> | undefined;
  [Routes.PRODUCTION_SALES_STACK]: NavigatorScreenParams<ProductionSalesStackParamList> | undefined;
  [Routes.PRODUCTION_DISCOUNTS_STACK]: NavigatorScreenParams<ProductionDiscountsStackParamList> | undefined;
  [Routes.PRODUCTION_EVENTS_STACK]: NavigatorScreenParams<ProductionEventsStackParamList> | undefined;
  [Routes.PRODUCTION_REPORTS_STACK]: undefined;
  [Routes.PRODUCTION_WHATSAPP_STACK]: NavigatorScreenParams<ProductionWhatsAppStackParamList> | undefined;
  [Routes.PRODUCTION_HELP_DESK_STACK]: undefined;
  [Routes.PROFILE]: undefined;
};

export type FinanceHomeStackParamList = {
  [Routes.FINANCE_DASHBOARD]: undefined;
  /** The source records behind one dashboard figure. `dashboardBranchId` is the dashboard's branch filter, used when the target leaves the branch open. */
  [Routes.FINANCE_DASHBOARD_RECORDS]: { target: DrillTarget; dashboardBranchId: string | null };
};

export type FinanceLedgerStackParamList = {
  [Routes.FINANCE_LEDGER_LIST]: undefined;
};

export type FinanceCashTransfersStackParamList = {
  [Routes.FINANCE_CASH_TRANSFERS_LIST]: undefined;
  [Routes.FINANCE_CASH_TRANSFER_DETAIL]: { transferId: string };
};

export type FinanceHelpDeskStackParamList = {
  [Routes.FINANCE_HELP_DESK_LIST]: undefined;
  [Routes.FINANCE_TICKET_DETAIL]: { ticketId: string };
};

export type FinancePayrollStackParamList = {
  [Routes.FINANCE_PAYROLL_LIST]: undefined;
  [Routes.FINANCE_EMPLOYEE_DETAIL]: { employeeId: string };
  [Routes.FINANCE_SALARY_LEDGER]: undefined;
};

export type FinanceBottomTabParamList = {
  [Routes.FINANCE_DASHBOARD_TAB]: undefined;
  [Routes.FINANCE_LEDGER_TAB]: NavigatorScreenParams<FinanceLedgerStackParamList> | undefined;
  [Routes.FINANCE_INCOME_EXPENSE_TAB]: undefined;
  [Routes.FINANCE_PAYROLL_TAB]: NavigatorScreenParams<FinancePayrollStackParamList> | undefined;
  [Routes.FINANCE_MORE_TAB]: undefined;
};

export type FinanceDrawerParamList = {
  [Routes.FINANCE_TABS]: NavigatorScreenParams<FinanceBottomTabParamList> | undefined;
  [Routes.FINANCE_CASH_TRANSFERS_STACK]: NavigatorScreenParams<FinanceCashTransfersStackParamList> | undefined;
  [Routes.FINANCE_PARTNERS_STACK]: undefined;
  [Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK]: undefined;
  [Routes.FINANCE_LEDGER_HEADS_STACK]: undefined;
  [Routes.FINANCE_CLOSING_STACK]: undefined;
  [Routes.FINANCE_REPORTS_STACK]: undefined;
  [Routes.FINANCE_AUDIT_TRAIL_STACK]: undefined;
  [Routes.FINANCE_HELP_DESK_STACK]: NavigatorScreenParams<FinanceHelpDeskStackParamList> | undefined;
  [Routes.FINANCE_SETTINGS_STACK]: undefined;
  [Routes.FINANCE_SUPPLIER_PAYMENTS_STACK]: undefined;
  [Routes.FINANCE_AI_CAPTURE_STACK]: undefined;
  [Routes.PROFILE]: undefined;
};

export type SuperAdminOrdersStackParamList = {
  [Routes.SUPER_ADMIN_ORDERS_LIST]: undefined;
  [Routes.SUPER_ADMIN_ORDER_DETAIL]: { orderId: string };
};

export type SuperAdminBottomTabParamList = {
  [Routes.SUPER_ADMIN_DASHBOARD_TAB]: undefined;
  [Routes.SUPER_ADMIN_ORDERS_TAB]: NavigatorScreenParams<SuperAdminOrdersStackParamList> | undefined;
  [Routes.SUPER_ADMIN_BRANCH_STOCK_TAB]: undefined;
  [Routes.SUPER_ADMIN_REPORTS_TAB]: undefined;
  [Routes.SUPER_ADMIN_MORE_TAB]: undefined;
};

/** Super Admin — Special Events (web /special-events + /special-events/[id]). */
export type SuperAdminEventsStackParamList = {
  [Routes.SUPER_ADMIN_EVENTS_LIST]: undefined;
  [Routes.SUPER_ADMIN_EVENT_DETAIL]: { eventId: string };
};

/** Super Admin — Support Center (web /support): ops tickets + Finance queries. */
export type SuperAdminSupportStackParamList = {
  [Routes.SUPER_ADMIN_SUPPORT_LIST]: undefined;
  [Routes.SUPER_ADMIN_SUPPORT_TICKET]: { ticketId: string };
  [Routes.SUPER_ADMIN_FINANCE_TICKET]: { ticketId: string };
};

/** Super Admin — Daily Ledger (web /finance-ledger). */
export type SuperAdminLedgerStackParamList = {
  [Routes.SUPER_ADMIN_LEDGER_LIST]: undefined;
};

/** Super Admin — Daily Sale Records (web /daily-sale-records): the board, then one record's View. */
export type SuperAdminDailySaleStackParamList = {
  [Routes.SUPER_ADMIN_DAILY_SALE_LIST]: undefined;
  [Routes.SUPER_ADMIN_DAILY_SALE_DETAIL]: { recordId: string };
};

export type SuperAdminDrawerParamList = {
  [Routes.SUPER_ADMIN_EVENTS_STACK]: NavigatorScreenParams<SuperAdminEventsStackParamList> | undefined;
  [Routes.SUPER_ADMIN_SUPPORT_STACK]: NavigatorScreenParams<SuperAdminSupportStackParamList> | undefined;
  [Routes.SUPER_ADMIN_LEDGER_STACK]: NavigatorScreenParams<SuperAdminLedgerStackParamList> | undefined;
  [Routes.SUPER_ADMIN_TABS]: NavigatorScreenParams<SuperAdminBottomTabParamList> | undefined;
  [Routes.PRICE_HISTORY_STACK]: NavigatorScreenParams<PriceHistoryStackParamList> | undefined;
  [Routes.RECIPIENTS_STACK]: NavigatorScreenParams<RecipientsStackParamList> | undefined;
  [Routes.SUPER_ADMIN_CUSTOMERS]: undefined;
  [Routes.SUPER_ADMIN_DAILY_SALE]: NavigatorScreenParams<SuperAdminDailySaleStackParamList> | undefined;
  [Routes.SUPER_ADMIN_PRODUCTS]: undefined;
  [Routes.SUPER_ADMIN_CATEGORIES]: undefined;
  [Routes.SUPER_ADMIN_PRICE_LIST]: undefined;
  [Routes.SUPER_ADMIN_BRANCHES]: undefined;
  [Routes.SUPER_ADMIN_BRANCH_LOCATIONS]: undefined;
  [Routes.SUPER_ADMIN_USERS]: undefined;
  [Routes.SUPER_ADMIN_SECURITY]: undefined;
  [Routes.SUPER_ADMIN_BACKUP]: undefined;
  [Routes.SUPER_ADMIN_SETTINGS]: NavigatorScreenParams<SuperAdminSettingsStackParamList> | undefined;
  [Routes.SUPER_ADMIN_CATALOG_HUB]: undefined;
  [Routes.SUPER_ADMIN_BRANCHES_HUB]: undefined;
  [Routes.SUPER_ADMIN_FINANCE_HUB]: undefined;
  [Routes.SUPER_ADMIN_ADMIN_HUB]: undefined;
  // The Finance role's screens, as the web lets super_admin open them.
  [Routes.FINANCE_CASH_TRANSFERS_STACK]: NavigatorScreenParams<FinanceCashTransfersStackParamList> | undefined;
  [Routes.SUPER_ADMIN_FINANCE_ENTRIES]: undefined;
  [Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK]: NavigatorScreenParams<FinancePayrollStackParamList> | undefined;
  [Routes.FINANCE_PARTNERS_STACK]: undefined;
  [Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK]: undefined;
  [Routes.FINANCE_LEDGER_HEADS_STACK]: undefined;
  [Routes.FINANCE_CLOSING_STACK]: undefined;
  [Routes.FINANCE_REPORTS_STACK]: undefined;
  [Routes.FINANCE_AUDIT_TRAIL_STACK]: undefined;
  [Routes.FINANCE_SETTINGS_STACK]: undefined;
  [Routes.PROFILE]: undefined;
};

export type RootStackParamList = {
  [Routes.AUTH]: undefined;
  [Routes.DRAWER]: NavigatorScreenParams<DrawerParamList> | undefined;
  [Routes.PRODUCTION_DRAWER]: NavigatorScreenParams<ProductionDrawerParamList> | undefined;
  [Routes.FINANCE_DRAWER]: NavigatorScreenParams<FinanceDrawerParamList> | undefined;
  [Routes.SUPER_ADMIN_DRAWER]: NavigatorScreenParams<SuperAdminDrawerParamList> | undefined;
  [Routes.UNSUPPORTED_ROLE]: undefined;
  [Routes.COMING_SOON]: { title: string };
  // Modal, reachable from any screen (Help Desk's own list push there too) —
  // same "root-level destination" pattern as COMING_SOON, since a Sale/Order/
  // Expense/Stock/Cash Transfer screen that wants to open these lives in an
  // unrelated stack several navigators away.
  [Routes.QUERY_DETAIL]: { ticketId: string };
  [Routes.NEW_QUERY]: { prefillReferenceId?: string } | undefined;
  [Routes.NOTIFICATIONS]: undefined;
  [Routes.GLOBAL_SEARCH]: undefined;
  [Routes.CHANGE_PASSWORD]: undefined;
};
