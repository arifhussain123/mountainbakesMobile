import type { IconName } from '@/shared/ui';
import type { NavBadgeSource } from './navItems';
import { Routes } from './routes';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  /** A `BottomTabParamList` route name, or `null` for "More" (opens the drawer, never becomes active). */
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
 * No permission filtering happens here today: confirmed in the Drawer task's
 * Step 0 that a branch_manager carries no per-item permission list, just one
 * role string, and the role-level split already happens above this (a
 * different role gets an entirely different tab navigator). The brief's "tab
 * the user lacks permission for is replaced" rule has nothing to filter
 * against yet — `TAB_ITEMS` is exported as a plain array rather than a
 * filtering function so that remains a one-line change if a real permission
 * list appears later.
 */
export const TAB_ITEMS: TabItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', route: Routes.HOME_TAB, badgeSource: null },
  { key: 'orders', label: 'Orders', icon: 'orders', route: Routes.ORDERS_TAB, badgeSource: 'orders' },
  { key: 'sales', label: 'Sales', icon: 'sales', route: Routes.SALES_TAB, badgeSource: null },
  { key: 'stock', label: 'Stock', icon: 'stock', route: Routes.STOCK_TAB, badgeSource: null },
  { key: 'more', label: 'More', icon: 'more', route: null, badgeSource: null },
];
