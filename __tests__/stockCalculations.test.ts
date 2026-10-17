/**
 * @format
 */
import type { ProductionOrder, StockRow } from '@/api';
import {
  buildCheckResult,
  classifyCount,
  computeTotals,
  computeWaitingDemand,
  filterListedRows,
  hasStockActivity,
  isHeldForStockCheck,
  parseCountInput,
  sortStockRows,
  withExpectedBalance,
  type StockCheckItem,
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

describe('parseCountInput', () => {
  it('treats an empty string / undefined as not counted, distinct from an explicit 0', () => {
    expect(parseCountInput(undefined)).toBeNull();
    expect(parseCountInput('')).toBeNull();
    expect(parseCountInput('   ')).toBeNull();
    expect(parseCountInput('0')).toBe(0);
  });
});

describe('classifyCount', () => {
  it('classifies matched/surplus/deficit from counted vs balance', () => {
    expect(classifyCount(10, 10)).toBe('matched');
    expect(classifyCount(10, 8)).toBe('deficit');
    expect(classifyCount(10, 12)).toBe('surplus');
  });

  it('a count of 0 against a positive balance is a deficit', () => {
    expect(classifyCount(2, 0)).toBe('deficit');
  });
});

function item(overrides: Partial<StockCheckItem> = {}): StockCheckItem {
  return { productId: 'p1', productName: 'Cream Puff', balance: 0, counted: 0, ...overrides };
}

describe('buildCheckResult', () => {
  it('all matched: nothing listed, matchedCount reflects every item', () => {
    const result = buildCheckResult([item({ balance: 4, counted: 4 }), item({ productId: 'p2', balance: 3, counted: 3 })]);
    expect(result.surplus).toEqual([]);
    expect(result.deficit).toEqual([]);
    expect(result.matchedCount).toBe(2);
  });

  it('only surplus: Dry Cake 5 vs balance 4', () => {
    const result = buildCheckResult([item({ productId: 'dry-cake', productName: 'Dry Cake', balance: 4, counted: 5 })]);
    expect(result.surplus).toEqual([
      { productId: 'dry-cake', productName: 'Dry Cake', balance: 4, counted: 5, diff: 1, verdict: 'surplus' },
    ]);
    expect(result.deficit).toEqual([]);
    expect(result.matchedCount).toBe(0);
  });

  it('only deficit: Banana Bread 2 vs balance 3', () => {
    const result = buildCheckResult([item({ productId: 'banana-bread', productName: 'Banana Bread', balance: 3, counted: 2 })]);
    expect(result.deficit).toEqual([
      { productId: 'banana-bread', productName: 'Banana Bread', balance: 3, counted: 2, diff: -1, verdict: 'deficit' },
    ]);
    expect(result.surplus).toEqual([]);
    expect(result.matchedCount).toBe(0);
  });

  it('mixed: reference scenario — Dry Cake 5 (balance 4) and Banana Bread 2 (balance 3)', () => {
    const result = buildCheckResult([
      item({ productId: 'dry-cake', productName: 'Dry Cake', balance: 4, counted: 5 }),
      item({ productId: 'banana-bread', productName: 'Banana Bread', balance: 3, counted: 2 }),
    ]);
    expect(result.surplus).toHaveLength(1);
    expect(result.surplus[0]!.diff).toBe(1);
    expect(result.deficit).toHaveLength(1);
    expect(result.deficit[0]!.diff).toBe(-1);
    expect(result.matchedCount).toBe(0);
  });

  it('uncounted products are never passed in — buildCheckResult has no notion of "not counted"', () => {
    // The caller is responsible for filtering via parseCountInput before calling this.
    const result = buildCheckResult([item({ balance: 4, counted: 4 })]);
    expect(result.matchedCount).toBe(1);
  });

  it('a count of 0 against a balance of 2 is a deficit of -2, not ignored', () => {
    const result = buildCheckResult([item({ productId: 'p1', balance: 2, counted: 0 })]);
    expect(result.deficit).toEqual([{ productId: 'p1', productName: 'Cream Puff', balance: 2, counted: 0, diff: -2, verdict: 'deficit' }]);
  });

  it('reference scenario 2: Dry Cake 4 and Banana Bread 3 — both matched, nothing listed', () => {
    const result = buildCheckResult([
      item({ productId: 'dry-cake', productName: 'Dry Cake', balance: 4, counted: 4 }),
      item({ productId: 'banana-bread', productName: 'Banana Bread', balance: 3, counted: 3 }),
    ]);
    expect(result.surplus).toEqual([]);
    expect(result.deficit).toEqual([]);
    expect(result.matchedCount).toBe(2);
  });
});

describe('editing after Verify', () => {
  it('re-running buildCheckResult with an updated count produces a fresh result — nothing is cached/stale', () => {
    const before = buildCheckResult([item({ productId: 'p1', balance: 4, counted: 5 })]);
    expect(before.surplus).toHaveLength(1);

    // Simulates "Edit counts" -> change the count -> Verify again.
    const after = buildCheckResult([item({ productId: 'p1', balance: 4, counted: 4 })]);
    expect(after.surplus).toEqual([]);
    expect(after.matchedCount).toBe(1);
  });
});

describe('sortStockRows', () => {
  const rows = [
    row({ productId: 'a', productName: 'Banana Bread', stockCode: 'STK-000002', balance: 10, opening: 2 }),
    row({ productId: 'b', productName: 'Apple Tart', stockCode: 'STK-000001', balance: 30, opening: 1 }),
    row({ productId: 'c', productName: 'Cream Puff', stockCode: 'STK-000003', balance: 20, opening: 3 }),
  ];

  it('defaults to balance, high to low', () => {
    const sorted = sortStockRows(rows, 'balance', 'desc');
    expect(sorted.map((r) => r.productId)).toEqual(['b', 'c', 'a']);
  });

  it('flips to low-to-high when direction is "asc"', () => {
    const sorted = sortStockRows(rows, 'balance', 'asc');
    expect(sorted.map((r) => r.productId)).toEqual(['a', 'c', 'b']);
  });

  it('sorts product name A-Z with locale compare, not code-point order', () => {
    const sorted = sortStockRows(rows, 'productName', 'asc');
    expect(sorted.map((r) => r.productName)).toEqual(['Apple Tart', 'Banana Bread', 'Cream Puff']);
  });

  it('sorts product name Z-A when direction is "desc"', () => {
    const sorted = sortStockRows(rows, 'productName', 'desc');
    expect(sorted.map((r) => r.productName)).toEqual(['Cream Puff', 'Banana Bread', 'Apple Tart']);
  });

  it('sorts a numeric field other than balance', () => {
    const sorted = sortStockRows(rows, 'opening', 'desc');
    expect(sorted.map((r) => r.productId)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const original = [...rows];
    sortStockRows(rows, 'balance', 'asc');
    expect(rows).toEqual(original);
  });
});
