/**
 * @format
 */
import { NAV_ITEMS, isNavItemActive } from '@/navigation/navItems';
import { Routes } from '@/navigation/routes';

describe('isNavItemActive', () => {
  const orders = NAV_ITEMS.find((i) => i.key === 'orders')!;
  const stock = NAV_ITEMS.find((i) => i.key === 'stock')!;
  const returnStock = NAV_ITEMS.find((i) => i.key === 'returnStock')!;
  const discounts = NAV_ITEMS.find((i) => i.key === 'discounts')!;

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

  it('every item has a distinct key and a non-empty label', () => {
    const keys = NAV_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of NAV_ITEMS) expect(item.label.length).toBeGreaterThan(0);
  });
});
