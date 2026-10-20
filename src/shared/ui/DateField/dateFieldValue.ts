/**
 * The native picker works in `Date`s; every form and query in this app
 * works in plain `YYYY-MM-DD` business dates and `HH:mm` clock times. These
 * convert between the two in LOCAL time, so a picked day never slides by one
 * through a UTC conversion.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const HM = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** `'2026-10-20'` → that day at local midnight; `null` for anything else. */
export function ymdToDate(value: string | null | undefined): Date | null {
  const m = YMD.exec((value ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Rejects 2026-02-31 rolling over into March.
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

/** A `Date` → its local calendar day, `YYYY-MM-DD`. */
export function dateToYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `'09:30'` (or `'09:30:00'`) → today at that local time; `null` for anything else. */
export function hmToDate(value: string | null | undefined, base: Date = new Date()): Date | null {
  const m = HM.exec((value ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d;
}

/** A `Date` → its local clock time, `HH:mm` (24-hour). */
export function dateToHm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `'2026-10-20'` clamped into [min, max] (either bound optional). Plain string compare works for ISO days. */
export function clampYmd(value: string, min?: string | null, max?: string | null): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}
