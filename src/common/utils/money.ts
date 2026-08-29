/**
 * Money handling.
 *
 * The backend stores every monetary column as Postgres `numeric(14,2)` — not
 * float, not integer minor units (see migration 20260719000001, which moved off
 * floats precisely because they drifted). So the app's representation is a
 * JS number carrying at most 2 decimal places, matching the web client.
 *
 * Two things this module exists to guarantee:
 *
 * 1. `toNumber` at every API boundary. PostgREST serialises `numeric` as a JSON
 *    STRING, so an untouched `grandTotal` can arrive as "1250.00". Adding that to
 *    a number silently concatenates ("01250.00") instead of summing.
 *
 * 2. Deterministic formatting. The web client uses
 *    `Number.toLocaleString('en-PK', {minimumFractionDigits:0, maximumFractionDigits:2})`,
 *    but Hermes ships an incomplete Intl on Android — where it degrades, the same
 *    figure would render "125500" on a phone and "125,500" in the browser. The
 *    grouping is therefore done by hand here, and money.test.ts pins the output to
 *    values captured from a full-ICU runtime.
 */

export const CURRENCY_SYMBOL = 'Rs.';
export const CURRENCY_LOCALE = 'en-PK';

/**
 * Coerce an API numeric field to a number. Accepts the PostgREST string form.
 * Returns `fallback` for null/undefined/unparseable rather than NaN, so a bad
 * field can never silently poison a running total.
 */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Round to 2dp the way currency totals are expected to round (half away from zero). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Insert thousands separators into an integer-digit string. */
function group(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format the numeric part only: grouped, 0–2 decimals, trailing zeros trimmed.
 * `1250 → "1,250"`, `1234.5 → "1,234.5"`, `1234.567 → "1,234.57"`.
 */
export function formatAmount(value: unknown): string {
  const n = toNumber(value);
  const negative = n < 0;
  const abs = Math.abs(n);

  // round2 before toFixed, then trim — matching maximumFractionDigits: 2 with
  // minimumFractionDigits: 0. The round2 step is load-bearing: bare
  // `(1.005).toFixed(2)` is "1.00", because 1.005 is stored as slightly less
  // than 1.005, whereas ICU renders "1.01". Without it the app would round a
  // half-paisa down where the browser rounds it up.
  let s = round2(abs).toFixed(2);
  s = s.replace(/\.?0+$/, '');

  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const frac = dot === -1 ? '' : s.slice(dot);

  return `${negative ? '-' : ''}${group(intPart)}${frac}`;
}

/**
 * `Rs. 1,250`. Pass the tenant's configured symbol from AppSettings where one is
 * available — the server exposes `currencySymbol` and it is what the web client
 * actually renders with; the constant here is only the fallback.
 */
export function formatCurrency(value: unknown, symbol: string = CURRENCY_SYMBOL): string {
  return `${symbol} ${formatAmount(value)}`;
}

/** `Rs. 1.2M` / `Rs. 45.0K` for dashboard stat tiles where space is tight. */
export function formatCompact(value: unknown, symbol: string = CURRENCY_SYMBOL): string {
  const n = toNumber(value);
  if (Math.abs(n) >= 1_000_000) return `${symbol} ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${symbol} ${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n, symbol);
}

/**
 * Parse user input / a formatted string back to a number.
 *
 * Deliberately NOT a mirror of the web client's version. That one is
 * `parseFloat(value.replace(/[^0-9.-]/g, ''))`, which keeps the '.' out of the
 * "Rs." prefix and strips the thousands comma — so "Rs. 1,250" becomes ".1250"
 * and parses as 0.125. Here the separators are removed first and the number is
 * then matched positionally, so any of "1250", "1,250", "Rs. 1,250" and
 * "Rs.1,250" all yield 1250.
 */
export function parseCurrency(value: string): number {
  const cleaned = String(value ?? '')
    // Drop a currency word together with its trailing period, so the '.' in
    // "Rs." goes with it. Stripping the letters alone would leave ".1250".
    .replace(/[A-Za-z]+\.?/g, '')
    // Then thousands separators, spaces and any remaining symbol.
    .replace(/[^0-9.-]/g, '');
  const match = /-?\d*\.?\d+/.exec(cleaned);
  if (!match) return 0;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The same figures with an explicit `+` on a positive one.
 *
 * For a **change** — a delta, an adjustment, a day's movement — where the
 * direction is the information and a bare `12` beside a bare `-3` reads as two
 * quantities rather than as up and down. Never for a balance or a total, which
 * are quantities: a `+` on a closing figure implies it was gained today.
 *
 * A negative already carries its sign from `formatQty` / `formatAmount`, so only
 * the positive case is added. Zero gets nothing — it did not move in either
 * direction, and `+0` claims it moved and came back.
 */
export function signedQty(value: unknown): string {
  const n = toNumber(value);
  return n > 0 ? `+${formatQty(n)}` : formatQty(n);
}

export function signedAmount(value: unknown): string {
  const n = toNumber(value);
  return n > 0 ? `+${formatAmount(n)}` : formatAmount(n);
}

/** Format a quantity. Backend quantities are `numeric(14,3)` and may be negative. */
export function formatQty(value: unknown): string {
  const n = toNumber(value);
  const s = n.toFixed(3).replace(/\.?0+$/, '');
  const negative = s.startsWith('-');
  const bare = negative ? s.slice(1) : s;
  const dot = bare.indexOf('.');
  const intPart = dot === -1 ? bare : bare.slice(0, dot);
  const frac = dot === -1 ? '' : bare.slice(dot);
  return `${negative ? '-' : ''}${group(intPart)}${frac}`;
}
