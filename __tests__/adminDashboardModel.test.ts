/**
 * @format
 */
import {
  branchDemandRows,
  dailyDemand,
  demandComparison,
  liveSaleRows,
  loginDateWindow,
  salesPeriodLabel,
  salesPeriodRange,
  weeklyReturnsDiscount,
} from '@/features/admin/utils/dashboardModel';
import type { FinanceDashboardDay, FinanceMonthlyDashboard } from '@/api';

function day(date: string, branchId: string | null, demand: number, extra: Partial<FinanceDashboardDay> = {}): FinanceDashboardDay {
  return {
    date,
    branchId,
    demand,
    companyShare: 0,
    received: 0,
    returns: 0,
    discount: 0,
    orders: 1,
    unpricedLines: 0,
    receipts: 0,
    returnCount: 0,
    discountCount: 0,
    ...extra,
  };
}

function dashboard(days: FinanceDashboardDay[], over: Partial<FinanceMonthlyDashboard> = {}): FinanceMonthlyDashboard {
  return {
    month: '2026-10',
    previousMonth: '2026-09',
    from: '2026-10-01',
    to: '2026-10-31',
    branchId: null,
    businessDate: '2026-10-20',
    generatedAt: '2026-10-20T10:00:00Z',
    branches: [
      { id: 'b1', name: 'Saddar', isActive: true },
      { id: 'b2', name: 'Anarkali', isActive: false },
    ],
    summary: {} as FinanceMonthlyDashboard['summary'],
    days,
    ledger: [],
    previous: [],
    trend: [{ month: '2026-09', demand: 3000, companyShare: 0, received: 0, balance: 0, returns: 0, discount: 0 }],
    ...over,
  };
}

describe('salesPeriodRange', () => {
  const today = '2026-10-21'; // a Wednesday

  it('starts the week on Monday and runs to today', () => {
    expect(salesPeriodRange('week', today)).toEqual({ from: '2026-10-19', to: today });
  });

  it('covers yesterday and the month to date', () => {
    expect(salesPeriodRange('yesterday', today)).toEqual({ from: '2026-10-20', to: '2026-10-20' });
    expect(salesPeriodRange('month', today)).toEqual({ from: '2026-10-01', to: today });
  });

  it('orders a custom range and clamps it to today', () => {
    expect(salesPeriodRange('custom', today, { from: '2026-10-30', to: '2026-10-05' })).toEqual({ from: '2026-10-05', to: today });
  });

  it('labels a custom single day', () => {
    expect(salesPeriodLabel('custom', '2026-10-05', '2026-10-05')).toBe('Sales · 05 Oct 2026');
    expect(salesPeriodLabel('week', '2026-10-19', today)).toBe("This Week's Sales");
  });
});

describe('liveSaleRows', () => {
  it('merges groups by branch, drops zero branches, keeps unknown ones, largest first', () => {
    const rows = liveSaleRows(
      [
        { id: 'b1', name: 'Saddar', isActive: true },
        { id: 'b2', name: 'Anarkali', isActive: false },
        { id: 'b3', name: 'Quiet', isActive: true },
      ],
      [
        { branchId: 'b1', branchName: 'Old Saddar', sales: 100, orders: 2 },
        { branchId: 'b1', branchName: 'Saddar', sales: 50.005, orders: 1 },
        { branchId: 'b2', branchName: 'Anarkali', sales: 400, orders: 5 },
        { branchId: 'b3', branchName: 'Quiet', sales: 0, orders: 0 },
        { branchId: 'gone', branchName: 'Closed Branch', sales: 20, orders: 1 },
      ],
    );
    expect(rows).toEqual([
      { branchId: 'b2', branch: 'Anarkali (inactive)', sales: 400, orders: 5 },
      { branchId: 'b1', branch: 'Saddar', sales: 150.01, orders: 3 },
      { branchId: 'gone', branch: 'Closed Branch', sales: 20, orders: 1 },
    ]);
  });
});

describe('production shaping', () => {
  const data = dashboard([
    day('2026-10-01', 'b1', 100),
    day('2026-10-01', 'b2', 50),
    day('2026-10-09', 'b1', 200, { returns: 10, discount: 5 }),
    day('2026-10-02', null, 30, { returns: 4 }),
  ]);

  it('lays demand on every day of the window, null after today', () => {
    const d = dailyDemand(data);
    expect(d).toHaveLength(31);
    expect(d[0]).toEqual({ date: '2026-10-01', label: '01', demand: 150, orders: 2 });
    expect(d[2]!.demand).toBe(0);
    expect(d[20]!.demand).toBeNull();
  });

  it('buckets return and discount by week of the month, leaving off weeks not yet started', () => {
    const w = weeklyReturnsDiscount(data);
    expect(w.map((x) => x.key)).toEqual(['2026-10-W1', '2026-10-W2', '2026-10-W3']);
    expect(w[0]).toMatchObject({ label: '01–07 Oct', returns: 4, discount: 0 });
    expect(w[1]).toMatchObject({ returns: 10, discount: 5 });
  });

  it('compares the daily average against last month', () => {
    const c = demandComparison(data)!;
    // 380 over 20 elapsed days against 3000 over September's 30.
    expect(c.currentAvg).toBe(19);
    expect(c.previousAvg).toBe(100);
    expect(c.changePct).toBeCloseTo(-81);
  });

  it('lists branches with demand alphabetically, unassigned last', () => {
    expect(branchDemandRows(data).map((r) => [r.branch, r.demand, r.orders])).toEqual([
      ['Anarkali (inactive)', 50, 1],
      ['Saddar', 300, 2],
      ['Company / unassigned', 30, 1],
    ]);
  });
});

describe('loginDateWindow', () => {
  it('maps presets to business dates', () => {
    expect(loginDateWindow('all', '2026-10-20')).toEqual({});
    expect(loginDateWindow('last7', '2026-10-20')).toEqual({ from: '2026-10-14', to: '2026-10-20' });
    expect(loginDateWindow('month', '2026-10-20')).toEqual({ from: '2026-10-01', to: '2026-10-20' });
  });
});
