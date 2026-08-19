import {
  formatAmount,
  formatCompact,
  formatCurrency,
  formatQty,
  parseCurrency,
  round2,
  toNumber,
} from '../money';

/**
 * Expected values captured from a full-ICU runtime evaluating
 * `n.toLocaleString('en-PK', {minimumFractionDigits:0, maximumFractionDigits:2})`
 * — the exact call the web client makes. These pin mobile output to the browser's,
 * because Hermes on Android cannot be relied on to provide the same Intl.
 */
const ICU_CASES: ReadonlyArray<readonly [number, string]> = [
  [0, '0'],
  [5, '5'],
  [150, '150'],
  [999, '999'],
  [1000, '1,000'],
  [1250, '1,250'],
  [12500, '12,500'],
  [125500, '125,500'],
  [1000000, '1,000,000'],
  [1234567, '1,234,567'],
  [12345678, '12,345,678'],
  [123456789, '123,456,789'],
  [0.5, '0.5'],
  [0.05, '0.05'],
  [1234.5, '1,234.5'],
  [1234.55, '1,234.55'],
  [1234.567, '1,234.57'],
  [99.999, '100'],
  [-1, '-1'],
  [-4500, '-4,500'],
  [-1234.567, '-1,234.57'],
  [0.001, '0'],
];

describe('formatAmount', () => {
  it.each(ICU_CASES)('formats %p as %p (matching en-PK ICU)', (input, expected) => {
    expect(formatAmount(input)).toBe(expected);
  });

  // Regression: bare (1.005).toFixed(2) is "1.00" because the binary value sits
  // just below 1.005, while ICU renders "1.01". round2 must run first.
  it('rounds a half-paisa up, the way the browser does', () => {
    expect(formatAmount(1.005)).toBe('1.01');
    expect(formatAmount(2.675)).toBe('2.68');
  });

  it('accepts the PostgREST numeric string form', () => {
    expect(formatAmount('1250.00')).toBe('1,250');
    expect(formatAmount('125500.50')).toBe('125,500.5');
  });
});

describe('toNumber', () => {
  it('coerces PostgREST numeric strings', () => {
    expect(toNumber('1250.00')).toBe(1250);
    expect(toNumber('0')).toBe(0);
  });

  it('never returns NaN, so a bad field cannot poison a running total', () => {
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber({})).toBe(0);
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber(Infinity)).toBe(0);
  });

  it('honours an explicit fallback', () => {
    expect(toNumber(undefined, -1)).toBe(-1);
  });

  it('summing coerced API fields adds rather than concatenates', () => {
    const items = [{ lineTotal: '100.50' }, { lineTotal: '200.25' }];
    const total = items.reduce((sum, i) => sum + toNumber(i.lineTotal), 0);
    expect(total).toBe(300.75);
  });
});

describe('round2', () => {
  it('rounds half away from zero', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe('formatCurrency', () => {
  it('prefixes the default symbol', () => {
    expect(formatCurrency(1250)).toBe('Rs. 1,250');
    expect(formatCurrency(125500)).toBe('Rs. 125,500');
  });

  it('accepts a tenant-configured symbol from AppSettings', () => {
    expect(formatCurrency(1250, 'PKR')).toBe('PKR 1,250');
  });
});

describe('formatCompact', () => {
  it('abbreviates millions and thousands', () => {
    expect(formatCompact(1_200_000)).toBe('Rs. 1.2M');
    expect(formatCompact(45_000)).toBe('Rs. 45.0K');
  });

  it('falls back to full formatting below 1000', () => {
    expect(formatCompact(999)).toBe('Rs. 999');
  });
});

describe('parseCurrency', () => {
  it('round-trips a formatted value', () => {
    expect(parseCurrency('Rs. 1,250')).toBe(1250);
    expect(parseCurrency('1,234.57')).toBe(1234.57);
  });

  // The web client's parseCurrency mis-parses these: its [^0-9.-] strip keeps
  // the '.' from "Rs." and removes the thousands comma, so "Rs. 1,250" becomes
  // ".1250" → 0.125. Documented divergence, not an oversight.
  it('handles the currency prefix that the web implementation mis-parses', () => {
    expect(parseCurrency('Rs.1,250')).toBe(1250);
    expect(parseCurrency('Rs. 12,34,567')).toBe(1234567);
    expect(parseCurrency('-4,500')).toBe(-4500);
  });

  it('round-trips anything formatCurrency produced', () => {
    for (const value of [0, 5, 1250, 125500, 1234.57, -4500]) {
      expect(parseCurrency(formatCurrency(value))).toBe(value);
    }
  });

  it('returns 0 for junk rather than NaN', () => {
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency('abc')).toBe(0);
  });
});

describe('formatQty', () => {
  // Backend quantities are numeric(14,3) and are deliberately allowed to go
  // negative on some ledgers.
  it('renders up to 3 decimals and trims trailing zeros', () => {
    expect(formatQty(12)).toBe('12');
    expect(formatQty(12.5)).toBe('12.5');
    expect(formatQty('1500.250')).toBe('1,500.25');
  });

  it('renders negative balances', () => {
    expect(formatQty(-3.5)).toBe('-3.5');
  });
});
