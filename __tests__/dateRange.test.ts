/**
 * @format
 */
import { isValidDateRange, resolveDateRangePreset } from '@/shared/utils/dateRange';

describe('resolveDateRangePreset', () => {
  const today = '2026-10-16';

  it('today is a single-day range', () => {
    expect(resolveDateRangePreset('today', today)).toEqual({ from: '2026-10-16', to: '2026-10-16' });
  });

  it('last7 spans 7 days inclusive of today', () => {
    expect(resolveDateRangePreset('last7', today)).toEqual({ from: '2026-10-10', to: '2026-10-16' });
  });

  it('thisMonth starts at the 1st of the current month and ends today', () => {
    expect(resolveDateRangePreset('thisMonth', today)).toEqual({ from: '2026-10-01', to: '2026-10-16' });
  });

  it('last90 spans 90 days inclusive of today', () => {
    expect(resolveDateRangePreset('last90', today)).toEqual({ from: '2026-07-19', to: '2026-10-16' });
  });
});

describe('isValidDateRange', () => {
  it('accepts a well-formed range where from is before to', () => {
    expect(isValidDateRange('2026-10-01', '2026-10-16')).toBe(true);
  });

  it('accepts a single-day range (from equals to)', () => {
    expect(isValidDateRange('2026-10-16', '2026-10-16')).toBe(true);
  });

  it('rejects a range where from is after to', () => {
    expect(isValidDateRange('2026-10-16', '2026-10-01')).toBe(false);
  });

  it('rejects malformed dates', () => {
    expect(isValidDateRange('not-a-date', '2026-10-16')).toBe(false);
    expect(isValidDateRange('2026-10-01', '16 Oct 2026')).toBe(false);
  });
});
