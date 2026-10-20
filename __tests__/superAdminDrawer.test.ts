/**
 * @format
 */
import { financeCan, getBusinessDate, queryClient, queryKeys } from '@/api';
import { OPEN_CASH_TRANSFERS_TARGET, PENDING_REVIEW_TARGET } from '@/features/admin/utils/ledgerActions';
import type { BackupHealth, ProductionOrderListResponse } from '@/api';
import {
  SEARCH_FIELD_HEIGHT,
  computeAvailableListHeight,
  computeCollapsibleRowMetrics,
  fitsAtMinimum,
} from '@/navigation/components/drawerLayout';
import {
  collapseSection,
  effectiveExpanded,
  expandSection,
  filterRows,
  initialExpanded,
  pinnedSections,
  sectionOrder,
  summarizeSection,
  type SectionRow,
} from '@/navigation/components/drawerSections';
import { computeSuperAdminBadges } from '@/navigation/navBadgeCounts';
import { GROUP_LABEL, SUPER_ADMIN_NAV_ITEMS, isNavItemActive, type NavItem } from '@/navigation/navItems';
import { ROLE_SHELLS, getRoleShell } from '@/navigation/roleShells';
import { Routes } from '@/navigation/routes';

const shell = ROLE_SHELLS.super_admin!;

/** The route names an item's `navigate` touches: the drawer screen, then the nested tab/stack screens. */
function targetsOf(item: NavItem): string[] {
  const navigate = jest.fn();
  item.navigate({ navigate, closeDrawer: jest.fn() } as never);
  const [name, params] = navigate.mock.calls[0] as [string, { screen?: string } | undefined];
  return [name, params?.screen].filter((r): r is string => !!r);
}

/** The drawer rows as `DrawerContent` builds them, with `activeKey` marked active. */
function rowsFor(activeKey: string | null): SectionRow[] {
  return SUPER_ADMIN_NAV_ITEMS.map((i) => ({
    label: i.label,
    section: GROUP_LABEL[i.group],
    active: i.key === activeKey,
    badgeDot: i.badgeDot,
    badgeTone: i.badgeTone,
  }));
}

// Typical Android 3-button nav insets (24 top / 48 bottom), as drawerLayout.test.ts uses.
const listHeight = (height: number) => computeAvailableListHeight(height, 24, 48) - SEARCH_FIELD_HEIGHT;

describe('Super Admin shell', () => {
  it('gets its own drawer, says "All branches", and is the only shell whose sections fold', () => {
    expect(getRoleShell('super_admin').route).toBe(Routes.SUPER_ADMIN_DRAWER);
    expect(shell.contextLine({ role: 'super_admin', branchName: null })).toBe('All branches');
    expect(shell.collapsibleSections).toBe(true);
    for (const role of ['branch_manager', 'production_user', 'finance_admin'] as const) expect(ROLE_SHELLS[role]!.collapsibleSections).toBeFalsy();
  });

  it('is the 20 web items, in order, under the eight sections, then the web\'s finance pages under two more', () => {
    const bySection: Record<string, string[]> = {};
    for (const item of SUPER_ADMIN_NAV_ITEMS) (bySection[GROUP_LABEL[item.group]] ??= []).push(item.label);
    expect(bySection).toEqual({
      Overview: ['Dashboard'],
      'Sales & orders': ['Orders', 'Customers', 'Daily Sale Records'],
      Catalog: ['Products', 'Categories', 'Price List', 'Price History'],
      Branches: ['Branches', 'Branch Locations', 'Branch Stock'],
      'Planning & insights': ['Special Events', 'Reports'],
      Finance: ['Finance Ledger', 'Cash Transfers', 'Income & Expense', 'Daily Closing'],
      'Payroll & partners': ['Payroll', 'Salary Ledger', 'Partner Transactions', 'Company Transactions'],
      'Finance setup & review': ['Ledger Heads', 'Finance Reports', 'Audit Trail', 'Finance Settings'],
      Support: ['Support Center', 'Recipients'],
      Admin: ['Users', 'Security', 'Database Backup', 'Settings'],
    });
    expect(Object.keys(bySection)).toEqual(sectionOrder(rowsFor(null)));
    expect(SUPER_ADMIN_NAV_ITEMS).toHaveLength(31);
    expect(new Set(SUPER_ADMIN_NAV_ITEMS.map((i) => i.key)).size).toBe(31);
  });

  it("uses the brief's icons", () => {
    expect(SUPER_ADMIN_NAV_ITEMS.map((i) => i.icon)).toEqual([
      'grid',
      'cart',
      'users',
      'scales',
      'box',
      'tag',
      'file-list',
      'history-clock',
      'store',
      'map-pin',
      'boxes',
      'calendar',
      'bar-chart',
      'book-open',
      'banknote',
      'wallet',
      'calendar-check',
      'user-coin',
      'table',
      'handshake',
      'bank',
      'list-indent',
      'trending-up',
      'clock',
      'settings',
      'life-buoy',
      'send',
      'user-group',
      'shield-check',
      'database',
      'settings',
    ]);
  });

  it('has Dashboard, Orders, Branch Stock, Reports and More on the tab bar', () => {
    expect(shell.tabItems.map((t) => t.label)).toEqual(['Dashboard', 'Orders', 'Branch Stock', 'Reports', 'More']);
    expect(shell.tabItems.at(-1)!.route).toBeNull();
    expect(shell.tabItems.find((t) => t.key === 'orders')!.badgeSource).toBe('orders');
  });

  // The Finance role's screens Super Admin opens as the web lets it (`canAccessFinance`).
  const SHARED_STACKS = [
    Routes.FINANCE_CASH_TRANSFERS_STACK,
    Routes.FINANCE_CASH_TRANSFERS_LIST,
    Routes.FINANCE_PAYROLL_LIST,
    Routes.FINANCE_SALARY_LEDGER,
    Routes.FINANCE_PARTNERS_STACK,
    Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK,
    Routes.FINANCE_LEDGER_HEADS_STACK,
    Routes.FINANCE_CLOSING_STACK,
    Routes.FINANCE_REPORTS_STACK,
    Routes.FINANCE_AUDIT_TRAIL_STACK,
    Routes.FINANCE_SETTINGS_STACK,
  ] as string[];
  const SUPER_ADMIN_SCREENS = [
    Routes.SUPER_ADMIN_EVENTS_STACK,
    Routes.SUPER_ADMIN_LEDGER_STACK,
    Routes.SUPER_ADMIN_SUPPORT_STACK,
    Routes.SUPER_ADMIN_CUSTOMERS,
    Routes.SUPER_ADMIN_DAILY_SALE,
    Routes.SUPER_ADMIN_PRODUCTS,
    Routes.SUPER_ADMIN_CATEGORIES,
    Routes.SUPER_ADMIN_PRICE_LIST,
    Routes.SUPER_ADMIN_BRANCHES,
    Routes.SUPER_ADMIN_BRANCH_LOCATIONS,
    Routes.SUPER_ADMIN_USERS,
    Routes.SUPER_ADMIN_SECURITY,
    Routes.SUPER_ADMIN_BACKUP,
    Routes.SUPER_ADMIN_SETTINGS,
    Routes.SUPER_ADMIN_FINANCE_ENTRIES,
    Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK,
  ] as string[];

  it('only ever offers its own tabs, screens and stacks — never Coming Soon', () => {
    const own = new Set<string>([
      Routes.SUPER_ADMIN_TABS,
      Routes.SUPER_ADMIN_DASHBOARD_TAB,
      Routes.SUPER_ADMIN_ORDERS_TAB,
      Routes.SUPER_ADMIN_BRANCH_STOCK_TAB,
      Routes.SUPER_ADMIN_REPORTS_TAB,
      Routes.PRICE_HISTORY_STACK,
      Routes.RECIPIENTS_STACK,
      ...SHARED_STACKS,
      ...SUPER_ADMIN_SCREENS,
    ]);
    for (const item of SUPER_ADMIN_NAV_ITEMS) for (const route of targetsOf(item)) expect(own.has(route)).toBe(true);
    for (const tab of shell.tabItems) if (tab.route) expect(own.has(tab.route)).toBe(true);
    expect(SUPER_ADMIN_NAV_ITEMS.flatMap(targetsOf)).not.toContain(Routes.COMING_SOON);
  });

  it("never reaches another role's menu beyond the shared stacks, and no other role reaches Super Admin's", () => {
    const superAdminOnly = [Routes.SUPER_ADMIN_TABS, Routes.PRICE_HISTORY_STACK, Routes.RECIPIENTS_STACK, ...SUPER_ADMIN_SCREENS] as string[];
    for (const role of ['branch_manager', 'production_user', 'finance_admin', 'accountant'] as const) {
      const other = ROLE_SHELLS[role]!;
      const otherRoutes = other.navItems.flatMap(targetsOf);
      expect(otherRoutes.filter((r) => superAdminOnly.includes(r))).toEqual([]);
      const mine = SUPER_ADMIN_NAV_ITEMS.flatMap(targetsOf).filter((r) => !SHARED_STACKS.includes(r));
      expect(mine.filter((r) => otherRoutes.includes(r))).toEqual([]);
    }
  });

  it('opens real screens for Customers, Support Center and Security', () => {
    const expected: Record<string, string> = {
      customers: Routes.SUPER_ADMIN_CUSTOMERS,
      supportCenter: Routes.SUPER_ADMIN_SUPPORT_STACK,
      security: Routes.SUPER_ADMIN_SECURITY,
    };
    for (const [key, route] of Object.entries(expected)) {
      const navigate = jest.fn();
      SUPER_ADMIN_NAV_ITEMS.find((i) => i.key === key)!.navigate({ navigate, closeDrawer: jest.fn() } as never);
      expect(navigate).toHaveBeenCalledWith(route, undefined);
    }
  });
});

describe('Super Admin finance pages', () => {
  const navigateOf = (key: string) => {
    const navigate = jest.fn();
    SUPER_ADMIN_NAV_ITEMS.find((i) => i.key === key)!.navigate({ navigate, closeDrawer: jest.fn() } as never);
    return navigate.mock.calls[0];
  };

  it("opens every finance page the web lets super_admin open, on the Finance role's own screens", () => {
    // Web route → the drawer row that reaches it.
    expect({
      '/finance-ledger': navigateOf('financeLedger'),
      '/finance-cash-transfers': navigateOf('financeCashTransfers'),
      '/finance-entries': navigateOf('financeEntries'),
      '/finance-closing': navigateOf('financeClosing'),
      '/finance-payroll': navigateOf('financePayroll'),
      '/finance-salaries': navigateOf('financeSalaries'),
      '/finance-partner-transactions': navigateOf('financePartnerTransactions'),
      '/finance-partner-expenses': navigateOf('financeCompanyTransactions'),
      '/finance-heads': navigateOf('financeHeads'),
      '/finance-reports': navigateOf('financeReports'),
      '/finance-audit': navigateOf('financeAudit'),
      '/finance-settings': navigateOf('financeSettings'),
    }).toEqual({
      '/finance-ledger': [Routes.SUPER_ADMIN_LEDGER_STACK, undefined],
      '/finance-cash-transfers': [Routes.FINANCE_CASH_TRANSFERS_STACK, { screen: Routes.FINANCE_CASH_TRANSFERS_LIST }],
      '/finance-entries': [Routes.SUPER_ADMIN_FINANCE_ENTRIES, undefined],
      '/finance-closing': [Routes.FINANCE_CLOSING_STACK, undefined],
      '/finance-payroll': [Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, { screen: Routes.FINANCE_PAYROLL_LIST }],
      '/finance-salaries': [Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, { screen: Routes.FINANCE_SALARY_LEDGER }],
      '/finance-partner-transactions': [Routes.FINANCE_PARTNERS_STACK, undefined],
      '/finance-partner-expenses': [Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK, undefined],
      '/finance-heads': [Routes.FINANCE_LEDGER_HEADS_STACK, undefined],
      '/finance-reports': [Routes.FINANCE_REPORTS_STACK, undefined],
      '/finance-audit': [Routes.FINANCE_AUDIT_TRAIL_STACK, undefined],
      '/finance-settings': [Routes.FINANCE_SETTINGS_STACK, undefined],
    });
  });

  it('marks Payroll active across its stack except on the Salary Ledger, which has its own row', () => {
    const payroll = SUPER_ADMIN_NAV_ITEMS.find((i) => i.key === 'financePayroll')!;
    const salaries = SUPER_ADMIN_NAV_ITEMS.find((i) => i.key === 'financeSalaries')!;
    const chain = (leaf: string) => [Routes.SUPER_ADMIN_DRAWER, Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, leaf];
    expect(isNavItemActive(payroll, chain(Routes.FINANCE_PAYROLL_LIST))).toBe(true);
    expect(isNavItemActive(payroll, chain(Routes.FINANCE_EMPLOYEE_DETAIL))).toBe(true);
    expect(isNavItemActive(payroll, chain(Routes.FINANCE_SALARY_LEDGER))).toBe(false);
    expect(isNavItemActive(salaries, chain(Routes.FINANCE_SALARY_LEDGER))).toBe(true);
    expect(isNavItemActive(salaries, chain(Routes.FINANCE_PAYROLL_LIST))).toBe(false);
  });

  it("links the Finance Ledger's pending panels where the web's do", () => {
    expect(OPEN_CASH_TRANSFERS_TARGET).toEqual({ stack: Routes.FINANCE_CASH_TRANSFERS_STACK, screen: Routes.FINANCE_CASH_TRANSFERS_LIST });
    expect(PENDING_REVIEW_TARGET).toEqual({
      transaction: { stack: Routes.SUPER_ADMIN_FINANCE_ENTRIES },
      partner_expense: { stack: Routes.FINANCE_PARTNERS_STACK },
      salary: { stack: Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, screen: Routes.FINANCE_PAYROLL_LIST },
      advance: { stack: Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, screen: Routes.FINANCE_PAYROLL_LIST },
    });
    // Every target is a row of this drawer, so the screen behind it is mounted.
    const drawerTargets = new Set(SUPER_ADMIN_NAV_ITEMS.flatMap(targetsOf));
    for (const t of [OPEN_CASH_TRANSFERS_TARGET, ...Object.values(PENDING_REVIEW_TARGET)]) expect(drawerTargets.has(t.stack)).toBe(true);
  });

  it('is read-only for super_admin until "Allow Super Admin to modify" is on, and unchanged for the finance roles', () => {
    const perms = ['view', 'create', 'approve', 'adjust', 'configure'] as const;
    expect(perms.filter((p) => financeCan('super_admin', p, false))).toEqual(['view']);
    expect(perms.filter((p) => financeCan('super_admin', p, true))).toEqual([...perms]);
    for (const allow of [false, true]) {
      expect(perms.filter((p) => financeCan('finance_auditor', p, allow))).toEqual(['view']);
      expect(perms.filter((p) => financeCan('accountant', p, allow))).toEqual(['view', 'create']);
      expect(perms.filter((p) => financeCan('finance_manager', p, allow))).toEqual(['view', 'create', 'approve']);
      expect(perms.filter((p) => financeCan('finance_admin', p, allow))).toEqual([...perms]);
    }
  });
});

describe('Super Admin badges', () => {
  beforeEach(() => queryClient.clear());
  afterAll(() => queryClient.clear());

  it('maps every item to its badge, tone and dot', () => {
    const badged = SUPER_ADMIN_NAV_ITEMS.filter((i) => i.badgeSource).map((i) => [i.key, i.badgeSource, i.badgeDot ? 'dot' : 'count', i.badgeTone ?? 'accent']);
    expect(badged).toEqual([
      ['orders', 'orders', 'count', 'accent'],
      ['dailySaleRecords', 'dailySale', 'count', 'muted'],
      ['branchStock', 'branchStockNegative', 'dot', 'danger'],
      ['specialEvents', 'events', 'count', 'accent'],
      ['financeLedger', 'approvals', 'count', 'muted'],
      ['supportCenter', 'supportCenter', 'count', 'accent'],
      ['recipients', 'recipientsTestMode', 'dot', 'accent'],
      ['users', 'suspiciousSignIns', 'dot', 'danger'],
      ['databaseBackup', 'backupAlert', 'dot', 'danger'],
      ['settings', 'restrictionAlert', 'dot', 'accent'],
    ]);
  });

  it('shows nothing from an empty cache', () => {
    expect(computeSuperAdminBadges()).toEqual({});
  });

  it("counts demands waiting for Production, and approvals and open queries as counts", () => {
    queryClient.setQueryData<ProductionOrderListResponse>(queryKeys.productionOrders(), {
      orders: ['pending', 'verified', 'awaiting_verification', 'approved'].map((status, i) => ({ id: String(i), status, items: [] })) as never,
      total: 4,
    });
    queryClient.setQueryData(queryKeys.pendingApprovals(), [{ id: 'a' }]);
    queryClient.setQueryData(['supportTickets', {}], { tickets: [{ status: 'open' }, { status: 'open' }, { status: 'resolved' }], total: 3 });
    expect(computeSuperAdminBadges()).toMatchObject({ orders: 2, approvals: 1, supportCenter: 2 });
  });

  it('raises the Database Backup red dot when any type is overdue, failed or has never run', () => {
    const type = (status: string) => ({ status, lastSuccessfulAt: null, lastAttemptAt: null, ageHours: null, expectedWithinHours: 30 });
    const health = (monthly: string) => ({ daily: type('healthy'), weekly: type('healthy'), monthly: type(monthly), recentFailures: 0, checkedAt: '' }) as BackupHealth;
    queryClient.setQueryData(queryKeys.backupHealth(), health('healthy'));
    expect(computeSuperAdminBadges()).not.toHaveProperty('backupAlert');
    for (const bad of ['overdue', 'failed', 'never']) {
      queryClient.setQueryData(queryKeys.backupHealth(), health(bad));
      expect(computeSuperAdminBadges().backupAlert).toBe(1);
    }
  });

  it("raises the Users red dot for today's suspicious sign-ins only", () => {
    queryClient.setQueryData(queryKeys.suspiciousSignInCount(getBusinessDate()), 0);
    expect(computeSuperAdminBadges()).not.toHaveProperty('suspiciousSignIns');
    queryClient.setQueryData(queryKeys.suspiciousSignInCount('2026-01-01'), 5);
    expect(computeSuperAdminBadges()).not.toHaveProperty('suspiciousSignIns');
    queryClient.setQueryData(queryKeys.suspiciousSignInCount(getBusinessDate()), 2);
    expect(computeSuperAdminBadges().suspiciousSignIns).toBe(1);
  });

  it('dots Branch Stock for a negative balance anywhere, and Recipients while messaging is in test mode', () => {
    queryClient.setQueryData(queryKeys.productionBranchStock(), {
      branches: [{ branchId: 'a', branchName: 'A' }, { branchId: 'b', branchName: 'B' }],
      rows: [{ productId: 'p', productName: 'P', byBranch: { a: 3, b: 0 } }],
    });
    queryClient.setQueryData(queryKeys.messagingProvider(), { provider: 'console', live: true, retry: { maxAttempts: 3, baseDelayMs: 1 } });
    expect(computeSuperAdminBadges()).toEqual({});
    queryClient.setQueryData(queryKeys.productionBranchStock(), {
      branches: [{ branchId: 'a', branchName: 'A' }, { branchId: 'b', branchName: 'B' }],
      rows: [{ productId: 'p', productName: 'P', byBranch: { a: 3, b: -2 } }],
    });
    queryClient.setQueryData(queryKeys.messagingProvider(), { provider: 'console', live: false, retry: { maxAttempts: 3, baseDelayMs: 1 } });
    expect(computeSuperAdminBadges()).toMatchObject({ branchStockNegative: 1, recipientsTestMode: 1 });
  });
});

describe('collapsible sections', () => {
  it('pins Overview and the section holding the active screen', () => {
    expect(pinnedSections(rowsFor(null))).toEqual(['Overview']);
    expect(pinnedSections(rowsFor('dashboard'))).toEqual(['Overview']);
    expect(pinnedSections(rowsFor('priceHistory'))).toEqual(['Overview', 'Catalog']);
  });

  it('opens with the pinned sections plus what the user left open, dropping sections that no longer exist', () => {
    expect(initialExpanded(rowsFor('priceHistory'), null)).toEqual(['Overview', 'Catalog']);
    expect(initialExpanded(rowsFor('priceHistory'), ['Admin', 'Gone'])).toEqual(['Overview', 'Catalog', 'Admin']);
  });

  it('keeps the active section open even when the stored list folded it', () => {
    expect(effectiveExpanded(rowsFor('recipients'), ['Overview'])).toEqual(['Support', 'Overview']);
  });

  it('never folds a pinned section', () => {
    expect(collapseSection(['Overview', 'Catalog'], 'Catalog', ['Overview', 'Catalog'])).toEqual(['Overview', 'Catalog']);
    expect(collapseSection(['Overview', 'Admin'], 'Admin', ['Overview'])).toEqual(['Overview']);
  });

  it('folds the least recently opened section once the list no longer fits, never a pinned one or the one just opened', () => {
    const rows = rowsFor('dashboard');
    const sections = sectionOrder(rows).length;
    const count = (open: readonly string[]) => rows.filter((r) => open.includes(r.section!)).length;
    // Room for every header and 9 rows at 40dp: headers × 28 + 9 × 40.
    const fits = (open: readonly string[]) => fitsAtMinimum(sections * 28 + 9 * 40, count(open), sections);
    let open = ['Overview'];
    open = expandSection(open, 'Sales & orders', ['Overview'], fits); // 1 + 3
    open = expandSection(open, 'Branches', ['Overview'], fits); // + 3 = 7
    expect(open).toEqual(['Overview', 'Sales & orders', 'Branches']);
    open = expandSection(open, 'Admin', ['Overview'], fits); // + 4 = 11 > 9: Sales & orders goes
    expect(open).toEqual(['Overview', 'Branches', 'Admin']);
    // + Catalog 4 = 12 > 9: Branches, now the least recent, goes; 1 + 4 + 4 fits.
    open = expandSection(open, 'Catalog', ['Overview'], fits);
    expect(open).toEqual(['Overview', 'Admin', 'Catalog']);
    // Re-opening Admin makes it the most recent, so the next fold takes Catalog.
    open = expandSection(open, 'Admin', ['Overview'], fits);
    open = expandSection(open, 'Support', ['Overview'], fits);
    expect(open).toEqual(['Overview', 'Admin', 'Support']);
  });

  it('filters rows across folded sections as you type', () => {
    const rows = rowsFor(null);
    expect(filterRows(rows, '').length).toBe(31);
    expect(filterRows(rows, '  branch ').map((r) => r.label)).toEqual(['Branches', 'Branch Locations', 'Branch Stock']);
    expect(filterRows(rows, 'PRICE').map((r) => r.label)).toEqual(['Price List', 'Price History']);
    expect(filterRows(rows, 'zzz')).toEqual([]);
  });

  it("sums a folded section's counts and keeps its loudest dot", () => {
    const rows = rowsFor(null).map((r) => ({
      ...r,
      badgeCount: ({ Users: 1, 'Database Backup': 1, Settings: 1, Orders: 4, 'Daily Sale Records': 3 } as Record<string, number>)[r.label],
    }));
    expect(summarizeSection(rows, 'Admin')).toEqual({ itemCount: 4, badgeTotal: 0, dot: 'danger' });
    expect(summarizeSection(rows, 'Sales & orders')).toEqual({ itemCount: 3, badgeTotal: 7, dot: null });
    expect(summarizeSection(rows, 'Catalog')).toEqual({ itemCount: 4, badgeTotal: 0, dot: null });
  });
});

describe('collapsible drawer sizing', () => {
  it.each([
    ['360x800', 800],
    ['412x915', 915],
  ])('on %s, opens with Overview + the active section expanded and nothing clipped', (_name, height) => {
    const available = listHeight(height);
    for (const active of ['dashboard', 'priceHistory', 'databaseBackup', 'dailySaleRecords', 'financeCashTransfers', 'financeSalaries', 'financeSettings']) {
      const rows = rowsFor(active);
      const open = initialExpanded(rows, null);
      const visible = rows.filter((r) => open.includes(r.section!)).length;
      const m = computeCollapsibleRowMetrics(available, visible, sectionOrder(rows).length);
      expect(m.needsScroll).toBe(false);
      expect(m.rowHeight).toBeGreaterThanOrEqual(40);
      expect(m.rowHeight).toBeLessThanOrEqual(50);
      expect(m.headerHeight).toBeGreaterThanOrEqual(28);
    }
  });

  it('caps rows at 50dp, floors them at 40dp and scrolls past that', () => {
    expect(computeCollapsibleRowMetrics(1000, 2, 8).rowHeight).toBe(50);
    const tight = computeCollapsibleRowMetrics(500, 20, 8);
    expect(tight.rowHeight).toBe(40);
    expect(tight.needsScroll).toBe(true);
  });
});
