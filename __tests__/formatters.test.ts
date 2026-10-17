/**
 * @format
 */
import { formatCurrency, formatDisplayDate, formatDisplayTime, formatRelativeTime } from '@/shared/utils';

describe('formatCurrency', () => {
  it('formats a whole number with thousands separators', () => {
    expect(formatCurrency(34050)).toBe('Rs. 34,050');
  });

  it('formats a negative amount with the minus sign after "Rs. "', () => {
    expect(formatCurrency(-850)).toBe('Rs. -850');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('Rs. 0');
  });

  it('shows a half-rupee amount with one decimal place, not rounded away', () => {
    // Real, routine case: a company-share split commonly ends in .50 (e.g.
    // Rs. 19,387.5) — this must render exactly, not round to the nearest rupee.
    expect(formatCurrency(19387.5)).toBe('Rs. 19,387.5');
    expect(formatCurrency(30112.5)).toBe('Rs. 30,112.5');
  });

  it('drops a trailing .00 for a whole-rupee amount, even when computed as a float', () => {
    expect(formatCurrency(1200.0)).toBe('Rs. 1,200');
  });

  it('rounds to the nearest paisa to absorb floating-point noise, never to whole rupees', () => {
    expect(formatCurrency(1199.999999)).toBe('Rs. 1,200');
    expect(formatCurrency(19387.500001)).toBe('Rs. 19,387.5');
  });

  // The Dashboard's "Last 7 Days"/"Top Products" cards used to show "Rs. NaN"
  // because the field names read off the API response (`revenue`/`orders`,
  // `totalRevenue`/`totalQty`) didn't exist on the actual payload (`sales`/
  // `transactions`, `sales`/`qty`) — every value was `undefined` by the time
  // it reached here. That's fixed at the source (api/types.ts) now, but this
  // is the backstop: whatever reaches formatCurrency that isn't a finite
  // number renders as "-", never "NaN".
  it('returns "-" for undefined', () => {
    expect(formatCurrency(undefined)).toBe('-');
  });

  it('returns "-" for null', () => {
    expect(formatCurrency(null)).toBe('-');
  });

  it('returns "-" for NaN', () => {
    expect(formatCurrency(NaN)).toBe('-');
  });

  it('returns "-" for Infinity/-Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('-');
    expect(formatCurrency(-Infinity)).toBe('-');
  });

  it('returns "-" for a non-numeric string', () => {
    expect(formatCurrency('not-a-number')).toBe('-');
    expect(formatCurrency('')).toBe('-');
  });

  it('formats a numeric string the same as its number equivalent', () => {
    expect(formatCurrency('34050')).toBe('Rs. 34,050');
    expect(formatCurrency('19387.5')).toBe('Rs. 19,387.5');
  });
});

describe('formatDisplayDate', () => {
  it('formats an ISO date as "DD Mon YYYY"', () => {
    expect(formatDisplayDate('2026-10-12')).toBe('12 Oct 2026');
  });

  it('returns the raw input unchanged when it cannot be parsed', () => {
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDisplayTime', () => {
  it('formats an ISO timestamp as 12-hour time with AM/PM', () => {
    expect(formatDisplayTime('2026-10-12T20:45:00.000Z')).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
  });

  it('returns an empty string when it cannot be parsed', () => {
    expect(formatDisplayTime('not-a-timestamp')).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-10-17T12:00:00.000Z');

  it('is "Just now" for under a minute', () => {
    expect(formatRelativeTime('2026-10-17T11:59:30.000Z', NOW)).toBe('Just now');
  });

  it('is "Xm ago" under an hour', () => {
    expect(formatRelativeTime('2026-10-17T11:45:00.000Z', NOW)).toBe('15m ago');
  });

  it('is "Xh ago" under a day', () => {
    expect(formatRelativeTime('2026-10-17T09:00:00.000Z', NOW)).toBe('3h ago');
  });

  it('is "Xd ago" under a week', () => {
    expect(formatRelativeTime('2026-10-15T12:00:00.000Z', NOW)).toBe('2d ago');
  });

  it('falls back to the plain date at a week or more', () => {
    expect(formatRelativeTime('2026-10-01T12:00:00.000Z', NOW)).toBe('01 Oct 2026');
  });

  it('returns the plain date for a timestamp in the future (clock skew) rather than a negative duration', () => {
    expect(formatRelativeTime('2026-10-18T12:00:00.000Z', NOW)).toBe('18 Oct 2026');
  });

  it('returns empty string for an unparseable timestamp', () => {
    expect(formatRelativeTime('not-a-timestamp', NOW)).toBe('');
  });
});
