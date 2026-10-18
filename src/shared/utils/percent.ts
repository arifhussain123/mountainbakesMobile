/**
 * Shared percentage arithmetic for the dashboards. Every helper answers
 * `null` — never `NaN`/`Infinity`, and never a fabricated 0% — when there is no
 * base to take a percentage of, or when an input isn't a finite number.
 * Render the result with `formatPercent`, which shows `null` as `'-'`.
 */

/**
 * `part` as a percentage of `whole`, or `null` when `whole` is zero/negative
 * or either input isn't finite. Mirrors the web client's `share()`
 * (branch-v2/model.ts).
 */
export function percentOf(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return (part / whole) * 100;
}

/**
 * `(cur − prev) / prev × 100`. With no previous figure (`prev` is 0) there is
 * no percentage to state: `0` when nothing changed either (0 → 0), otherwise
 * `null` — "+∞%" would read like a measurement. `null` too for a non-finite
 * input.
 */
export function percentChange(cur: number, prev: number): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
