/**
 * @format
 */
import { formatRangeLabel, previousReportRange, rangeIncludesToday, resolveReportRange, stepReportRange } from '@/features/reports/ranges';

describe('resolveReportRange', () => {
  it('daily is a single business day', () => {
    expect(resolveReportRange('daily', '2026-10-16')).toEqual({ from: '2026-10-16', to: '2026-10-16' });
  });

  it('weekly is the Monday-Sunday calendar week containing the business date', () => {
    // 2026-10-16 is a Friday.
    expect(resolveReportRange('weekly', '2026-10-16')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('monthly resolves to the 1st through the last day of the month, in Karachi business-date terms — no Sep 30 leakage', () => {
    // Regression for the web client's bug: slicing a UTC ISO timestamp for
    // "2026-10-01T02:00+05:00" produces "2026-09-30". This builder works
    // entirely from business-date strings and must never reproduce that.
    expect(resolveReportRange('monthly', '2026-10-16')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('monthly handles a 16th-of-the-month anchor consistently regardless of which day of the month "today" is', () => {
    expect(resolveReportRange('monthly', '2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(resolveReportRange('monthly', '2026-10-31')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('yearly resolves to Jan 1 - Dec 31', () => {
    expect(resolveReportRange('yearly', '2026-10-16')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('stepReportRange', () => {
  it('steps a monthly anchor to the previous/next month', () => {
    expect(stepReportRange('monthly', '2026-10-16', 'prev')).toBe('2026-09-16');
    expect(stepReportRange('monthly', '2026-10-16', 'next')).toBe('2026-11-16');
  });

  it('steps a daily anchor by one day', () => {
    expect(stepReportRange('daily', '2026-10-16', 'prev')).toBe('2026-10-15');
  });
});

describe('previousReportRange', () => {
  it('returns the immediately preceding range of equal length', () => {
    expect(previousReportRange({ from: '2026-10-01', to: '2026-10-16' })).toEqual({ from: '2026-09-15', to: '2026-09-30' });
  });

  it('works for a single-day range', () => {
    expect(previousReportRange({ from: '2026-10-16', to: '2026-10-16' })).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });
});

describe('formatRangeLabel', () => {
  it('formats a single day', () => {
    expect(formatRangeLabel({ from: '2026-10-16', to: '2026-10-16' })).toBe('16 Oct 2026');
  });

  it('formats a range within the same year without repeating the year', () => {
    expect(formatRangeLabel({ from: '2026-10-01', to: '2026-10-31' })).toBe('1 Oct to 31 Oct 2026');
  });

  it('formats a range spanning two years with both years shown', () => {
    expect(formatRangeLabel({ from: '2025-12-20', to: '2026-01-05' })).toBe('20 Dec 2025 to 5 Jan 2026');
  });
});

describe('rangeIncludesToday', () => {
  it('is true when today falls inside the range', () => {
    expect(rangeIncludesToday({ from: '2026-10-01', to: '2026-10-31' }, '2026-10-16')).toBe(true);
  });

  it('is false for a past range', () => {
    expect(rangeIncludesToday({ from: '2026-09-01', to: '2026-09-30' }, '2026-10-16')).toBe(false);
  });
});
