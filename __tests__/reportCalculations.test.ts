/**
 * @format
 */
import {
  computeAvgOrderValue,
  computeNet,
  derivePackingStatus,
  isPackingShortfall,
  sortTopProducts,
  summarizeTrend,
  sumPaymentMethodCount,
  sumPaymentMethodRevenue,
} from '@/features/reports/calculations';
import type { SalesAnalyticsPaymentMethod, SalesAnalyticsTopProduct } from '@/api';

describe('computeAvgOrderValue', () => {
  it('matches the worked example from the reference report (Rs. 613,230 / 795 orders ≈ Rs. 771)', () => {
    expect(computeAvgOrderValue(613_230, 795, 0)).toBeCloseTo(771.36, 2);
    expect(Math.round(computeAvgOrderValue(613_230, 795, 0))).toBe(771);
  });

  it('excludes cancelled orders from the denominator but not staff orders, per the server formula', () => {
    expect(computeAvgOrderValue(1000, 10, 2)).toBe(1000 / 8);
  });

  it('is zero when there are no orders', () => {
    expect(computeAvgOrderValue(0, 0, 0)).toBe(0);
  });

  it('never divides by zero when every order was cancelled', () => {
    expect(computeAvgOrderValue(0, 3, 3)).toBe(0);
  });
});

describe('computeNet', () => {
  it('is revenue minus expenses, matching the worked example (613,230 - 94,190)', () => {
    expect(computeNet(613_230, 94_190)).toBe(519_040);
  });
});

function method(method: string, total: number, count: number): SalesAnalyticsPaymentMethod {
  return { method, total, count };
}

describe('sumPaymentMethodRevenue / sumPaymentMethodCount', () => {
  it('matches the worked example (Cash 522,680 + Easypaisa 90,550 = 613,230; 668 + 127 = 795)', () => {
    const methods = [method('cash', 522_680, 668), method('easypaisa', 90_550, 127)];
    expect(sumPaymentMethodRevenue(methods)).toBe(613_230);
    expect(sumPaymentMethodCount(methods)).toBe(795);
  });
});

function product(productName: string, sales: number, qty: number): SalesAnalyticsTopProduct {
  return { productId: productName, productName, categoryName: '', sales, qty };
}

describe('sortTopProducts', () => {
  const products = [product('A', 100, 50), product('B', 300, 10), product('C', 200, 40)];

  it('sorts by revenue descending', () => {
    expect(sortTopProducts(products, 'revenue').map((p) => p.productName)).toEqual(['B', 'C', 'A']);
  });

  it('sorts by qty descending', () => {
    expect(sortTopProducts(products, 'qty').map((p) => p.productName)).toEqual(['A', 'C', 'B']);
  });

  it('does not mutate the input array', () => {
    const copy = [...products];
    sortTopProducts(products, 'qty');
    expect(products).toEqual(copy);
  });
});

describe('derivePackingStatus / isPackingShortfall', () => {
  it('is "notApproved" when nothing has been approved yet — never labeled "Rejected" since that cannot be told apart from pending here', () => {
    expect(derivePackingStatus({ requestedQty: 10, approvedQty: 0 })).toBe('notApproved');
  });

  it('is "delivered" when the approved quantity meets or exceeds what was requested', () => {
    expect(derivePackingStatus({ requestedQty: 10, approvedQty: 10 })).toBe('delivered');
    expect(derivePackingStatus({ requestedQty: 10, approvedQty: 12 })).toBe('delivered');
  });

  it('is "partlyApproved" when some but not all of the request was approved', () => {
    expect(derivePackingStatus({ requestedQty: 10, approvedQty: 4 })).toBe('partlyApproved');
  });

  it('flags a shortfall whenever approved is less than requested', () => {
    expect(isPackingShortfall({ requestedQty: 10, approvedQty: 4 })).toBe(true);
    expect(isPackingShortfall({ requestedQty: 10, approvedQty: 10 })).toBe(false);
  });
});

describe('summarizeTrend', () => {
  it('finds the best and slowest day and the daily average', () => {
    const daily = [
      { date: '2026-10-14', sales: 30_000 },
      { date: '2026-10-15', sales: 46_650 },
      { date: '2026-10-16', sales: 48_650 },
    ];
    const summary = summarizeTrend(daily);
    expect(summary.bestDay).toEqual({ date: '2026-10-16', sales: 48_650 });
    expect(summary.slowestDay).toEqual({ date: '2026-10-14', sales: 30_000 });
    expect(summary.averageDailyRevenue).toBeCloseTo((30_000 + 46_650 + 48_650) / 3, 5);
  });

  it('treats a real Rs. 0 day as the slowest day, not an excluded gap', () => {
    const daily = [
      { date: '2026-10-14', sales: 0 },
      { date: '2026-10-15', sales: 500 },
    ];
    expect(summarizeTrend(daily).slowestDay).toEqual({ date: '2026-10-14', sales: 0 });
  });

  it('returns nulls for an empty range rather than throwing', () => {
    expect(summarizeTrend([])).toEqual({ bestDay: null, slowestDay: null, averageDailyRevenue: 0 });
  });
});
