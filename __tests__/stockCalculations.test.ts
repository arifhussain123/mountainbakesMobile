/**
 * @format
 */
import type { ProductionOrder, StockRow } from '@/api';
import {
  classifyCount,
  computeTotals,
  computeWaitingDemand,
  filterListedRows,
  hasStockActivity,
  isHeldForStockCheck,
  summarizeClassifications,
  withExpectedBalance,
} from '@/features/stock/calculations';

function row(overrides: Partial<StockRow> = {}): StockRow {
  return {
    productId: 'p1',
    stockCode: 'STK-000001',
    productName: 'Cream Puff',
    isActive: true,
    opening: 0,
    newQty: 0,
    sold: 0,
    returned: 0,
    adjustment: 0,
    balance: 0,
    ...overrides,
  };
}

function order(overrides: Partial<ProductionOrder> = {}): ProductionOrder {
  return {
    id: 'o1',
    demandNumber: 'DEM-000001',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    date: '2026-10-16',
    time: '08:00',
    items: [],
    status: 'pending',
    createdBy: 'u1',
    createdByName: 'User',
    submittedAt: '2026-10-16T08:00:00.000Z',
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    ...overrides,
  };
}

describe('hasStockActivity / filterListedRows', () => {
  it('keeps a row with any nonzero figure', () => {
    expect(hasStockActivity(row({ newQty: 1 }))).toBe(true);
    expect(hasStockActivity(row({ balance: 69 }))).toBe(true);
  });

  it('drops a row with every figure at zero', () => {
    expect(hasStockActivity(row())).toBe(false);
  });

  it('does not treat a nonzero adjustment alone as activity — ported verbatim from the web, not "fixed"', () => {
    expect(hasStockActivity(row({ adjustment: 5 }))).toBe(false);
  });

  it('filterListedRows keeps only rows with activity', () => {
    const rows = [row({ productId: 'a', balance: 69 }), row({ productId: 'b' })];
    expect(filterListedRows(rows).map((r) => r.productId)).toEqual(['a']);
  });
});

describe('isHeldForStockCheck', () => {
  it('counts a positive balance as held', () => {
    expect(isHeldForStockCheck(row({ balance: 5 }))).toBe(true);
  });

  it('counts a NEGATIVE balance as held too — matches the web, not a literal "balance > 0"', () => {
    expect(isHeldForStockCheck(row({ balance: -3 }))).toBe(true);
  });

  it('a zero balance is not held', () => {
    expect(isHeldForStockCheck(row({ balance: 0 }))).toBe(false);
  });
});

describe('the TOTAL row reconciles: 66 + 154 - 150 - 1 + 0 = 69', () => {
  it('computes balance correctly with the server-provided signs (sold/returned already positive)', () => {
    const r = row({ opening: 66, newQty: 154, sold: 150, returned: 1, adjustment: 0, balance: 69 });
    const computedBalance = r.opening + r.newQty - r.sold - r.returned + r.adjustment;
    expect(computedBalance).toBe(69);
    expect(computedBalance).toBe(r.balance);
  });
});

describe('computeWaitingDemand', () => {
  it('sums effective qty (approvedQty ?? qty) across pending/awaiting_verification orders only, per product', () => {
    const orders: ProductionOrder[] = [
      order({
        status: 'pending',
        items: [
          { productId: 'p1', productName: 'Cream Puff', qty: 20, remarks: '' },
          { productId: 'p2', productName: 'Pastry', qty: 10, approvedQty: 8, remarks: '' },
        ],
      }),
      order({
        status: 'awaiting_verification',
        items: [{ productId: 'p1', productName: 'Cream Puff', qty: 5, remarks: '' }],
      }),
      order({
        status: 'approved', // not waiting — must be excluded
        items: [{ productId: 'p1', productName: 'Cream Puff', qty: 100, remarks: '' }],
      }),
    ];

    const result = computeWaitingDemand(orders);
    expect(result.get('p1')).toBe(25); // 20 + 5, approved order excluded
    expect(result.get('p2')).toBe(8); // approvedQty overrides qty
    expect(result.has('p3')).toBe(false);
  });
});

describe('withExpectedBalance / computeTotals', () => {
  it('expectedBalance = balance + waitingDemand, and totals sum across rows', () => {
    const rows = [row({ productId: 'p1', balance: 69, opening: 66, newQty: 154, sold: 150, returned: 1 })];
    const demand = new Map([['p1', 4]]);
    const withDemand = withExpectedBalance(rows, demand);
    expect(withDemand[0]!.waitingDemand).toBe(4);
    expect(withDemand[0]!.expectedBalance).toBe(73);

    const totals = computeTotals(withDemand);
    expect(totals.balance).toBe(69);
    expect(totals.waitingDemand).toBe(4);
    expect(totals.expectedBalance).toBe(73);
  });

  it('defaults waitingDemand to 0 for a product with no outstanding order', () => {
    const rows = [row({ productId: 'p9', balance: 10 })];
    const [withDemand] = withExpectedBalance(rows, new Map());
    expect(withDemand!.waitingDemand).toBe(0);
    expect(withDemand!.expectedBalance).toBe(10);
  });
});

describe('classifyCount / summarizeClassifications', () => {
  it('treats an empty string as not counted, distinct from an explicit 0', () => {
    expect(classifyCount(row({ balance: 5 }), undefined).verdict).toBe('notCounted');
    expect(classifyCount(row({ balance: 5 }), '').verdict).toBe('notCounted');
    expect(classifyCount(row({ balance: 5 }), '0').verdict).toBe('short');
  });

  it('classifies matched/short/over from counted - balance', () => {
    expect(classifyCount(row({ balance: 10 }), '10').verdict).toBe('matched');
    expect(classifyCount(row({ balance: 10 }), '8').verdict).toBe('short');
    expect(classifyCount(row({ balance: 10 }), '12').verdict).toBe('over');
  });

  it('summarizes verdict counts', () => {
    const rows = [row({ productId: 'a', balance: 10 }), row({ productId: 'b', balance: 5 }), row({ productId: 'c', balance: 2 })];
    const counts: Record<string, string> = { a: '10', b: '3' };
    const classifications = rows.map((r) => classifyCount(r, counts[r.productId]));
    const summary = summarizeClassifications(classifications);
    expect(summary).toEqual({ matched: 1, short: 1, over: 0, notCounted: 1 });
  });
});
