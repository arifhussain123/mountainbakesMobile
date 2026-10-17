import type { IconName } from '@/shared/ui';
import { Routes } from './routes';

export type NavBadgeSource = 'orders' | 'discounts' | 'events' | 'dailySale' | 'helpDesk' | null;

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  group: 'main' | 'money' | 'endOfDay' | 'planning' | 'support';
  badgeSource: NavBadgeSource;
  /** Navigates via the drawer navigation prop. Kept here (not inlined in DrawerContent) so item order/config stays data, not UI code. */
  navigate: (navigation: { navigate: (...args: never[]) => void; closeDrawer: () => void }) => void;
  /** Which focused-route chain marks this item active — see `DrawerContent`'s `getFocusedChain`. */
  activeMatch: { root: string; leaf?: string };
}

const goToTab = (tab: string, screen?: string) => (navigation: { navigate: (...args: never[]) => void; closeDrawer: () => void }) => {
  navigation.closeDrawer();
  (navigation.navigate as (name: string, params?: unknown) => void)(Routes.TABS, { screen: tab, params: screen ? { screen } : undefined });
};

const goToStack = (stack: string, screen?: string) => (navigation: { navigate: (...args: never[]) => void; closeDrawer: () => void }) => {
  navigation.closeDrawer();
  (navigation.navigate as (name: string, params?: unknown) => void)(stack, screen ? { screen } : undefined);
};

/**
 * One config, in the web's own order. `group` exists so the drawer CAN show
 * section labels, but `DRAWER_GROUPED` below decides whether it actually does —
 * `design UIandUX/mountainbakesBranch.html`'s own "26 More" screen is a flat
 * list (see CLAUDE.md's superseded-on-visuals note), so that stays the default.
 *
 * No `permission` field: the server has no per-item permission list for a
 * branch_manager (checked — just one `role` string), and the role-level split
 * already happens one level up (RootNavigator picks an entirely different
 * drawer shell per role). Every item here is visible to every branch_manager.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard-grid',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.HOME_TAB),
    activeMatch: { root: Routes.HOME_TAB },
  },
  {
    key: 'orders',
    label: 'New Orders',
    icon: 'orders',
    group: 'main',
    badgeSource: 'orders',
    navigate: goToTab(Routes.ORDERS_TAB),
    activeMatch: { root: Routes.ORDERS_TAB },
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'sales',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.SALES_TAB),
    activeMatch: { root: Routes.SALES_TAB },
  },
  {
    key: 'stock',
    label: 'Stock',
    icon: 'stock',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.STOCK_TAB, Routes.STOCK_OVERVIEW),
    activeMatch: { root: Routes.STOCK_TAB, leaf: Routes.STOCK_OVERVIEW },
  },
  {
    key: 'returnStock',
    label: 'Return Stock',
    icon: 'rotate-ccw',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST),
    activeMatch: { root: Routes.STOCK_TAB, leaf: Routes.RETURN_STOCK_LIST },
  },
  {
    key: 'discounts',
    label: 'Discounts',
    icon: 'percent',
    group: 'money',
    badgeSource: 'discounts',
    navigate: goToStack(Routes.DISCOUNTS_STACK),
    activeMatch: { root: Routes.DISCOUNTS_STACK },
  },
  {
    key: 'cash',
    label: 'Cash Deposits',
    icon: 'wallet',
    group: 'money',
    badgeSource: null,
    navigate: goToStack(Routes.CASH_STACK),
    activeMatch: { root: Routes.CASH_STACK },
  },
  {
    key: 'expenses',
    label: 'Shop Expenses',
    icon: 'receipt',
    group: 'money',
    badgeSource: null,
    navigate: goToStack(Routes.EXPENSES_STACK),
    activeMatch: { root: Routes.EXPENSES_STACK },
  },
  {
    key: 'events',
    label: 'Events',
    icon: 'calendar',
    group: 'planning',
    badgeSource: 'events',
    navigate: goToStack(Routes.EVENTS_STACK),
    activeMatch: { root: Routes.EVENTS_STACK },
  },
  {
    key: 'branchClosing',
    label: 'Branch Closing',
    icon: 'calendar-check',
    group: 'endOfDay',
    badgeSource: null,
    navigate: goToStack(Routes.CLOSING_STACK, Routes.BRANCH_CLOSING),
    activeMatch: { root: Routes.CLOSING_STACK, leaf: Routes.BRANCH_CLOSING },
  },
  {
    key: 'dailySaleRecord',
    label: 'Daily Sale Record',
    icon: 'scales',
    group: 'endOfDay',
    badgeSource: 'dailySale',
    navigate: goToStack(Routes.CLOSING_STACK, Routes.DAILY_SALE_RECORD),
    activeMatch: { root: Routes.CLOSING_STACK, leaf: Routes.DAILY_SALE_RECORD },
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'bar-chart',
    group: 'planning',
    badgeSource: null,
    navigate: goToStack(Routes.REPORTS_STACK),
    activeMatch: { root: Routes.REPORTS_STACK },
  },
  {
    key: 'helpDesk',
    label: 'Help Desk',
    icon: 'headset',
    group: 'support',
    badgeSource: 'helpDesk',
    navigate: goToStack(Routes.HELP_DESK_STACK),
    activeMatch: { root: Routes.HELP_DESK_STACK },
  },
];

/** True when the focused-route chain (see `DrawerContent.getFocusedChain`) means this item is the active one. */
export function isNavItemActive(item: NavItem, chain: string[]): boolean {
  if (!chain.includes(item.activeMatch.root)) return false;
  return item.activeMatch.leaf ? chain[chain.length - 1] === item.activeMatch.leaf : true;
}

export const GROUP_LABEL: Record<NavItem['group'], string> = {
  main: 'Main',
  money: 'Money',
  endOfDay: 'End of day',
  planning: 'Planning',
  support: 'Support',
};

/** The "3D slide-back" drawer redesign groups items under section labels (MAIN/MONEY/END OF DAY/PLANNING/SUPPORT) — flip back to `false` to return to a flat list. */
export const DRAWER_GROUPED = true;
