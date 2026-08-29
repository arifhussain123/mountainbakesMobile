import type { NavigatorScreenParams } from '@react-navigation/native';
import type { WriteOutcome } from '@/api/sync/writeOutcome';

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
  | 'Preparation'
  | 'Delivery'
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
  Preparation: NavigatorScreenParams<PreparationStackParamList> | undefined;
  Delivery: NavigatorScreenParams<DeliveryStackParamList> | undefined;
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

/**
 * The register, with the till presented over it.
 *
 * `SalesList` takes params because a finished sale has to be *reported*, and
 * the screen that reports it is the register rather than the form dismissing
 * itself. The outcome is the message and the reason is the server's own words
 * when it refused; both are plain data, so the param stays serializable.
 */
export type SalesStackParamList = {
  SalesList: { outcome?: WriteOutcome; reason?: string } | undefined;
  NewSale: undefined;
};

export type StockStackParamList = {
  StockList: undefined;
  /**
   * Returning stock to production. A modal: it is a short act that ends by
   * returning to the balances it was reconciled against.
   */
  StockReturn: undefined;
  /**
   * The branch **ledger**, day by day — a different resource from `StockList`,
   * which is per product for one day.
   *
   * Pushed rather than presented modally: it is somewhere you go and read, and
   * `StockDay` opens on top of it, which a modal cannot host without stacking
   * two sheets.
   */
  StockHistory: undefined;
  /**
   * One business day of that ledger as a statement. `date` is optional because
   * the screen opens on today and steps from there; it is a param so a
   * notification or a deep link can land on the day it is about.
   */
  StockDay: { date?: string } | undefined;
};

/**
 * The two production-floor stages, and why they are tabs rather than filters on
 * Orders.
 *
 * They are different resources, not two views of one. Preparation is the
 * `production` resource — `GET /api/production/queue` and `PUT
 * /api/production/:id/status`, whose statuses are `pending | preparing | ready`.
 * Delivery is the `production_orders` resource — the branch demands central
 * production dispatches, whose statuses are `pending | awaiting_verification |
 * verified | approved | rejected | cancelled`. Two enums, two endpoints, two
 * jobs on the floor; folding them into one list means a filter chip that
 * silently changes which API is being written to.
 */
export type PreparationStackParamList = {
  PreparationQueue: undefined;
};

export type DeliveryStackParamList = {
  DeliveryList: undefined;
};

export type ProductsStackParamList = {
  ProductsList: undefined;
  ProductDetail: { productId: string };
  /**
   * Create when `productId` is absent, edit when it is present.
   *
   * One screen rather than two: the fields are identical except that price is
   * settable only at creation — after that a price moves through PriceChange,
   * which records history. Two screens would be two places to forget that.
   */
  ProductForm: { productId?: string } | undefined;
  PriceChange: { productId: string };
  PriceHistory: { productId: string };
};

/**
 * Reports and the three statements reached from it.
 *
 * They are **detail screens, not destinations**: nothing in `roleConfig` points
 * at them, and the only way in is the index. That keeps the single-path rule
 * intact while giving each of the three the whole screen it needs — a day's
 * takings, a ranking and a period comparison do not fit as three more cards on
 * an index that already carries a range filter and four breakdowns.
 */
export type ReportsStackParamList = {
  ReportsIndex: undefined;
  /** One business day of takings, reconciled: tender split, by hour, top sellers. */
  DailySales: undefined;
  /** What sold, ranked by units or by revenue, with a share bar. */
  TopProducts: undefined;
  /** Money in against money out, with the expense split under it. */
  SalesVsExpenses: undefined;
};

/** The three, named once so the tab stack and the More stack cannot disagree. */
export const REPORT_DETAIL_SCREENS = [
  'DailySales',
  'TopProducts',
  'SalesVsExpenses',
] as const satisfies readonly (keyof ReportsStackParamList)[];

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
  Sales: undefined;
  Stock: undefined;
  Reports: undefined;
  Expenses: undefined;
  Production: undefined;
  /**
   * Returns waiting on the production counter.
   *
   * Production and admin only — `/api/production-returns` is behind
   * `requireRole('super_admin', 'production_user')` and 403s a branch outright.
   * A branch's own returns are a different path with no list endpoint; they are
   * read off the stock ledger.
   */
  Returns: undefined;
  Closing: undefined;
  /**
   * Branch discount CLAIMS — money asked back against a demand that arrived
   * damaged, short or wrong. Not the per-line discount on a sale, and not a
   * stock return; all three are separate resources.
   *
   * Branch-side only. `/api/branch-discounts` is mounted behind
   * `requireRole(super_admin, ...BRANCH_ROLES)`, and Production's review board
   * is a different router a branch role is 403'd from at the mount.
   */
  Discounts: undefined;
  PartnerExpenses: undefined;
  SyncCenter: undefined;
  Notifications: undefined;
  Settings: undefined;
  /**
   * Special events. A More row for **every** role, not an admin screen:
   * `GET /api/special-events` is behind `authenticate` alone and scopes its rows
   * server-side, so a branch sees the events it takes part in and nothing else.
   */
  Events: undefined;
  Help: undefined;
  Profile: undefined;
  /**
   * Detail screens, NOT menu destinations.
   *
   * They live in this stack because the resource they edit is reached from More,
   * but nothing in `roleConfig` may point at them — a More row is a top-level
   * place to go, and "the edit form for the thing you just tapped" is not one.
   * `MoreRouteName` excludes them below so that stays a compile error rather
   * than a convention.
   */
  UserForm: { userId?: string } | undefined;
  CategoryForm: { categoryId?: string } | undefined;
};

export type MoreRouteName = Exclude<
  keyof MoreStackParamList,
  'MoreIndex' | 'UserForm' | 'CategoryForm'
>;

/**
 * Detail screens registered alongside a More destination.
 *
 * Keyed by the destination that owns them, so a role that cannot reach Users
 * does not get `UserForm` registered either — an unreachable screen in the
 * navigator is a route a deep link could still land on.
 */
export const MORE_DETAIL_SCREENS: Partial<Record<MoreRouteName, readonly string[]>> = {
  Users: ['UserForm'],
  Categories: ['CategoryForm'],
  /**
   * Reports is a **More row** for the branch roles and a **tab** for the admin,
   * so its three statements have to be registered in two navigators. Both read
   * `REPORT_DETAIL_SCREENS` rather than listing them, or the branch would
   * eventually be able to reach a statement the admin could not.
   */
  Reports: REPORT_DETAIL_SCREENS,
};

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
  Preparation: 'PreparationQueue',
  Delivery: 'DeliveryList',
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
