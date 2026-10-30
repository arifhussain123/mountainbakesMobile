/**
 * @format
 */
import type { MonthlyReturnsSummary, ReturnsSummaryTotals } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import {
  branchReturnAmount,
  buildBranchReturnBoxes,
  buildReturnsSummaryTiles,
  formatAwaitingLine,
  formatBoxAmount,
  scopedReturnsTotals,
  describeBucket,
  describeProductLine,
  describeReturnValue,
  formatReturnsWindow,
  reportingBranches,
  unpricedNote,
} from '@/features/stock/returnsSummary';

const LABELS = { pending: 'Awaiting Review', accepted: 'Approved', rejected: 'Rejected', returned: 'Sent Back' };

/** The overall figures the backend's integration test pins for 1–18 Oct 2026. */
function totals(overrides: Partial<ReturnsSummaryTotals> = {}): ReturnsSummaryTotals {
  return {
    submitted: { qty: 11, amount: 1450, count: 6 },
    pending: { qty: 4, amount: 300, count: 2 },
    accepted: { qty: 4, amount: 650, count: 2 },
    rejected: { qty: 1, amount: 200, count: 1 },
    returned: { qty: 2, amount: 300, count: 1 },
    unpricedCount: 0,
    ...overrides,
  };
}

function summary(t: ReturnsSummaryTotals = totals(), overrides: Partial<MonthlyReturnsSummary> = {}): MonthlyReturnsSummary {
  return {
    from: '2026-10-01',
    to: '2026-10-18',
    branches: [
      { branchId: 'a', branchName: 'DHA Branch', ...t, products: [] },
      { branchId: 'b', branchName: 'Gulshan Branch', ...t, products: [] },
      { branchId: 'c', branchName: 'Bahria Branch', ...t, products: [] },
    ],
    totals: t,
    products: [],
    branchesReporting: 2,
    ...overrides,
  };
}

describe('formatReturnsWindow', () => {
  it('states the server-reported window in full', () => {
    expect(formatReturnsWindow('2026-10-01', '2026-10-18')).toBe('1 October 2026 – 18 October 2026');
  });

  it('handles a one-day window on the 1st, including across the year', () => {
    expect(formatReturnsWindow('2027-01-01', '2027-01-01')).toBe('1 January 2027 – 1 January 2027');
  });
});

describe('buildReturnsSummaryTiles', () => {
  it('lays out the server figures without changing any of them, in the web\'s order', () => {
    const tiles = buildReturnsSummaryTiles(summary(), LABELS);
    expect(tiles.map((t) => [t.label, t.value])).toEqual([
      ['Total Returned Items', '11'],
      ['Total Return Amount', 'Rs. 1,450'],
      ['Return Transactions', '6'],
      ['Approved', 'Rs. 650'],
      ['Awaiting Review', 'Rs. 300'],
      ['Rejected', 'Rs. 200'],
      ['Sent Back', 'Rs. 300'],
    ]);
    expect(tiles.find((t) => t.key === 'accepted')!.sub).toBe('4 items · 2 returns');
  });

  it('adds Branches Reporting only on Production\'s all-branch view', () => {
    expect(buildReturnsSummaryTiles(summary(), LABELS).some((t) => t.key === 'branches')).toBe(false);
    const branches = buildReturnsSummaryTiles(summary(), LABELS, { showBranches: true }).find((t) => t.key === 'branches')!;
    expect(branches.value).toBe('2');
    expect(branches.sub).toBe('of 3 branches');
  });

  it('keeps the month\'s total and the Approved figure as separate tiles', () => {
    const tiles = buildReturnsSummaryTiles(summary(), LABELS);
    expect(tiles.find((t) => t.key === 'amount')!.value).not.toBe(tiles.find((t) => t.key === 'accepted')!.value);
    expect(tiles.find((t) => t.key === 'accepted')!.tone).toBe('success');
  });

  it('an empty month is all zeros, not blanks', () => {
    const zero = { qty: 0, amount: 0, count: 0 };
    const empty = { submitted: zero, pending: zero, accepted: zero, rejected: zero, returned: zero, unpricedCount: 0 };
    const tiles = buildReturnsSummaryTiles(summary(empty, { branchesReporting: 0 }), LABELS, { showBranches: true });
    expect(tiles.map((t) => t.value)).toEqual(['0', 'Rs. 0', '0', '0', 'Rs. 0', 'Rs. 0', 'Rs. 0', 'Rs. 0']);
  });
});

describe('reportingBranches', () => {
  const zero = { qty: 0, amount: 0, count: 0 };
  const empty = { submitted: zero, pending: zero, accepted: zero, rejected: zero, returned: zero, unpricedCount: 0 };

  it('lists only the branches with a return this month, in the server\'s order', () => {
    const s = summary(totals(), {
      branches: [
        { branchId: 'a', branchName: 'DHA Branch', ...totals(), products: [] },
        { branchId: 'b', branchName: 'Gulshan Branch', ...empty, products: [] },
        { branchId: 'c', branchName: 'Bahria Branch', ...totals(), products: [] },
      ],
    });
    expect(reportingBranches(s).map((b) => b.branchId)).toEqual(['a', 'c']);
  });

  it('is empty in a month with no returns anywhere', () => {
    const s = summary(empty, { branchesReporting: 0 });
    expect(reportingBranches(s)).toEqual([]);
  });

  it('a branch whose only returns were rejected still reports', () => {
    const rejectedOnly = { ...empty, submitted: { qty: 1, amount: 200, count: 1 }, rejected: { qty: 1, amount: 200, count: 1 } };
    const s = summary(totals(), { branches: [{ branchId: 'a', branchName: 'DHA Branch', ...rejectedOnly, products: [] }] });
    expect(reportingBranches(s)).toHaveLength(1);
  });
});

describe('describeReturnValue / describeProductLine', () => {
  it('states a row\'s code, unit price on the day, quantity and amount', () => {
    expect(describeReturnValue({ qty: 2, productCode: 'FP-01', unitPrice: 150, amount: 300 })).toBe('FP-01 · Rs. 150 × 2 = Rs. 300');
  });

  it('says a row has no price rather than showing Rs. 0', () => {
    expect(describeReturnValue({ qty: 2, productCode: null, unitPrice: null, amount: null })).toBe('No price on record');
  });

  it('describes an item-wise line', () => {
    expect(describeProductLine({ productId: 'p', productName: 'Lotus', productCode: null, qty: 5, amount: 750, count: 2 })).toBe('5 items · Rs. 750');
  });
});

describe('describeBucket / unpricedNote', () => {
  it('singularises one return', () => {
    expect(describeBucket({ qty: 1, amount: 150, count: 1 })).toBe('1 item · 1 return');
  });

  it('only warns when some return has no price', () => {
    expect(unpricedNote(totals())).toBeNull();
    expect(unpricedNote(totals({ unpricedCount: 1 }))).toContain('1 return has no price on record');
    expect(unpricedNote(totals({ unpricedCount: 3 }))).toContain('3 returns have no price on record');
  });
});

describe('summary cache keys', () => {
  it('sit under the prefixes every return write already invalidates', () => {
    expect(queryKeys.branchReturnsSummary('2026-10-18')[0]).toBe('branchReturns');
    expect(queryKeys.productionReturnsSummary(null, '2026-10-18')[0]).toBe('productionReturns');
  });

  it('change with the business date and the branch, so a new month is never served last month’s figures', () => {
    expect(queryKeys.branchReturnsSummary('2026-11-01')).not.toEqual(queryKeys.branchReturnsSummary('2026-10-31'));
    expect(queryKeys.productionReturnsSummary('b1', '2026-10-18')).not.toEqual(queryKeys.productionReturnsSummary(null, '2026-10-18'));
  });
});

describe('Monthly Return Amount by Branch', () => {
  const zero = { qty: 0, amount: 0, count: 0 };
  const dha = totals({
    accepted: { qty: 4, amount: 12000, count: 2 },
    pending: { qty: 2, amount: 400.1, count: 1 },
    returned: { qty: 1, amount: 99.9, count: 1 },
    rejected: { qty: 3, amount: 777, count: 1 },
  });
  const onlyRejected = totals({ accepted: zero, pending: zero, returned: zero, rejected: { qty: 1, amount: 150, count: 1 } });
  const s = summary(totals(), {
    branches: [
      { branchId: 'a', branchName: 'DHA Branch', ...dha, products: [] },
      { branchId: 'b', branchName: 'Gulshan Branch', ...onlyRejected, products: [] },
      { branchId: 'x', branchName: 'Closed Branch', ...dha, products: [] },
    ],
  });
  const branches = [
    { id: 'b', name: 'Gulshan Branch', isActive: true },
    { id: 'a', name: 'Mountain Bakes DHA Branch', isActive: true },
    { id: 'c', name: 'Bahria Branch' },
    { id: 'x', name: 'Closed Branch', isActive: false },
  ];

  it('counts approved, awaiting review and sent back — never rejected — in whole paisa', () => {
    expect(branchReturnAmount(dha)).toBe(12500);
    expect(branchReturnAmount(onlyRejected)).toBe(0);
  });

  it('one box per active branch, alphabetical on the full name, matched by id', () => {
    expect(buildBranchReturnBoxes(s, branches).map((b) => [b.branchId, b.name, b.total])).toEqual([
      ['c', 'Bahria Branch', 'Rs. 0.00'],
      ['b', 'Gulshan Branch', 'Rs. 0.00'],
      ['a', 'DHA Branch', 'Rs. 12,500.00'],
    ]);
  });

  it('each box carries its amount awaiting review and claim count', () => {
    const boxes = buildBranchReturnBoxes(s, branches);
    expect(boxes.map((b) => formatAwaitingLine(b, 'Awaiting Review'))).toEqual([
      'Nothing awaiting review',
      'Nothing awaiting review',
      'Rs. 400.10 awaiting review · 1 claim',
    ]);
    expect(formatAwaitingLine({ awaitingAmount: 1250, awaitingCount: 3 }, 'Pending')).toBe('Rs. 1,250.00 pending · 3 claims');
  });

  it('formats box amounts with the paisa', () => {
    expect(formatBoxAmount(0)).toBe('Rs. 0.00');
    expect(formatBoxAmount(1234567.5)).toBe('Rs. 1,234,567.50');
  });

  it('a picked branch narrows the tiles to its own figures; an unknown one is all zeros', () => {
    expect(scopedReturnsTotals(s, null)).toBe(s.totals);
    expect(scopedReturnsTotals(s, 'a').accepted.amount).toBe(12000);
    expect(scopedReturnsTotals(s, 'nope').submitted).toEqual(zero);
    const tiles = buildReturnsSummaryTiles(s, LABELS, { showBranches: true, branchId: 'a' });
    expect(tiles.find((t) => t.key === 'accepted')!.value).toBe('Rs. 12,000');
  });
});
