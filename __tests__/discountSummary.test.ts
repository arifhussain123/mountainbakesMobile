/**
 * @format
 */
import type { DiscountSummaryTotals, MonthlyDiscountSummary } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { buildDiscountSummaryBoxes, formatDiscountWindow, formatStaleNotice } from '@/features/discounts/discountSummary';

const zero = { amount: 0, count: 0 };
const empty: DiscountSummaryTotals = { submitted: zero, pending: zero, approved: zero, rejected: zero, returned: zero };

/** The figures the backend's integration test pins for 1–18 Oct 2026. */
const dha: DiscountSummaryTotals = {
  submitted: { amount: 1170.5, count: 4 },
  pending: { amount: 300, count: 1 },
  approved: { amount: 750.5, count: 2 },
  rejected: { amount: 120, count: 1 },
  returned: zero,
};

function summary(overrides: Partial<MonthlyDiscountSummary> = {}): MonthlyDiscountSummary {
  return {
    from: '2026-10-01',
    to: '2026-10-18',
    branches: [
      { branchId: 'd', branchName: 'Bahria Branch', ...empty },
      { branchId: 'a', branchName: 'Mountain Bakes DHA Branch', ...dha },
    ],
    totals: dha,
    ...overrides,
  };
}

describe('formatDiscountWindow', () => {
  it('states the server-reported window in the web\'s wording', () => {
    expect(formatDiscountWindow('2026-10-01', '2026-10-18')).toBe('1 October 2026 – 18 October 2026');
  });

  it('handles a one-day window across the year', () => {
    expect(formatDiscountWindow('2027-01-01', '2027-01-01')).toBe('1 January 2027 – 1 January 2027');
  });

  it('a leap-year February runs to the 29th', () => {
    expect(formatDiscountWindow('2028-02-01', '2028-02-29')).toBe('1 February 2028 – 29 February 2028');
  });
});

describe('formatStaleNotice', () => {
  it('names when the figures on screen were loaded', () => {
    expect(formatStaleNotice(new Date(2026, 9, 18, 9, 15).getTime())).toBe(
      'Could not refresh — showing the figures loaded at 9:15 AM, 18 Oct. They may be out of date.',
    );
  });

  it('still warns when the load time is unknown', () => {
    expect(formatStaleNotice(0)).toBe('Could not refresh — showing the figures loaded earlier. They may be out of date.');
  });
});

describe('buildDiscountSummaryBoxes', () => {
  it('shows the APPROVED amount as Total Discount, with pending on its own line', () => {
    const [, a] = buildDiscountSummaryBoxes(summary());
    expect(a!.name).toBe('DHA Branch');
    expect(a!.total).toBe('Rs. 750.5'); // the app-wide formatter, same as the web's
    expect(a!.approvedLine).toBe('2 claims approved');
    expect(a!.pendingLine).toBe('Rs. 300 awaiting review · 1 claim');
  });

  it('a branch with no claims shows Rs. 0 and no pending line', () => {
    const [bahria] = buildDiscountSummaryBoxes(summary());
    expect(bahria!.total).toBe('Rs. 0');
    expect(bahria!.approvedLine).toBe('0 claims approved');
    expect(bahria!.pendingLine).toBeNull();
  });

  it('adds All Branches only on Production\'s view with more than one branch', () => {
    expect(buildDiscountSummaryBoxes(summary()).some((b) => b.key === 'all')).toBe(false);
    const prod = buildDiscountSummaryBoxes(summary(), { showBranches: true });
    expect(prod.map((b) => b.key)).toEqual(['d', 'a', 'all']);
    expect(prod[2]!.emphasis).toBe(true);
    const one = buildDiscountSummaryBoxes(summary({ branches: [{ branchId: 'a', branchName: 'DHA Branch', ...dha }] }), { showBranches: true });
    expect(one.map((b) => b.key)).toEqual(['a']);
  });
});

describe('discount summary cache keys', () => {
  it('sit under the prefixes every discount write already invalidates', () => {
    expect(queryKeys.branchDiscountSummary('2026-10-18')[0]).toBe('branchDiscounts');
    expect(queryKeys.productionDiscountSummary(null, '2026-10-18')[0]).toBe('productionDiscounts');
  });

  it('change with the business date, so a new month is never served last month’s figures', () => {
    expect(queryKeys.branchDiscountSummary('2026-11-01')).not.toEqual(queryKeys.branchDiscountSummary('2026-10-31'));
    expect(queryKeys.productionDiscountSummary(null, '2027-01-01')).not.toEqual(queryKeys.productionDiscountSummary(null, '2026-12-31'));
  });
});
