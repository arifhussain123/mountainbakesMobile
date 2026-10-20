import type { IconName } from '@/shared/ui';
import { Routes } from './routes';

export type NavBadgeSource =
  | 'orders'
  | 'discounts'
  | 'events'
  | 'dailySale'
  | 'helpDesk'
  | 'returns'
  | 'productionStock'
  | 'approvals'
  | 'cashTransfers'
  | 'dailyClosing'
  | 'financeSettings'
  | 'supportCenter'
  | 'branchStockNegative'
  | 'recipientsTestMode'
  | 'suspiciousSignIns'
  | 'backupAlert'
  | 'restrictionAlert'
  | null;

type DrawerNavigation = { navigate: (...args: never[]) => void; closeDrawer: () => void };

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  group:
    | 'overview'
    | 'main'
    | 'work'
    | 'money'
    | 'endOfDay'
    | 'planning'
    | 'insights'
    | 'support'
    | 'books'
    | 'people'
    | 'partners'
    | 'setup'
    | 'salesOrders'
    | 'catalog'
    | 'branches'
    | 'planningInsights'
    | 'finance'
    | 'financePeople'
    | 'financeSetup'
    | 'admin';
  badgeSource: NavBadgeSource;
  /** Show the badge as an amber dot (a state, not a count) rather than a number. */
  badgeDot?: boolean;
  /**
   * `muted`: a count that is information, not a call to act (grey pill instead of orange).
   * `danger`: with `badgeDot`, the dot is red instead of amber.
   */
  badgeTone?: 'muted' | 'danger';
  /** Navigates via the drawer navigation prop. Kept here (not inlined in DrawerContent) so item order/config stays data, not UI code. */
  navigate: (navigation: DrawerNavigation) => void;
  /**
   * Which focused-route chain marks this item active — see `DrawerContent`'s
   * `getFocusedChain`. `leaf` pins it to one screen; `exceptLeaves` keeps it
   * active anywhere in `root` except those screens (Production Stock's own
   * prepare/adjust modals still read as Production Stock, Branch Stock does not).
   */
  activeMatch: { root: string; leaf?: string; exceptLeaves?: string[] };
}

const goToTab = (tabs: string, tab: string, screen?: string) => (navigation: DrawerNavigation) => {
  navigation.closeDrawer();
  (navigation.navigate as (name: string, params?: unknown) => void)(tabs, { screen: tab, params: screen ? { screen } : undefined });
};

const goToStack = (stack: string, screen?: string) => (navigation: DrawerNavigation) => {
  navigation.closeDrawer();
  (navigation.navigate as (name: string, params?: unknown) => void)(stack, screen ? { screen } : undefined);
};

/**
 * One config, in the web's own order. `group` exists so the drawer CAN show
 * section labels, but `DRAWER_GROUPED` below decides whether it actually does —
 * `design UIandUX/mountainbakesBranch.html`'s own "26 More" screen is a flat
 * list (see CLAUDE.md's superseded-on-visuals note), so that stays the default.
 *
 * No `permission` field: the server has no per-item permission list for any
 * role (checked — `SessionUser` carries one `role` string, and every route is
 * gated by `requireRole(...)` on that string alone). The per-role split is
 * `ROLE_SHELLS` (`roleShells.ts`), keyed by that server role — the same shape
 * as the web's own `NAV_MAP` (`frontend/src/utils/sidebar.ts`).
 */
export const BRANCH_NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard-grid',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.TABS, Routes.HOME_TAB),
    activeMatch: { root: Routes.HOME_TAB },
  },
  {
    key: 'orders',
    label: 'New Orders',
    icon: 'orders',
    group: 'main',
    badgeSource: 'orders',
    navigate: goToTab(Routes.TABS, Routes.ORDERS_TAB),
    activeMatch: { root: Routes.ORDERS_TAB },
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'sales',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.TABS, Routes.SALES_TAB),
    activeMatch: { root: Routes.SALES_TAB },
  },
  {
    key: 'stock',
    label: 'Stock',
    icon: 'stock',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.TABS, Routes.STOCK_TAB, Routes.STOCK_OVERVIEW),
    activeMatch: { root: Routes.STOCK_TAB, leaf: Routes.STOCK_OVERVIEW },
  },
  {
    key: 'returnStock',
    label: 'Return Stock',
    icon: 'rotate-ccw',
    group: 'main',
    badgeSource: null,
    navigate: goToTab(Routes.TABS, Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST),
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

/**
 * The web's `PRODUCTION_NAV`, item for item and in its order, under the
 * Overview / Work / Planning / Insights / Support sections. Production Stock
 * and Branch Stock share the Stock tab's stack (Branch Stock is a screen in
 * it), so Production Stock is matched by exclusion rather than by one leaf.
 */
export const PRODUCTION_NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard-grid',
    group: 'overview',
    badgeSource: null,
    navigate: goToTab(Routes.PRODUCTION_TABS, Routes.PRODUCTION_DASHBOARD_TAB),
    activeMatch: { root: Routes.PRODUCTION_DASHBOARD_TAB },
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: 'orders',
    group: 'work',
    badgeSource: 'orders',
    navigate: goToTab(Routes.PRODUCTION_TABS, Routes.PRODUCTION_ORDERS_TAB),
    activeMatch: { root: Routes.PRODUCTION_ORDERS_TAB },
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'sales',
    group: 'work',
    badgeSource: null,
    navigate: goToStack(Routes.PRODUCTION_SALES_STACK),
    activeMatch: { root: Routes.PRODUCTION_SALES_STACK },
  },
  {
    key: 'productionStock',
    label: 'Production Stock',
    icon: 'factory',
    group: 'work',
    badgeSource: 'productionStock',
    navigate: goToTab(Routes.PRODUCTION_TABS, Routes.PRODUCTION_STOCK_TAB, Routes.PRODUCTION_STOCK_OVERVIEW),
    activeMatch: { root: Routes.PRODUCTION_STOCK_TAB, exceptLeaves: [Routes.PRODUCTION_BRANCH_STOCK] },
  },
  {
    key: 'branchStock',
    label: 'Branch Stock',
    icon: 'layers',
    group: 'work',
    badgeSource: null,
    navigate: goToTab(Routes.PRODUCTION_TABS, Routes.PRODUCTION_STOCK_TAB, Routes.PRODUCTION_BRANCH_STOCK),
    activeMatch: { root: Routes.PRODUCTION_STOCK_TAB, leaf: Routes.PRODUCTION_BRANCH_STOCK },
  },
  {
    key: 'returns',
    label: 'Returns',
    icon: 'rotate-ccw',
    group: 'work',
    badgeSource: 'returns',
    navigate: goToTab(Routes.PRODUCTION_TABS, Routes.PRODUCTION_RETURNS_TAB),
    activeMatch: { root: Routes.PRODUCTION_RETURNS_TAB },
  },
  {
    key: 'discounts',
    label: 'Discounts',
    icon: 'percent',
    group: 'work',
    badgeSource: 'discounts',
    navigate: goToStack(Routes.PRODUCTION_DISCOUNTS_STACK),
    activeMatch: { root: Routes.PRODUCTION_DISCOUNTS_STACK },
  },
  {
    key: 'events',
    label: 'Events',
    icon: 'calendar',
    group: 'planning',
    badgeSource: null,
    navigate: goToStack(Routes.PRODUCTION_EVENTS_STACK),
    activeMatch: { root: Routes.PRODUCTION_EVENTS_STACK },
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'bar-chart',
    group: 'insights',
    badgeSource: null,
    navigate: goToStack(Routes.PRODUCTION_REPORTS_STACK),
    activeMatch: { root: Routes.PRODUCTION_REPORTS_STACK },
  },
  {
    key: 'helpDesk',
    label: 'Help Desk',
    icon: 'headset',
    group: 'support',
    badgeSource: 'helpDesk',
    navigate: goToStack(Routes.PRODUCTION_HELP_DESK_STACK),
    activeMatch: { root: Routes.PRODUCTION_HELP_DESK_STACK },
  },
];

const openComingSoon = (title: string) => (navigation: DrawerNavigation) => {
  navigation.closeDrawer();
  (navigation.navigate as (name: string, params?: unknown) => void)(Routes.COMING_SOON, { title });
};

/**
 * The four finance roles' menu (finance_admin/finance_manager/accountant/
 * finance_auditor share one shell — the server gates each finance endpoint by
 * `requireFinance(permission)`, and the screens themselves hide the write
 * actions a role can't take). Labels stay one line, so the web's "Company
 * Transaction Details" is shortened here; the screen keeps the full title.
 *
 * Approvals has no mobile inbox yet (`GET /finance/pending-approvals` is
 * wired, the screen isn't), so it opens Coming Soon while its badge still
 * shows the real pending count.
 */
export const FINANCE_NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard-grid',
    group: 'overview',
    badgeSource: null,
    navigate: goToTab(Routes.FINANCE_TABS, Routes.FINANCE_DASHBOARD_TAB),
    activeMatch: { root: Routes.FINANCE_DASHBOARD_TAB },
  },
  {
    key: 'approvals',
    label: 'Approvals',
    icon: 'inbox-check',
    group: 'overview',
    badgeSource: 'approvals',
    navigate: openComingSoon('Approvals'),
    activeMatch: { root: Routes.COMING_SOON },
  },
  {
    key: 'dailyLedger',
    label: 'Daily Ledger',
    icon: 'book-open',
    group: 'books',
    badgeSource: null,
    navigate: goToTab(Routes.FINANCE_TABS, Routes.FINANCE_LEDGER_TAB),
    activeMatch: { root: Routes.FINANCE_LEDGER_TAB },
  },
  {
    key: 'cashTransfers',
    label: 'Cash Transfers',
    icon: 'banknote',
    group: 'books',
    badgeSource: 'cashTransfers',
    navigate: goToStack(Routes.FINANCE_CASH_TRANSFERS_STACK, Routes.FINANCE_CASH_TRANSFERS_LIST),
    activeMatch: { root: Routes.FINANCE_CASH_TRANSFERS_STACK },
  },
  {
    key: 'incomeExpense',
    label: 'Income & Expense',
    icon: 'wallet',
    group: 'books',
    badgeSource: null,
    navigate: goToTab(Routes.FINANCE_TABS, Routes.FINANCE_INCOME_EXPENSE_TAB),
    activeMatch: { root: Routes.FINANCE_INCOME_EXPENSE_TAB },
  },
  {
    key: 'dailyClosing',
    label: 'Daily Closing',
    icon: 'calendar-check',
    group: 'books',
    badgeSource: 'dailyClosing',
    badgeDot: true,
    navigate: goToStack(Routes.FINANCE_CLOSING_STACK),
    activeMatch: { root: Routes.FINANCE_CLOSING_STACK },
  },
  {
    key: 'payroll',
    label: 'Payroll',
    icon: 'user-coin',
    group: 'people',
    badgeSource: null,
    navigate: goToTab(Routes.FINANCE_TABS, Routes.FINANCE_PAYROLL_TAB, Routes.FINANCE_PAYROLL_LIST),
    activeMatch: { root: Routes.FINANCE_PAYROLL_TAB, exceptLeaves: [Routes.FINANCE_SALARY_LEDGER] },
  },
  {
    key: 'salaryLedger',
    label: 'Salary Ledger',
    icon: 'table',
    group: 'people',
    badgeSource: null,
    navigate: goToTab(Routes.FINANCE_TABS, Routes.FINANCE_PAYROLL_TAB, Routes.FINANCE_SALARY_LEDGER),
    activeMatch: { root: Routes.FINANCE_PAYROLL_TAB, leaf: Routes.FINANCE_SALARY_LEDGER },
  },
  {
    key: 'partnerTransactions',
    label: 'Partner Transactions',
    icon: 'handshake',
    group: 'partners',
    badgeSource: null,
    navigate: goToStack(Routes.FINANCE_PARTNERS_STACK),
    activeMatch: { root: Routes.FINANCE_PARTNERS_STACK },
  },
  {
    key: 'companyTransactions',
    label: 'Company Transactions',
    icon: 'bank',
    group: 'partners',
    badgeSource: null,
    navigate: goToStack(Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK),
    activeMatch: { root: Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK },
  },
  {
    key: 'ledgerHeads',
    label: 'Ledger Heads',
    icon: 'list-indent',
    group: 'setup',
    badgeSource: null,
    navigate: goToStack(Routes.FINANCE_LEDGER_HEADS_STACK),
    activeMatch: { root: Routes.FINANCE_LEDGER_HEADS_STACK },
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'bar-chart',
    group: 'setup',
    badgeSource: null,
    navigate: goToStack(Routes.FINANCE_REPORTS_STACK),
    activeMatch: { root: Routes.FINANCE_REPORTS_STACK },
  },
  {
    key: 'auditTrail',
    label: 'Audit Trail',
    icon: 'shield-check',
    group: 'setup',
    badgeSource: null,
    navigate: goToStack(Routes.FINANCE_AUDIT_TRAIL_STACK),
    activeMatch: { root: Routes.FINANCE_AUDIT_TRAIL_STACK },
  },
  {
    key: 'helpDesk',
    label: 'Help Desk',
    icon: 'headset',
    group: 'setup',
    badgeSource: 'helpDesk',
    navigate: goToStack(Routes.FINANCE_HELP_DESK_STACK),
    activeMatch: { root: Routes.FINANCE_HELP_DESK_STACK },
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
    group: 'setup',
    badgeSource: 'financeSettings',
    badgeDot: true,
    navigate: goToStack(Routes.FINANCE_SETTINGS_STACK),
    activeMatch: { root: Routes.FINANCE_SETTINGS_STACK },
  },
];

const superAdminItem = (
  key: string,
  label: string,
  icon: IconName,
  group: NavItem['group'],
  target:
    | { tab: string }
    // `screen` opens that screen of the stack; `match` narrows which of its screens mark the row active.
    | { stack: string; screen?: string; match?: Omit<NavItem['activeMatch'], 'root'> }
    | 'comingSoon',
  badge: Pick<NavItem, 'badgeSource' | 'badgeDot' | 'badgeTone'> = { badgeSource: null },
): NavItem => {
  if (target === 'comingSoon') {
    return { key, label, icon, group, ...badge, navigate: openComingSoon(label), activeMatch: { root: Routes.COMING_SOON } };
  }
  if ('tab' in target) {
    return { key, label, icon, group, ...badge, navigate: goToTab(Routes.SUPER_ADMIN_TABS, target.tab), activeMatch: { root: target.tab } };
  }
  return {
    key,
    label,
    icon,
    group,
    ...badge,
    navigate: goToStack(target.stack, target.screen),
    activeMatch: { root: target.stack, ...target.match },
  };
};

/**
 * The web's super-admin sidebar, in its order, under eight sections, plus the
 * finance pages the web lets super_admin open (two more sections). Thirty-one
 * rows can't fit a phone at 40dp, so this shell's drawer collapses sections
 * (`collapsibleSections` in `roleShells.ts`).
 *
 * The web sidebar's rows open Super Admin's own screens (`features/admin`),
 * built to show what the matching web Super Admin page shows. The finance
 * rows after Finance Ledger open the Finance role's screens, which are
 * read-only for super_admin until Finance Settings' "Allow Super Admin to
 * modify" is on — the web's `useFinanceAbilities` and the API's
 * `requireFinance` decide from the same toggle.
 */
export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  superAdminItem('dashboard', 'Dashboard', 'grid', 'overview', { tab: Routes.SUPER_ADMIN_DASHBOARD_TAB }),
  superAdminItem('orders', 'Orders', 'cart', 'salesOrders', { tab: Routes.SUPER_ADMIN_ORDERS_TAB }, { badgeSource: 'orders' }),
  superAdminItem('customers', 'Customers', 'users', 'salesOrders', { stack: Routes.SUPER_ADMIN_CUSTOMERS }),
  superAdminItem('dailySaleRecords', 'Daily Sale Records', 'scales', 'salesOrders', { stack: Routes.SUPER_ADMIN_DAILY_SALE }, { badgeSource: 'dailySale', badgeTone: 'muted' }),
  superAdminItem('products', 'Products', 'box', 'catalog', { stack: Routes.SUPER_ADMIN_PRODUCTS }),
  superAdminItem('categories', 'Categories', 'tag', 'catalog', { stack: Routes.SUPER_ADMIN_CATEGORIES }),
  superAdminItem('priceList', 'Price List', 'file-list', 'catalog', { stack: Routes.SUPER_ADMIN_PRICE_LIST }),
  superAdminItem('priceHistory', 'Price History', 'history-clock', 'catalog', { stack: Routes.PRICE_HISTORY_STACK }),
  superAdminItem('branches', 'Branches', 'store', 'branches', { stack: Routes.SUPER_ADMIN_BRANCHES }),
  superAdminItem('branchLocations', 'Branch Locations', 'map-pin', 'branches', { stack: Routes.SUPER_ADMIN_BRANCH_LOCATIONS }),
  superAdminItem('branchStock', 'Branch Stock', 'boxes', 'branches', { tab: Routes.SUPER_ADMIN_BRANCH_STOCK_TAB }, {
    badgeSource: 'branchStockNegative',
    badgeDot: true,
    badgeTone: 'danger',
  }),
  superAdminItem('specialEvents', 'Special Events', 'calendar', 'planningInsights', { stack: Routes.SUPER_ADMIN_EVENTS_STACK }, { badgeSource: 'events' }),
  superAdminItem('reports', 'Reports', 'bar-chart', 'planningInsights', { tab: Routes.SUPER_ADMIN_REPORTS_TAB }),
  superAdminItem('financeLedger', 'Finance Ledger', 'book-open', 'finance', { stack: Routes.SUPER_ADMIN_LEDGER_STACK }, { badgeSource: 'approvals', badgeTone: 'muted' }),
  // The web's other finance pages (super_admin passes `canAccessFinance`), in
  // the Finance shell's own grouping and order — three short sections rather
  // than one of twelve, so an open Finance section still fits a 360×800 phone.
  superAdminItem('financeCashTransfers', 'Cash Transfers', 'banknote', 'finance', {
    stack: Routes.FINANCE_CASH_TRANSFERS_STACK,
    screen: Routes.FINANCE_CASH_TRANSFERS_LIST,
  }),
  superAdminItem('financeEntries', 'Income & Expense', 'wallet', 'finance', { stack: Routes.SUPER_ADMIN_FINANCE_ENTRIES }),
  superAdminItem('financeClosing', 'Daily Closing', 'calendar-check', 'finance', { stack: Routes.FINANCE_CLOSING_STACK }),
  superAdminItem('financePayroll', 'Payroll', 'user-coin', 'financePeople', {
    stack: Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK,
    screen: Routes.FINANCE_PAYROLL_LIST,
    match: { exceptLeaves: [Routes.FINANCE_SALARY_LEDGER] },
  }),
  superAdminItem('financeSalaries', 'Salary Ledger', 'table', 'financePeople', {
    stack: Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK,
    screen: Routes.FINANCE_SALARY_LEDGER,
    match: { leaf: Routes.FINANCE_SALARY_LEDGER },
  }),
  superAdminItem('financePartnerTransactions', 'Partner Transactions', 'handshake', 'financePeople', { stack: Routes.FINANCE_PARTNERS_STACK }),
  superAdminItem('financeCompanyTransactions', 'Company Transactions', 'bank', 'financePeople', { stack: Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK }),
  superAdminItem('financeHeads', 'Ledger Heads', 'list-indent', 'financeSetup', { stack: Routes.FINANCE_LEDGER_HEADS_STACK }),
  superAdminItem('financeReports', 'Finance Reports', 'trending-up', 'financeSetup', { stack: Routes.FINANCE_REPORTS_STACK }),
  superAdminItem('financeAudit', 'Audit Trail', 'clock', 'financeSetup', { stack: Routes.FINANCE_AUDIT_TRAIL_STACK }),
  superAdminItem('financeSettings', 'Finance Settings', 'settings', 'financeSetup', { stack: Routes.FINANCE_SETTINGS_STACK }),
  superAdminItem('supportCenter', 'Support Center', 'life-buoy', 'support', { stack: Routes.SUPER_ADMIN_SUPPORT_STACK }, { badgeSource: 'supportCenter' }),
  superAdminItem('recipients', 'Recipients', 'send', 'support', { stack: Routes.RECIPIENTS_STACK }, { badgeSource: 'recipientsTestMode', badgeDot: true }),
  superAdminItem('users', 'Users', 'user-group', 'admin', { stack: Routes.SUPER_ADMIN_USERS }, { badgeSource: 'suspiciousSignIns', badgeDot: true, badgeTone: 'danger' }),
  superAdminItem('security', 'Security', 'shield-check', 'admin', { stack: Routes.SUPER_ADMIN_SECURITY }),
  superAdminItem('databaseBackup', 'Database Backup', 'database', 'admin', { stack: Routes.SUPER_ADMIN_BACKUP }, { badgeSource: 'backupAlert', badgeDot: true, badgeTone: 'danger' }),
  superAdminItem('settings', 'Settings', 'settings', 'admin', { stack: Routes.SUPER_ADMIN_SETTINGS }, { badgeSource: 'restrictionAlert', badgeDot: true }),
];

/** True when the focused-route chain (see `DrawerContent.getFocusedChain`) means this item is the active one. */
export function isNavItemActive(item: NavItem, chain: string[]): boolean {
  if (!chain.includes(item.activeMatch.root)) return false;
  const leaf = chain[chain.length - 1];
  if (item.activeMatch.leaf) return leaf === item.activeMatch.leaf;
  if (item.activeMatch.exceptLeaves && leaf) return !item.activeMatch.exceptLeaves.includes(leaf);
  return true;
}

export const GROUP_LABEL: Record<NavItem['group'], string> = {
  overview: 'Overview',
  main: 'Main',
  work: 'Work',
  money: 'Money',
  endOfDay: 'End of day',
  planning: 'Planning',
  insights: 'Insights',
  support: 'Support',
  books: 'Books',
  people: 'People',
  partners: 'Partners',
  setup: 'Setup & review',
  salesOrders: 'Sales & orders',
  catalog: 'Catalog',
  branches: 'Branches',
  planningInsights: 'Planning & insights',
  finance: 'Finance',
  financePeople: 'Payroll & partners',
  financeSetup: 'Finance setup & review',
  admin: 'Admin',
};

/** The "3D slide-back" drawer redesign groups items under section labels (MAIN/MONEY/END OF DAY/PLANNING/SUPPORT) — flip back to `false` to return to a flat list. */
export const DRAWER_GROUPED = true;
