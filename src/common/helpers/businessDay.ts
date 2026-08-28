import { businessDateStr } from '@/shared/utils/timezone';

/**
 * Business-date arithmetic that is *not* anchored on "now".
 *
 * ---------------------------------------------------------------------------
 * Why this is here and not in `@mb/shared/utils/timezone`
 * ---------------------------------------------------------------------------
 * That module has exactly this function already — `addDaysStr` — and it is
 * **not exported**. Exporting it means editing `src/shared/`, which is a
 * byte-identical mirror of two other repositories: the same edit would have to
 * land in `mountainbakes-server` and `mountainbakes-frontend`, be committed to
 * two remotes, and be deployed twice, all so a phone screen can put a "previous
 * day" arrow next to a date. `npm run shared:check` exists precisely to stop
 * that edit happening by halves.
 *
 * So the four lines live here instead, in app-local code, and the mirror stays
 * untouched. If a third caller ever wants them, promoting them is a deliberate
 * three-repo change rather than something that happened on the way past.
 *
 * The two exported helpers below are the only date maths any screen should do:
 * every other date in the app comes from the server or from `businessDateStr()`.
 */

/**
 * Shift a `YYYY-MM-DD` business date by whole days.
 *
 * Noon UTC, not midnight, so a daylight-saving jump in the *device's* zone can
 * never round the result into the wrong day. Asia/Karachi has no DST — it is a
 * fixed +05:00 — but this string is arithmetic on a calendar date and it should
 * not depend on that staying true, or on where the phone thinks it is.
 */
export function shiftBusinessDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const at = new Date(Date.UTC(y, m - 1, d, 12));
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/**
 * Whether a business date is in the future, i.e. past the ledger's last day.
 *
 * Compared as strings, which is exact for `YYYY-MM-DD` and avoids parsing two
 * dates to compare them. `now` is injectable so the 02:00 rollover can be
 * tested without waiting for 02:00.
 */
export function isFutureBusinessDate(date: string, now: Date = new Date()): boolean {
  return date > businessDateStr(now);
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * `2026-08-21` → `21 Aug 2026`, or `Fri 21 Aug` when `weekday` is asked for.
 *
 * Formatted here rather than through `Intl` or `toLocaleDateString`: those read
 * the **device** locale and timezone, and a business date is neither. A phone
 * set to US English would render the ledger's dates as `8/21/2026` beside a
 * server that calls the same day `21 Aug`, and a phone west of Karachi would
 * render some of them as the day before.
 */
export function formatBusinessDate(date: string, opts: { weekday?: boolean } = {}): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const month = MONTHS[m - 1] ?? '';
  const day = String(d);
  if (!opts.weekday) return `${day} ${month} ${y}`;
  const dow = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
  return `${dow} ${day} ${month}`;
}

/**
 * `Today` / `Yesterday` where they apply, the formatted date otherwise.
 *
 * Only these two get a word. "2 days ago" reads as a duration and invites
 * arithmetic; a date does not, and a ledger is read against other dated
 * records.
 */
export function businessDateLabel(date: string, now: Date = new Date()): string {
  const today = businessDateStr(now);
  if (date === today) return 'Today';
  if (date === shiftBusinessDate(today, -1)) return 'Yesterday';
  return formatBusinessDate(date, { weekday: true });
}
