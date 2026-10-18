/**
 * @format
 */
import { BRANCH_NAV_ITEMS, FINANCE_NAV_ITEMS, GROUP_LABEL, PRODUCTION_NAV_ITEMS, isNavItemActive } from '@/navigation/navItems';
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
    ['finance', FINANCE_NAV_ITEMS],
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

  it('maps each badge to its count, and leaves the rest unbadged', () => {
    expect(Object.fromEntries(PRODUCTION_NAV_ITEMS.map((i) => [i.key, i.badgeSource]))).toEqual({
      dashboard: null,
      orders: 'orders',
      sales: null,
      productionStock: 'productionStock',
      branchStock: null,
      returns: 'returns',
      discounts: 'discounts',
      events: null,
      reports: null,
      helpDesk: 'helpDesk',
    });
  });

  it('sits under Overview / Work / Planning / Insights / Support, in that order', () => {
    const sections = PRODUCTION_NAV_ITEMS.map((i) => GROUP_LABEL[i.group]).filter((g, idx, all) => all[idx - 1] !== g);
    expect(sections).toEqual(['Overview', 'Work', 'Planning', 'Insights', 'Support']);
    expect(PRODUCTION_NAV_ITEMS.filter((i) => i.group === 'work').map((i) => i.label)).toEqual([
      'Orders',
      'Sales',
      'Production Stock',
      'Branch Stock',
      'Returns',
      'Discounts',
    ]);
  });

  it('uses the brief\'s icons', () => {
    expect(PRODUCTION_NAV_ITEMS.map((i) => i.icon)).toEqual([
      'dashboard-grid',
      'orders',
      'sales',
      'factory',
      'layers',
      'rotate-ccw',
      'percent',
      'calendar',
      'bar-chart',
      'headset',
    ]);
  });
});

describe('FINANCE_NAV_ITEMS', () => {
  it('is the 15 Finance items under Overview / Books / People / Partners / Setup & review', () => {
    const bySection: Record<string, string[]> = {};
    for (const item of FINANCE_NAV_ITEMS) (bySection[GROUP_LABEL[item.group]] ??= []).push(item.label);
    expect(bySection).toEqual({
      Overview: ['Dashboard', 'Approvals'],
      Books: ['Daily Ledger', 'Cash Transfers', 'Income & Expense', 'Daily Closing'],
      People: ['Payroll', 'Salary Ledger'],
      Partners: ['Partner Transactions', 'Company Transactions'],
      'Setup & review': ['Ledger Heads', 'Reports', 'Audit Trail', 'Help Desk', 'Settings'],
    });
    expect(FINANCE_NAV_ITEMS).toHaveLength(15);
  });

  it('maps each badge, with Daily Closing and Settings as dots rather than counts', () => {
    const badged = FINANCE_NAV_ITEMS.filter((i) => i.badgeSource).map((i) => [i.key, i.badgeSource, !!i.badgeDot]);
    expect(badged).toEqual([
      ['approvals', 'approvals', false],
      ['cashTransfers', 'cashTransfers', false],
      ['dailyClosing', 'dailyClosing', true],
      ['helpDesk', 'helpDesk', false],
      ['settings', 'financeSettings', true],
    ]);
  });

  it('keeps Payroll and Salary Ledger (same stack) from both reading active', () => {
    const payroll = FINANCE_NAV_ITEMS.find((i) => i.key === 'payroll')!;
    const salaryLedger = FINANCE_NAV_ITEMS.find((i) => i.key === 'salaryLedger')!;
    const stack = [Routes.FINANCE_PAYROLL_STACK];
    expect(isNavItemActive(payroll, [...stack, Routes.FINANCE_PAYROLL_LIST])).toBe(true);
    expect(isNavItemActive(payroll, [...stack, Routes.FINANCE_EMPLOYEE_DETAIL])).toBe(true);
    expect(isNavItemActive(payroll, [...stack, Routes.FINANCE_SALARY_LEDGER])).toBe(false);
    expect(isNavItemActive(salaryLedger, [...stack, Routes.FINANCE_SALARY_LEDGER])).toBe(true);
    expect(isNavItemActive(salaryLedger, [...stack, Routes.FINANCE_PAYROLL_LIST])).toBe(false);
  });
});
