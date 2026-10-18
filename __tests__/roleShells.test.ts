/**
 * @format
 */
import { queryClient, queryKeys } from '@/api';
import type { BranchDiscountListResponse, ProductionOrderListResponse, ProductionStockListResponse } from '@/api';
import { computeBranchBadges, computeProductionBadges } from '@/navigation/navBadgeCounts';
import type { NavItem } from '@/navigation/navItems';
import { ROLE_SHELLS, getRoleShell } from '@/navigation/roleShells';
import { Routes } from '@/navigation/routes';

const PRODUCTION_ROUTES = new Set(
  Object.entries(Routes)
    .filter(([key]) => key.startsWith('PRODUCTION_'))
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
    expect(getRoleShell('super_admin').route).toBe(Routes.UNSUPPORTED_ROLE);
    expect(getRoleShell('someone_new').route).toBe(Routes.UNSUPPORTED_ROLE);
    expect(getRoleShell(undefined).route).toBe(Routes.UNSUPPORTED_ROLE);
  });
});

describe('drawer context line and section labels', () => {
  it('shows the branch for a Branch Manager and the scope for a Production User', () => {
    expect(getRoleShell('branch_manager').contextLine({ role: 'branch_manager', branchName: 'Committee Chowk' })).toBe('Committee Chowk');
    expect(getRoleShell('production_user').contextLine({ role: 'production_user', branchName: null })).toBe('Production · All branches');
  });

  it('only Production drops section labels on short screens; Branch keeps its current behaviour', () => {
    expect(getRoleShell('production_user').hideSectionLabelsWhenShort).toBe(true);
    expect(getRoleShell('branch_manager').hideSectionLabelsWhenShort).toBe(false);
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
