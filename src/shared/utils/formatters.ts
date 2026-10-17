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
