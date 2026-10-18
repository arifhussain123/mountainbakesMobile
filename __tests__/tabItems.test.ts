/**
 * @format
 */
import { Routes } from '@/navigation/routes';
import { BRANCH_TAB_ITEMS, PRODUCTION_TAB_ITEMS } from '@/navigation/tabItems';

describe.each([
  ['BRANCH_TAB_ITEMS', BRANCH_TAB_ITEMS],
  ['PRODUCTION_TAB_ITEMS', PRODUCTION_TAB_ITEMS],
])('%s', (_name, items) => {
  it('has exactly 5 slots: 4 navigable tabs + More', () => {
    expect(items).toHaveLength(5);
  });

  it('"More" has no route and never becomes active — the bar treats route === null as "open drawer, skip the notch"', () => {
    const more = items[items.length - 1]!;
    expect(more.key).toBe('more');
    expect(more.route).toBeNull();
  });

  it('every other tab has a real, distinct route', () => {
    const routes = items.slice(0, -1).map((t) => t.route);
    expect(routes.every((r) => typeof r === 'string' && r.length > 0)).toBe(true);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('has distinct keys across all 5 slots', () => {
    const keys = items.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('PRODUCTION_TAB_ITEMS', () => {
  it('is Dashboard, Orders, Production Stock, Returns, More', () => {
    expect(PRODUCTION_TAB_ITEMS.map((t) => [t.label, t.route])).toEqual([
      ['Dashboard', Routes.PRODUCTION_DASHBOARD_TAB],
      ['Orders', Routes.PRODUCTION_ORDERS_TAB],
      ['Production Stock', Routes.PRODUCTION_STOCK_TAB],
      ['Returns', Routes.PRODUCTION_RETURNS_TAB],
      ['More', null],
    ]);
  });

  it('badges Orders, Production Stock and Returns from the same sources as the drawer', () => {
    expect(Object.fromEntries(PRODUCTION_TAB_ITEMS.map((t) => [t.key, t.badgeSource]))).toEqual({
      dashboard: null,
      orders: 'orders',
      productionStock: 'productionStock',
      returns: 'returns',
      more: null,
    });
  });
});
