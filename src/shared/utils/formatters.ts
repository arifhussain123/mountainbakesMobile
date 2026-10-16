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
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  // `Number(null)` is `0` and `Number('')` is `0` — both finite, both wrong —
  // so these must be rejected before the coercion, not after it.
  if (amount === null || amount === undefined || amount === '') return '-';
  const value = Number(amount);
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value * 100) / 100;
  return `Rs. ${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
