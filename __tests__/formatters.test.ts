/**
 * @format
 */
import {
  formatCount,
  formatCurrency,
  formatDisplayDate,
  formatDisplayTime,
  formatPercent,
  formatRelativeTime,
  formatSigned,
  percentChange,
  percentOf,
} from '@/shared/utils';

// Rejected values log a dev-only `console.warn` (once per formatter+field).
// Silenced for the whole file so the expected warnings don't clutter output;
// the tests that care about the warning assert on this spy directly.
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

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

  it('returns "-" (never "Rs. NaN") for a rejected value even when a field name is passed', () => {
    expect(formatCurrency(undefined, 'sales')).toBe('-');
    expect(formatCurrency(NaN, 'net')).toBe('-');
    expect(formatCurrency(null, 'expenses')).toBe('-');
  });

  it('warns in dev with the field name when it rejects a value', () => {
    formatCurrency(undefined, 'warnTest.sales');
    expect(warnSpy).toHaveBeenCalledWith('[formatCurrency] non-numeric value for "warnTest.sales": undefined');
  });

  it('shows a rejected string value quoted in the warning', () => {
    formatCurrency('abc', 'warnTest.stringAmount');
    expect(warnSpy).toHaveBeenCalledWith('[formatCurrency] non-numeric value for "warnTest.stringAmount": "abc"');
  });

  it('warns only once per field, however many times it is rejected', () => {
    formatCurrency(NaN, 'warnTest.once');
    formatCurrency(NaN, 'warnTest.once');
    formatCurrency(undefined, 'warnTest.once');
    expect(warnSpy.mock.calls.filter(([msg]) => String(msg).includes('"warnTest.once"'))).toHaveLength(1);
  });

  it('does not warn for a valid amount', () => {
    formatCurrency(34050, 'warnTest.valid');
    formatCurrency('19387.5', 'warnTest.valid');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn outside __DEV__', () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    const previous = g.__DEV__;
    g.__DEV__ = false;
    try {
      expect(formatCurrency(undefined, 'warnTest.prod')).toBe('-');
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      g.__DEV__ = previous;
    }
  });
});

describe('formatCount', () => {
  it('formats a finite count as plain digits', () => {
    expect(formatCount(43)).toBe('43');
    expect(formatCount(0)).toBe('0');
    expect(formatCount(-7)).toBe('-7');
    expect(formatCount('12')).toBe('12');
  });

  it('returns "-" (never "NaN"/"undefined") for null/undefined/NaN/Infinity/""', () => {
    expect(formatCount(undefined)).toBe('-');
    expect(formatCount(null)).toBe('-');
    expect(formatCount(NaN)).toBe('-');
    expect(formatCount(Infinity)).toBe('-');
    expect(formatCount('')).toBe('-');
  });

  it('warns in dev with the field name when it rejects a value', () => {
    formatCount(undefined, 'warnTest.transactions');
    expect(warnSpy).toHaveBeenCalledWith('[formatCount] non-numeric value for "warnTest.transactions": undefined');
  });
});

describe('formatPercent', () => {
  it('formats to one decimal place by default', () => {
    expect(formatPercent(6.9603)).toBe('7.0%');
    expect(formatPercent(28)).toBe('28.0%');
  });

  it('honours digits', () => {
    expect(formatPercent(97.6, undefined, { digits: 0 })).toBe('98%');
  });

  it('prefixes "+" only on a positive value when signed', () => {
    expect(formatPercent(12.5, undefined, { signed: true })).toBe('+12.5%');
    expect(formatPercent(-3.2, undefined, { signed: true })).toBe('-3.2%');
    expect(formatPercent(0, undefined, { signed: true })).toBe('0.0%');
  });

  it('returns "-" for null (no base) without warning — a deliberate "no percentage"', () => {
    expect(formatPercent(null, 'warnTest.nullPct')).toBe('-');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns "-" (never "NaN%"/"Infinity%") for undefined/NaN/Infinity, and warns with the field name', () => {
    expect(formatPercent(undefined)).toBe('-');
    expect(formatPercent(Infinity)).toBe('-');
    expect(formatPercent(NaN, 'warnTest.share')).toBe('-');
    expect(warnSpy).toHaveBeenCalledWith('[formatPercent] non-numeric value for "warnTest.share": NaN');
  });
});

describe('percentOf', () => {
  it('computes part as a percentage of whole', () => {
    expect(percentOf(37, 40)).toBeCloseTo(92.5, 5);
  });

  it('returns null (not NaN/Infinity, not a fabricated 0) when the base is 0', () => {
    expect(percentOf(100, 0)).toBeNull();
    expect(percentOf(0, 0)).toBeNull();
  });

  it('returns null for a negative base', () => {
    expect(percentOf(5, -10)).toBeNull();
  });

  it('returns null for a non-finite input', () => {
    expect(percentOf(NaN, 10)).toBeNull();
    expect(percentOf(undefined as unknown as number, 10)).toBeNull();
    expect(percentOf(10, Infinity)).toBeNull();
  });

  it('renders as "-" for a 0 base through formatPercent', () => {
    expect(formatPercent(percentOf(2370, 0))).toBe('-');
  });
});

describe('percentChange', () => {
  it('computes the change against the previous figure', () => {
    expect(percentChange(120, 100)).toBeCloseTo(20, 5);
    expect(percentChange(80, 100)).toBeCloseTo(-20, 5);
  });

  it('is 0 when both figures are 0 (nothing changed)', () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it('is null (never Infinity) when the previous figure is 0 and the current is not', () => {
    expect(percentChange(50, 0)).toBeNull();
    expect(formatPercent(percentChange(50, 0))).toBe('-');
  });

  it('is null for a non-finite input', () => {
    expect(percentChange(NaN, 10)).toBeNull();
    expect(percentChange(10, undefined as unknown as number)).toBeNull();
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

describe('formatSigned', () => {
  it('renders zero as a bare "0", never "+0"', () => {
    expect(formatSigned(0)).toBe('0');
  });

  it('renders negative zero as "0", never "-0"', () => {
    expect(formatSigned(-0)).toBe('0');
  });

  it('prefixes a positive value with "+"', () => {
    expect(formatSigned(20)).toBe('+20');
  });

  it('keeps a negative value\'s own "-" sign, not double-signed', () => {
    expect(formatSigned(-4)).toBe('-4');
  });
});
