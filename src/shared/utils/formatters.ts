type NumericInput = number | string | null | undefined;

/**
 * `value` as a finite number, or `null` when it isn't one. `Number(null)` and
 * `Number('')` are both `0` — finite, and wrong — so those are rejected before
 * the coercion, not after it.
 */
function toFiniteNumber(value: NumericInput): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** One dev warning per formatter+field, so a list that re-renders doesn't flood the console. */
const warnedFields = new Set<string>();

/**
 * Dev-only breadcrumb for a value a formatter had to reject. The UI still
 * shows `'-'`; this names WHICH field went bad, so the upstream source (an API
 * field the server doesn't send, a string amount, a 0-base division) can be
 * found instead of just the dash.
 */
function warnRejected(formatter: string, field: string | undefined, value: unknown): void {
  if (!__DEV__) return;
  const key = `${formatter}:${field ?? ''}`;
  if (warnedFields.has(key)) return;
  warnedFields.add(key);
  const shown = typeof value === 'string' ? JSON.stringify(value) : String(value);
  console.warn(`[${formatter}] non-numeric value for "${field ?? 'unknown'}": ${shown}`);
}

/**
 * `Rs. 34,050` for a whole-rupee amount, `Rs. 19,387.5` for one that isn't —
 * matches the web's own `formatCurrency` (`toLocaleString(..., {
 * minimumFractionDigits: 0, maximumFractionDigits: 2 })`). Half-rupee amounts
 * are a real, routine case (company-share splits commonly end in .50), not
 * an edge case to round away — rounds to the nearest paisa first only to
 * absorb floating-point noise from upstream arithmetic, never to whole rupees.
 *
 * Accepts `number | string | null | undefined` (not just `number`) and
 * returns `'-'` for anything that isn't a finite number, rather than
 * `'Rs. NaN'` — a real API response shape mismatch (the Dashboard's daily
 * sales/top-products fields were typed and read under field names the server
 * doesn't actually send) once reached this function with `undefined`, and
 * nothing caught it before it rendered. That source mismatch is fixed
 * separately (see `api/types.ts`'s `SalesAnalyticsDailyPoint`/
 * `SalesAnalyticsTopProduct`) — this is the last-resort backstop so a future
 * one shows a dash instead of "NaN" again.
 *
 * `field` (optional) names the value for the dev-only warning logged when it
 * is rejected, e.g. `[formatCurrency] non-numeric value for "sales": undefined`.
 */
export function formatCurrency(amount: NumericInput, field?: string): string {
  const value = toFiniteNumber(amount);
  if (value === null) {
    warnRejected('formatCurrency', field, amount);
    return '-';
  }
  const rounded = Math.round(value * 100) / 100;
  return `Rs. ${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * A plain count (orders, items, units) as text — `'-'` instead of `"NaN"`/
 * `"undefined"` for anything that isn't a finite number, so "NaN orders" can't
 * render. Same rejection rules and dev warning as `formatCurrency`.
 */
export function formatCount(value: NumericInput, field?: string): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    warnRejected('formatCount', field, value);
    return '-';
  }
  return String(n);
}

export interface FormatPercentOptions {
  /** Decimal places, default 1 (`"6.9%"`). */
  digits?: number;
  /** Prefix a positive value with `"+"` (a change pill: `"+12.5%"`). */
  signed?: boolean;
}

/**
 * `6.9%` — `'-'` for `null` (the "no base to compare against" answer the
 * percent helpers in `percent.ts` give for a zero base) and for anything else
 * that isn't a finite number, so "NaN%"/"Infinity%" can't render. A rejected
 * non-null value gets the same dev warning as `formatCurrency`; `null` doesn't,
 * since it's the deliberate "no percentage" answer, not a bad value.
 */
export function formatPercent(value: number | null | undefined, field?: string, options: FormatPercentOptions = {}): string {
  if (value === null) return '-';
  const n = toFiniteNumber(value);
  if (n === null) {
    warnRejected('formatPercent', field, value);
    return '-';
  }
  const { digits = 1, signed = false } = options;
  const text = n.toFixed(digits);
  return `${signed && n > 0 ? '+' : ''}${text}%`;
}

/** `12 Oct 2026` */
export function formatDisplayDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** `08:45 PM` */
export function formatDisplayTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Always carries an explicit sign — "-7", "+3", "0" — never a bare magnitude
 * that could be misread as always-positive, and never "+0"/"-0" (a zero
 * movement is just "0", with no sign at all).
 */
export function formatSigned(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : String(value);
}

/** "Just now" / "5m ago" / "3h ago" / "2d ago", falling back to the plain date past a week — the Notification Center's own relative-time stamp. `now` is injectable for tests; defaults to the real current time. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return formatDisplayDate(iso.slice(0, 10));
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDisplayDate(iso.slice(0, 10));
}
