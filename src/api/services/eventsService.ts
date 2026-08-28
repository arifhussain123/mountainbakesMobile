import type { SpecialEventView } from '@/shared/types/special-event.types';
import { api } from '../client';

/**
 * Special events — Eid, Ramadan, a wedding order, a market day.
 *
 * ---------------------------------------------------------------------------
 * Scope is the server's, and it is not a role gate
 * ---------------------------------------------------------------------------
 * `/api/special-events` is behind `authenticate` and nothing else, so every
 * signed-in role may read it. What differs is *what comes back*: a branch role
 * sees only events that apply to all branches or name its own, and everyone else
 * sees the lot. That filtering is `scopedEventRows` on the server and it cannot
 * be influenced from here.
 *
 * Writes are `super_admin` only (creating, confirming a date, assigning
 * branches) and are not implemented in this app — a branch's part in an event is
 * its demand, which goes through the production-order path like any other.
 *
 * ---------------------------------------------------------------------------
 * A date can be an estimate, and the difference matters
 * ---------------------------------------------------------------------------
 * Hijri events are anchored to a moon sighting. The row carries a computed
 * `estimatedDate` and an admin-confirmed `confirmedDate`; `eventDate` is
 * whichever exists, and `dateIsEstimated` says which it was. A screen must show
 * that flag — a bakery planning three hundred extra loaves for a date that may
 * move by a day is exactly the case where "probably the 21st" and "the 21st" are
 * different instructions.
 */

/**
 * `GET /api/special-events`.
 *
 * `year` is worth sending: the server materialises a year's occurrences on
 * demand when it is asked for one, so a request without it answers from whatever
 * happens to exist rather than from the year being looked at.
 */
export function getSpecialEvents(options: {
  year?: number;
  status?: string;
  category?: string;
} = {}): Promise<{ events: SpecialEventView[]; total: number }> {
  const params: Record<string, string> = {};
  if (options.year) params.year = String(options.year);
  if (options.status) params.status = options.status;
  if (options.category) params.category = options.category;
  return api.get<{ events: SpecialEventView[]; total: number }>('/api/special-events', { params });
}

/**
 * `GET /api/special-events/calendar?year=&month=` — one month.
 *
 * Range-filtered on both ends of the event, so a multi-day event that started in
 * the previous month still comes back on the days it spans into this one. That
 * is why the calendar cannot be built by filtering the year list by month
 * prefix: a three-day Eid beginning on the 31st would vanish from the month it
 * mostly falls in.
 */
export function getEventCalendar(options: {
  year: number;
  /** 1–12. The server 400s on anything else rather than guessing. */
  month: number;
}): Promise<{ events: SpecialEventView[]; year: number; month: number }> {
  return api.get<{ events: SpecialEventView[]; year: number; month: number }>(
    '/api/special-events/calendar',
    { params: { year: String(options.year), month: String(options.month) } },
  );
}
