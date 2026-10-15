import type { NavigatorScreenParams } from '@react-navigation/native';
import { Routes } from './routes';

export type HomeStackParamList = {
  [Routes.DASHBOARD]: undefined;
};

export type SalesStackParamList = {
  [Routes.SALES_LIST]: undefined;
  [Routes.NEW_SALE]: undefined;
};

export type StockStackParamList = {
  [Routes.STOCK_OVERVIEW]: undefined;
  [Routes.RETURN_STOCK_LIST]: undefined;
};

export type OrdersStackParamList = {
  [Routes.ORDERS_LIST]: undefined;
};

export type DiscountsStackParamList = {
  [Routes.DISCOUNTS_LIST]: undefined;
};

export type CashStackParamList = {
  [Routes.CASH_TRANSFERS_LIST]: undefined;
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

export type ProductionDiscountsStackParamList = {
  [Routes.PRODUCTION_DISCOUNTS_LIST]: undefined;
  [Routes.PRODUCTION_DISCOUNT_DETAIL]: { discountId: string };
};

export type ProductionEventsStackParamList = {
  [Routes.PRODUCTION_EVENTS_LIST]: undefined;
  [Routes.PRODUCTION_EVENT_DEMAND]: { eventId: string; eventName: string };
};

export type ProductionBottomTabParamList = {
  [Routes.PRODUCTION_DASHBOARD_TAB]: undefined;
  [Routes.PRODUCTION_ORDERS_TAB]: NavigatorScreenParams<ProductionOrdersStackParamList> | undefined;
  [Routes.PRODUCTION_SALES_TAB]: NavigatorScreenParams<ProductionSalesStackParamList> | undefined;
  [Routes.PRODUCTION_STOCK_TAB]: NavigatorScreenParams<ProductionStockStackParamList> | undefined;
  [Routes.PRODUCTION_MORE_TAB]: undefined;
};

export type ProductionDrawerParamList = {
  [Routes.PRODUCTION_TABS]: NavigatorScreenParams<ProductionBottomTabParamList> | undefined;
  [Routes.PRODUCTION_RETURNS_STACK]: NavigatorScreenParams<ProductionReturnsStackParamList> | undefined;
  [Routes.PRODUCTION_DISCOUNTS_STACK]: NavigatorScreenParams<ProductionDiscountsStackParamList> | undefined;
  [Routes.PRODUCTION_EVENTS_STACK]: NavigatorScreenParams<ProductionEventsStackParamList> | undefined;
  [Routes.PRODUCTION_REPORTS_STACK]: undefined;
  [Routes.PRODUCTION_HELP_DESK_STACK]: undefined;
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
  [Routes.FINANCE_CASH_TRANSFERS_TAB]: NavigatorScreenParams<FinanceCashTransfersStackParamList> | undefined;
  [Routes.FINANCE_INCOME_EXPENSE_TAB]: undefined;
  [Routes.FINANCE_MORE_TAB]: undefined;
};

export type FinanceDrawerParamList = {
  [Routes.FINANCE_TABS]: NavigatorScreenParams<FinanceBottomTabParamList> | undefined;
  [Routes.FINANCE_PAYROLL_STACK]: NavigatorScreenParams<FinancePayrollStackParamList> | undefined;
  [Routes.FINANCE_PARTNERS_STACK]: undefined;
  [Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK]: undefined;
  [Routes.FINANCE_LEDGER_HEADS_STACK]: undefined;
  [Routes.FINANCE_CLOSING_STACK]: undefined;
  [Routes.FINANCE_REPORTS_STACK]: undefined;
  [Routes.FINANCE_AUDIT_TRAIL_STACK]: undefined;
  [Routes.FINANCE_HELP_DESK_STACK]: NavigatorScreenParams<FinanceHelpDeskStackParamList> | undefined;
  [Routes.FINANCE_SETTINGS_STACK]: undefined;
};

export type RootStackParamList = {
  [Routes.AUTH]: undefined;
  [Routes.DRAWER]: NavigatorScreenParams<DrawerParamList> | undefined;
  [Routes.PRODUCTION_DRAWER]: NavigatorScreenParams<ProductionDrawerParamList> | undefined;
  [Routes.FINANCE_DRAWER]: NavigatorScreenParams<FinanceDrawerParamList> | undefined;
  [Routes.UNSUPPORTED_ROLE]: undefined;
  [Routes.COMING_SOON]: { title: string };
};
