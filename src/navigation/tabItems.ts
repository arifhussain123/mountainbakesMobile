import type { IconName } from '@/shared/ui';
import type { NavBadgeSource } from './navItems';
import { Routes } from './routes';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  /** A bottom-tab route name, or `null` for "More" (opens the drawer, never becomes active). */
  route: string | null;
  badgeSource: NavBadgeSource;
}

/**
 * The 5 tabs, in the design file's own order (Home, Orders, Sales, Stock,
 * More — see `BottomTabNavigator`'s existing comment on why this supersedes
 * CLAUDE.md's listed order). Icons match the app's established, design-file-
 * matched set (`home`/`orders`/`sales`/`stock`/`more`) rather than generic
 * clipboard/cart glyphs.
 *
 * No permission filtering happens here: the server carries no per-item
 * permission list, just one role string, and the role-level split is
 * `ROLE_SHELLS` (`roleShells.ts`), which picks one of these arrays per role.
 */
export const BRANCH_TAB_ITEMS: TabItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', route: Routes.HOME_TAB, badgeSource: null },
  { key: 'orders', label: 'Orders', icon: 'orders', route: Routes.ORDERS_TAB, badgeSource: 'orders' },
  { key: 'sales', label: 'Sales', icon: 'sales', route: Routes.SALES_TAB, badgeSource: null },
  { key: 'stock', label: 'Stock', icon: 'stock', route: Routes.STOCK_TAB, badgeSource: null },
  { key: 'more', label: 'More', icon: 'more', route: null, badgeSource: null },
];

/**
 * Production's daily drivers: approve demands, watch the pool, review returns.
 * Sales moves behind More (the web keeps it in its primary four; on the phone
 * the returns queue is the more frequent task). Branch Stock is a screen
 * inside the Production Stock tab, reached from the drawer. "Production Stock"
 * is the only label long enough to wrap; `TabItem` gives it a second line.
 */
export const PRODUCTION_TAB_ITEMS: TabItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', route: Routes.PRODUCTION_DASHBOARD_TAB, badgeSource: null },
  { key: 'orders', label: 'Orders', icon: 'orders', route: Routes.PRODUCTION_ORDERS_TAB, badgeSource: 'orders' },
  { key: 'productionStock', label: 'Production Stock', icon: 'factory', route: Routes.PRODUCTION_STOCK_TAB, badgeSource: 'productionStock' },
  { key: 'returns', label: 'Returns', icon: 'rotate-ccw', route: Routes.PRODUCTION_RETURNS_TAB, badgeSource: 'returns' },
  { key: 'more', label: 'More', icon: 'more', route: null, badgeSource: null },
];

/**
 * Finance's daily screens — Dashboard, Daily Ledger, Cash Transfers, Income &
 * Expense ("Reports" on the bar, matching the reference), More — on the same
 * notch bar as Branch and Production. Transfers carries the pending-transfers
 * count that the drawer's Cash Transfers row shows.
 */
export const FINANCE_TAB_ITEMS: TabItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', route: Routes.FINANCE_DASHBOARD_TAB, badgeSource: null },
  { key: 'ledger', label: 'Ledger', icon: 'ledger', route: Routes.FINANCE_LEDGER_TAB, badgeSource: null },
  { key: 'transfers', label: 'Transfers', icon: 'transfer', route: Routes.FINANCE_CASH_TRANSFERS_TAB, badgeSource: 'cashTransfers' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart', route: Routes.FINANCE_INCOME_EXPENSE_TAB, badgeSource: null },
  { key: 'more', label: 'More', icon: 'more', route: null, badgeSource: null },
];
