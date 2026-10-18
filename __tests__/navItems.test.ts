/**
 * @format
 */
import { BRANCH_NAV_ITEMS, PRODUCTION_NAV_ITEMS, isNavItemActive } from '@/navigation/navItems';
import { Routes } from '@/navigation/routes';

describe('isNavItemActive', () => {
  const orders = BRANCH_NAV_ITEMS.find((i) => i.key === 'orders')!;
  const stock = BRANCH_NAV_ITEMS.find((i) => i.key === 'stock')!;
  const returnStock = BRANCH_NAV_ITEMS.find((i) => i.key === 'returnStock')!;
  const discounts = BRANCH_NAV_ITEMS.find((i) => i.key === 'discounts')!;

  it('matches a tab item whose root is anywhere in the focused chain', () => {
    expect(isNavItemActive(orders, [Routes.TABS, Routes.ORDERS_TAB, Routes.ORDERS_LIST])).toBe(true);
    expect(isNavItemActive(orders, [Routes.TABS, Routes.SALES_TAB])).toBe(false);
  });

  it('requires the leaf screen to match when one is specified, so Stock and Return Stock (same tab) never both read active', () => {
    expect(isNavItemActive(stock, [Routes.TABS, Routes.STOCK_TAB, Routes.STOCK_OVERVIEW])).toBe(true);
    expect(isNavItemActive(stock, [Routes.TABS, Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST])).toBe(false);
    expect(isNavItemActive(returnStock, [Routes.TABS, Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST])).toBe(true);
    expect(isNavItemActive(returnStock, [Routes.TABS, Routes.STOCK_TAB, Routes.STOCK_OVERVIEW])).toBe(false);
  });

  it('matches a drawer-stack item (no leaf) regardless of how deep the focused screen is', () => {
    expect(isNavItemActive(discounts, [Routes.DISCOUNTS_STACK, Routes.DISCOUNTS_LIST])).toBe(true);
    expect(isNavItemActive(discounts, [Routes.CASH_STACK])).toBe(false);
  });

  it('keeps Production Stock active on its own modals but hands Branch Stock (same tab) to its own item', () => {
    const productionStock = PRODUCTION_NAV_ITEMS.find((i) => i.key === 'productionStock')!;
    const branchStock = PRODUCTION_NAV_ITEMS.find((i) => i.key === 'branchStock')!;
    const tab = [Routes.PRODUCTION_TABS, Routes.PRODUCTION_STOCK_TAB];
    expect(isNavItemActive(productionStock, [...tab, Routes.PRODUCTION_STOCK_OVERVIEW])).toBe(true);
    expect(isNavItemActive(productionStock, [...tab, Routes.PRODUCTION_PREPARED_PRODUCTS])).toBe(true);
    expect(isNavItemActive(productionStock, [...tab, Routes.PRODUCTION_BRANCH_STOCK])).toBe(false);
    expect(isNavItemActive(branchStock, [...tab, Routes.PRODUCTION_BRANCH_STOCK])).toBe(true);
    expect(isNavItemActive(branchStock, [...tab, Routes.PRODUCTION_STOCK_OVERVIEW])).toBe(false);
    // A freshly opened tab has no nested state yet — the chain ends at the tab itself.
    expect(isNavItemActive(productionStock, tab)).toBe(true);
  });

  it.each([
    ['branch', BRANCH_NAV_ITEMS],
    ['production', PRODUCTION_NAV_ITEMS],
  ])('every %s item has a distinct key and a non-empty label', (_name, items) => {
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of items) expect(item.label.length).toBeGreaterThan(0);
  });
});

describe('PRODUCTION_NAV_ITEMS', () => {
  it("is the web's PRODUCTION_NAV, in its order", () => {
    expect(PRODUCTION_NAV_ITEMS.map((i) => i.label)).toEqual([
      'Dashboard',
      'Orders',
      'Sales',
      'Production Stock',
      'Branch Stock',
      'Returns',
      'Discounts',
      'Events',
      'Reports',
      'Help Desk',
    ]);
  });

  it('badges Orders, Production Stock, Returns and Discounts', () => {
    const badged = Object.fromEntries(PRODUCTION_NAV_ITEMS.map((i) => [i.key, i.badgeSource]));
    expect(badged).toMatchObject({ orders: 'orders', productionStock: 'productionStock', returns: 'returns', discounts: 'discounts' });
  });
});
