import {
  DASHBOARD_RANGES,
  describeCustom,
  resolveRange,
} from '@/common/helpers/dashboardRange';
import { businessDateStr, businessDayBounds } from '@/shared/utils/timezone';

/**
 * Period selection.
 *
 * The rule being pinned is the one the server imposes and nothing in the type
 * system enforces: a request is either a **named** period or a `from`/`to`
 * range, never both. `getDateRange()` in `reports.routes.ts` ignores `from`/`to`
 * whenever the period is `daily | weekly | monthly | yearly`, so a chip that
 * sent a name *and* a range would silently report the wrong window.
 */

// 09:00 Karachi on 19 Aug — comfortably inside the business day of the 19th.
const MORNING = new Date('2026-08-19T04:00:00.000Z');
// 00:30 Karachi on 20 Aug — before the 02:00 rollover, so still the 19th.
const AFTER_MIDNIGHT = new Date('2026-08-19T19:30:00.000Z');

describe('resolveRange', () => {
  it('sends a bare name for the two ranges the server knows', () => {
    expect(resolveRange('today', undefined, MORNING)).toEqual({ period: 'daily' });
    expect(resolveRange('month', undefined, MORNING)).toEqual({ period: 'monthly' });
  });

  it('never sends a name together with a range', () => {
    for (const { key } of DASHBOARD_RANGES) {
      const range = resolveRange(key, { from: '2026-08-01', to: '2026-08-19' }, MORNING);
      const named = range.period !== 'custom';
      // A named period with bounds would have its bounds thrown away server-side.
      expect(named && (range.from !== undefined || range.to !== undefined)).toBe(false);
    }
  });

  it('bounds yesterday by the business day, not calendar midnight', () => {
    const range = resolveRange('yesterday', undefined, MORNING);
    const expected = businessDayBounds('2026-08-18');

    expect(range.period).toBe('custom');
    expect(range.from).toBe(expected.fromISO);
    expect(range.to).toBe(expected.toISO);
  });

  it('counts today as one of the 7 days', () => {
    const range = resolveRange('last7', undefined, MORNING);

    expect(range.from).toBe(businessDayBounds('2026-08-13').fromISO);
    expect(range.to).toBe(businessDayBounds('2026-08-19').toISO);
  });

  it('treats 00:30 as the previous business day', () => {
    // The 02:00 rollover is the whole point: a sale rung up at half past
    // midnight belongs to the evening it was made.
    expect(businessDateStr(AFTER_MIDNIGHT)).toBe('2026-08-19');
    expect(resolveRange('yesterday', undefined, AFTER_MIDNIGHT).from).toBe(
      businessDayBounds('2026-08-18').fromISO,
    );
  });

  it('swaps a backwards custom range rather than returning nothing', () => {
    const backwards = resolveRange('custom', { from: '2026-08-19', to: '2026-08-01' }, MORNING);
    const forwards = resolveRange('custom', { from: '2026-08-01', to: '2026-08-19' }, MORNING);

    expect(backwards).toEqual(forwards);
  });

  it('falls back to the month when custom is selected with no dates', () => {
    expect(resolveRange('custom', undefined, MORNING)).toEqual({ period: 'monthly' });
  });
});

describe('describeCustom', () => {
  it('reads as dates a person would say', () => {
    expect(describeCustom({ from: '2026-08-01', to: '2026-08-19' })).toBe('1 Aug – 19 Aug');
  });
});
