/**
 * @format
 */
import { queryClient, queryKeys } from '@/api';
import type { BranchDiscountListResponse, ProductionOrderListResponse, ProductionStockListResponse } from '@/api';
import { FINANCE_PENDING_TRANSFERS_QUERY, computeBranchBadges, computeFinanceBadges, computeProductionBadges } from '@/navigation/navBadgeCounts';
import type { NavItem } from '@/navigation/navItems';
import { ROLE_SHELLS, getRoleShell } from '@/navigation/roleShells';
import { Routes } from '@/navigation/routes';

const PRODUCTION_ROUTES = new Set(
  Object.entries(Routes)
    .filter(([key]) => key.startsWith('PRODUCTION_'))
    .map(([, name]) => name as string),
);

const FINANCE_ROUTES = new Set(
  Object.entries(Routes)
    .filter(([key]) => key.startsWith('FINANCE_'))
    .map(([, name]) => name as string),
);

/** Every route name an item's `navigate` touches: the drawer screen, then the nested tab/stack screens. */
function targetsOf(item: NavItem): string[] {
  const navigate = jest.fn();
  item.navigate({ navigate, closeDrawer: jest.fn() } as never);
  const [name, params] = navigate.mock.calls[0] as [string, { screen?: string; params?: { screen?: string } } | undefined];
  return [name, params?.screen, params?.params?.screen].filter((r): r is string => !!r);
}

describe('getRoleShell', () => {
  it('sends each role to its own app shell, and an unbuilt or missing role to the explicit unsupported screen', () => {
    expect(getRoleShell('branch_manager').route).toBe(Routes.DRAWER);
    expect(getRoleShell('production_user').route).toBe(Routes.PRODUCTION_DRAWER);
    expect(getRoleShell('accountant').route).toBe(Routes.FINANCE_DRAWER);
    expect(getRoleShell('super_admin').route).toBe(Routes.SUPER_ADMIN_DRAWER);
    expect(getRoleShell('someone_new').route).toBe(Routes.UNSUPPORTED_ROLE);
    expect(getRoleShell(undefined).route).toBe(Routes.UNSUPPORTED_ROLE);
  });
});

describe('drawer context line', () => {
  it('shows the branch for a Branch Manager and the scope for a Production User', () => {
    expect(getRoleShell('branch_manager').contextLine({ role: 'branch_manager', branchName: 'Committee Chowk' })).toBe('Committee Chowk');
    expect(getRoleShell('production_user').contextLine({ role: 'production_user', branchName: null })).toBe('Production · All branches');
    expect(getRoleShell('finance_admin').contextLine({ role: 'finance_admin', branchName: null })).toBe('Finance · All branches');
  });
});

describe('role separation', () => {
  const branch = ROLE_SHELLS.branch_manager!;
  const production = ROLE_SHELLS.production_user!;

  it('a Branch Manager is never offered a Production screen', () => {
    for (const item of branch.navItems) {
      for (const route of targetsOf(item)) expect(PRODUCTION_ROUTES.has(route)).toBe(false);
    }
    for (const tab of branch.tabItems) if (tab.route) expect(PRODUCTION_ROUTES.has(tab.route)).toBe(false);
  });

  it('a Production User is only ever offered Production screens', () => {
    for (const item of production.navItems) {
      for (const route of targetsOf(item)) expect(PRODUCTION_ROUTES.has(route)).toBe(true);
    }
    for (const tab of production.tabItems) if (tab.route) expect(PRODUCTION_ROUTES.has(tab.route)).toBe(true);
  });

  it('every finance role gets the same Finance menu, which only ever offers Finance screens (or Coming Soon for Approvals)', () => {
    const finance = ROLE_SHELLS.finance_admin!;
    for (const role of ['finance_manager', 'finance_auditor'] as const) expect(ROLE_SHELLS[role]).toBe(finance);
    for (const item of finance.navItems) {
      for (const route of targetsOf(item)) expect(FINANCE_ROUTES.has(route) || route === Routes.COMING_SOON).toBe(true);
    }
    const branchRoutes = new Set([...branch.navItems, ...production.navItems].flatMap(targetsOf));
    expect(finance.navItems.flatMap(targetsOf).filter((r) => branchRoutes.has(r))).toEqual([]);
  });

  it('Finance rides the same notch tab bar, with only Finance tabs and More last', () => {
    const finance = ROLE_SHELLS.finance_admin!;
    expect(finance.tabItems.map((t) => t.label)).toEqual(['Dashboard', 'Ledger', 'Income', 'Payroll', 'More']);
    for (const tab of finance.tabItems) if (tab.route) expect(FINANCE_ROUTES.has(tab.route)).toBe(true);
    expect(finance.tabItems.at(-1)!.route).toBeNull();
    // Cash Transfers moved behind More; its drawer row keeps the pending count.
    expect(finance.navItems.find((i) => i.key === 'cashTransfers')!.badgeSource).toBe('cashTransfers');
  });

  it('an Accountant gets the Finance shell without the Daily Ledger, in the drawer or on the tab bar', () => {
    const finance = ROLE_SHELLS.finance_admin!;
    const accountant = ROLE_SHELLS.accountant!;
    expect(accountant.route).toBe(finance.route);
    expect(accountant.navItems.map((i) => i.key)).toEqual(finance.navItems.map((i) => i.key).filter((k) => k !== 'dailyLedger'));
    expect(accountant.tabItems.map((t) => t.label)).toEqual(['Dashboard', 'Income', 'Payroll', 'More']);
    expect(accountant.navItems.flatMap(targetsOf)).not.toContain(Routes.FINANCE_LEDGER_TAB);
  });

  it('the two shells share no route at all', () => {
    const branchRoutes = new Set(branch.navItems.flatMap(targetsOf));
    const productionRoutes = production.navItems.flatMap(targetsOf);
    expect(productionRoutes.filter((r) => branchRoutes.has(r))).toEqual([]);
  });
});

describe('nav badges', () => {
  const order = (status: string) => ({ id: status + Math.random(), status, items: [] });

  beforeEach(() => {
    queryClient.clear();
    queryClient.setQueryData<ProductionOrderListResponse>(queryKeys.productionOrders(), {
      orders: ['pending', 'verified', 'verified', 'awaiting_verification', 'approved', 'rejected'].map(order) as never,
      total: 6,
    });
  });

  afterAll(() => queryClient.clear());

  it("Production: Orders counts what waits on Production's approval (pending + verified)", () => {
    expect(computeProductionBadges().orders).toBe(3);
  });

  it("Branch: Orders still counts what waits on the branch's side (pending + awaiting verification)", () => {
    expect(computeBranchBadges().orders).toBe(2);
  });

  it('Production: Stock counts shortage products only, from today\'s pool', () => {
    queryClient.setQueryData<ProductionStockListResponse>(queryKeys.productionStock(), {
      rows: ['shortage', 'shortage', 'out', 'low', 'healthy'].map((status) => ({ status })) as never,
      date: '2026-10-18',
    });
    expect(computeProductionBadges().productionStock).toBe(2);
  });

  it("Production: Returns and Discounts are the server's awaiting-review totals; zero shows no badge", () => {
    queryClient.setQueryData(queryKeys.productionReturnsAwaitingCount(), 4);
    queryClient.setQueryData(queryKeys.productionDiscountsAwaitingCount(), 0);
    const badges = computeProductionBadges();
    expect(badges.returns).toBe(4);
    expect(badges).not.toHaveProperty('discounts');
  });

  it('Finance: Approvals and Cash Transfers are counts, Help Desk is the Waiting-for-Finance bucket', () => {
    queryClient.setQueryData(queryKeys.pendingApprovals(), [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    queryClient.setQueryData(queryKeys.financeCashTransfers(FINANCE_PENDING_TRANSFERS_QUERY), { transfers: [{}], total: 5 });
    queryClient.setQueryData(queryKeys.financeTicketStats(), { waiting: 2, open: 9 });
    const badges = computeFinanceBadges();
    expect(badges).toMatchObject({ approvals: 3, cashTransfers: 5, helpDesk: 2 });
    // Finance never reads the Branch/Production queues.
    expect(badges).not.toHaveProperty('orders');
  });

  it("Finance: Daily Closing's dot shows only while the server's business day is still open", () => {
    queryClient.setQueryData(queryKeys.financeDashboard(), { businessDate: '2026-10-18' });
    queryClient.setQueryData(queryKeys.dayClosing('2026-10-17'), { status: 'open' });
    expect(computeFinanceBadges()).not.toHaveProperty('dailyClosing');
    queryClient.setQueryData(queryKeys.dayClosing('2026-10-18'), { status: 'open' });
    expect(computeFinanceBadges().dailyClosing).toBe(1);
    queryClient.setQueryData(queryKeys.dayClosing('2026-10-18'), { status: 'closed' });
    expect(computeFinanceBadges()).not.toHaveProperty('dailyClosing');
  });

  it("Finance: Settings' warning dot follows \"Allow Super Admin to modify finance records\"", () => {
    queryClient.setQueryData(queryKeys.financeSettings(), { allowSuperAdminWrite: false });
    expect(computeFinanceBadges()).not.toHaveProperty('financeSettings');
    queryClient.setQueryData(queryKeys.financeSettings(), { allowSuperAdminWrite: true });
    expect(computeFinanceBadges().financeSettings).toBe(1);
  });

  it("neither role reads the other's queues", () => {
    queryClient.setQueryData<BranchDiscountListResponse>(queryKeys.branchDiscounts(), {
      discounts: [{ status: 'pending' }] as never,
      total: 1,
    });
    queryClient.setQueryData(queryKeys.productionReturnsAwaitingCount(), 4);
    expect(computeProductionBadges()).not.toHaveProperty('discounts');
    expect(computeBranchBadges()).not.toHaveProperty('returns');
    expect(computeBranchBadges().discounts).toBe(1);
  });
});
