import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Typed route params for the whole app. No `any` routes, no bare strings at a
 * `navigate()` call site — a renamed screen becomes a compile error rather than
 * a runtime dead end, which matters most for the two callers that navigate from
 * outside React: the notification handler and the sync engine.
 */

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

/**
 * Every tab name any role can have.
 *
 * Names are shared across roles on purpose — "Orders" is a tab for the admin,
 * the branch and the production counter — but the screen behind it is not the
 * same component. `resolveScreen` in `RoleTabs` keys on (role, name) for exactly
 * that reason: "Sales" at the production counter offers a `staff` payment method
 * that a branch sale must never offer.
 */
export type AppTabName =
  | 'Home'
  | 'Orders'
  | 'Products'
  | 'Reports'
  | 'Sales'
  | 'Stock'
  | 'Ledger'
  | 'Income'
  | 'Expenses'
  | 'More';

export type AppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Orders: NavigatorScreenParams<OrdersStackParamList> | undefined;
  Products: NavigatorScreenParams<ProductsStackParamList> | undefined;
  Reports: NavigatorScreenParams<ReportsStackParamList> | undefined;
  Sales: NavigatorScreenParams<SalesStackParamList> | undefined;
  Stock: NavigatorScreenParams<StockStackParamList> | undefined;
  Ledger: NavigatorScreenParams<LedgerStackParamList> | undefined;
  Income: NavigatorScreenParams<IncomeStackParamList> | undefined;
  Expenses: NavigatorScreenParams<ExpensesStackParamList> | undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

// ---------------------------------------------------------------------------
// Per-tab stacks
// ---------------------------------------------------------------------------

export type HomeStackParamList = {
  HomeIndex: undefined;
};

/**
 * Detail and create screens live in the stack that owns the resource, never as
 * top-level tabs. `CreateOrder` is presented modally; the list stays mounted
 * underneath so dismissing returns to it with scroll position intact.
 */
export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
  CreateOrder: undefined;
  OrderPrintPreview: { orderId: string };
};

export type SalesStackParamList = {
  SalesList: undefined;
  NewSale: undefined;
};

export type StockStackParamList = {
  StockList: undefined;
};

export type ProductsStackParamList = {
  ProductsList: undefined;
};

export type ReportsStackParamList = {
  ReportsIndex: undefined;
};

export type LedgerStackParamList = {
  LedgerIndex: undefined;
};

export type IncomeStackParamList = {
  IncomeIndex: undefined;
};

export type ExpensesStackParamList = {
  ExpensesList: undefined;
};

/**
 * Routes reachable from the More tab.
 *
 * `MoreRouteName` is what `roleConfig` may point at, so adding a More entry
 * without adding the screen is a type error.
 */
export type MoreStackParamList = {
  MoreIndex: undefined;
  Users: undefined;
  Categories: undefined;
  Vendors: undefined;
  Branches: undefined;
  Expenses: undefined;
  Closing: undefined;
  Sales: undefined;
  PartnerExpenses: undefined;
  SyncCenter: undefined;
  Settings: undefined;
  Help: undefined;
};

export type MoreRouteName = Exclude<keyof MoreStackParamList, 'MoreIndex'>;

/**
 * The root screen name inside each tab's stack.
 *
 * One record, read by three places that would otherwise disagree: `RoleTabs`
 * when it builds the stack, `linking.ts` when it maps a URL into it, and the
 * param lists above. When these drifted, the symptom was a deep link that
 * resolved to a route name no navigator had — silently doing nothing.
 */
export const TAB_ROOT_ROUTE = {
  Home: 'HomeIndex',
  Orders: 'OrdersList',
  Products: 'ProductsList',
  Reports: 'ReportsIndex',
  Sales: 'SalesList',
  Stock: 'StockList',
  Ledger: 'LedgerIndex',
  Income: 'IncomeIndex',
  Expenses: 'ExpensesList',
  More: 'MoreIndex',
} as const satisfies Record<AppTabName, string>;

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * The authenticated shell. The drawer is an account panel rather than a
 * navigation surface (see docs/navigation.md), so it holds exactly one screen:
 * the tabs.
 */
export type AppDrawerParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  FinanceSignIn: undefined;
  ForgotPassword: undefined;
};

declare global {
  namespace ReactNavigation {
    // Makes `useNavigation()` typed everywhere without a per-file generic.
    interface RootParamList extends AppTabParamList {}
  }
}
