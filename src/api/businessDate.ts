/**
 * Mirrors `backend/src/shared/utils/timezone.ts`'s `businessDateStr()` exactly:
 * the business day rolls over at 2 AM Asia/Karachi, not midnight. An offline sale
 * rung up at 9pm belongs to that evening even if it syncs after 2am.
 *
 * Sent as `businessDate` on `POST /api/orders/pos` — a field the backend's own
 * comment says is "sent by the mobile app only"; the web app never sends it.
 */
const KARACHI_OFFSET_MINUTES = 5 * 60; // Asia/Karachi is UTC+5, no DST.
const BUSINESS_DAY_START_MINUTES = 2 * 60; // 02:00

function toKarachi(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  return new Date(utcMs + KARACHI_OFFSET_MINUTES * 60_000);
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' business date for `now` — 02:00 Karachi rolls over, 08:00 is the same day. */
export function getBusinessDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - BUSINESS_DAY_START_MINUTES * 60_000);
  return dateStr(toKarachi(shifted));
}

/**
 * 'YYYY-MM-01' of the current business month — mirrors the backend's
 * `businessMonthStartStr()`. The month turns over with the business day, at
 * 02:00 Karachi on the 1st, so a month-to-date window starting here moves to
 * the new month by itself.
 */
export function getBusinessMonthStart(now: Date = new Date()): string {
  return `${getBusinessDate(now).slice(0, 7)}-01`;
}

function addDaysStr(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateStr(d);
}

/**
 * Mirrors `backend/src/shared/utils/timezone.ts`'s `businessDayBounds()`: the UTC
 * ISO instants `[02:00 Karachi that day, 01:59:59.999 Karachi the next day]` a
 * business date spans — what `GET /api/orders?from=&to=` actually compares
 * against `created_at`, not a plain date string.
 */
export function getBusinessDayBounds(date: string = getBusinessDate()): { from: string; to: string } {
  const next = addDaysStr(date, 1);
  return {
    from: new Date(`${date}T02:00:00.000+05:00`).toISOString(),
    to: new Date(`${next}T01:59:59.999+05:00`).toISOString(),
  };
}
