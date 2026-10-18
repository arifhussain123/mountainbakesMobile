/**
 * @format
 */
import type { ReturnsSummaryTotals } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import {
  buildReturnsSummaryTiles,
  describeBucket,
  formatReturnsWindow,
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

describe('formatReturnsWindow', () => {
  it('states the server-reported window in full', () => {
    expect(formatReturnsWindow('2026-10-01', '2026-10-18')).toBe('1 October 2026 – 18 October 2026');
  });

  it('handles a one-day window on the 1st, including across the year', () => {
    expect(formatReturnsWindow('2027-01-01', '2027-01-01')).toBe('1 January 2027 – 1 January 2027');
  });
});

describe('buildReturnsSummaryTiles', () => {
  it('lays out the server figures without changing any of them', () => {
    const tiles = buildReturnsSummaryTiles(totals(), LABELS);
    expect(tiles.map((t) => [t.label, t.value])).toEqual([
      ['Total Returned Items', '11'],
      ['All Submitted', 'Rs. 1,450'],
      ['Approved', 'Rs. 650'],
      ['Awaiting Review', 'Rs. 300'],
      ['Rejected', 'Rs. 200'],
      ['Sent Back', 'Rs. 300'],
    ]);
    expect(tiles[0]!.sub).toBe('6 returns');
    expect(tiles[2]!.sub).toBe('4 items · 2 returns');
  });

  it('keeps All Submitted and Approved as separate tiles', () => {
    const tiles = buildReturnsSummaryTiles(totals(), LABELS);
    const submitted = tiles.find((t) => t.key === 'submitted')!;
    const approved = tiles.find((t) => t.key === 'accepted')!;
    expect(submitted.value).not.toBe(approved.value);
    expect(approved.tone).toBe('success');
  });

  it('an empty month is all zeros, not blanks', () => {
    const zero = { qty: 0, amount: 0, count: 0 };
    const tiles = buildReturnsSummaryTiles(
      { submitted: zero, pending: zero, accepted: zero, rejected: zero, returned: zero, unpricedCount: 0 },
      LABELS,
    );
    expect(tiles.map((t) => t.value)).toEqual(['0', 'Rs. 0', 'Rs. 0', 'Rs. 0', 'Rs. 0', 'Rs. 0']);
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
