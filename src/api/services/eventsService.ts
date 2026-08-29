import type {
  EventBranchDemand,
  SpecialEventView,
} from '@/shared/types/special-event.types';
import type { SaveEventDemandInput } from '@/shared/schemas/special-event.schemas';
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
 * Writes to the EVENT itself are `super_admin` only — creating one, confirming a
 * date, assigning branches — and are not implemented here.
 *
 * A branch's own part in an event is a different thing and it **does** have its
 * own endpoints, all three behind `BRANCH_ROLES`: read its demand, save it, send
 * it. An older comment in this file said a branch's demand "goes through the
 * production-order path like any other", and that was wrong in a way worth
 * naming — a production order does not roll into `EventDemandSummary`, so a
 * branch that ordered that way still reads as **not submitted** to the admin or
 * production user checking who has sent their Eid demand.
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

// ---------------------------------------------------------------------------
// The branch's own advance demand
// ---------------------------------------------------------------------------

/**
 * `GET /api/special-events/:id/my-demand` — this branch's demand, or null.
 *
 * Null is a real answer and the common one: most events have no demand from
 * most branches most of the time. It means "nothing started", never "could not
 * ask", and the caller must keep the two apart.
 *
 * No `branchId` is sent. The server resolves it from the session, and
 * `assertBranchMayAccessEvent` refuses an event this branch is not part of.
 */
export async function getMyEventDemand(eventId: string): Promise<EventBranchDemand | null> {
  const data = await api.get<{ demand: EventBranchDemand | null }>(
    `/api/special-events/${eventId}/my-demand`,
  );
  return data.demand ?? null;
}

/**
 * `POST /api/special-events/:id/demands` — save the working draft.
 *
 * Upserts: one demand per (event, branch), so calling this twice edits rather
 * than duplicates. That is also what makes a retry safe, which matters because
 * this write is **not** on the offline queue — it is not one of the five
 * operations the server carries `idempotent()` for.
 *
 * Two refusals to expect, and neither is a client bug:
 *
 *   - **409 after the demand deadline.** The server compares `businessDateStr()`
 *     against `demand_due_date` HERE, on the save, and its message says to
 *     contact Admin. Note this is the opposite of where a deadline is usually
 *     put: submitting late is not checked at all, saving late is.
 *   - **409 once the demand is no longer a draft.** A submitted demand cannot be
 *     edited back into a different shape.
 *
 * Product names and prices are resolved and snapshotted server-side, so later
 * repricing cannot rewrite what this demand was worth. Never send them.
 */
export function saveEventDemand(
  eventId: string,
  input: SaveEventDemandInput,
): Promise<{ id: string; status: string }> {
  return api.post<{ id: string; status: string }>(
    `/api/special-events/${eventId}/demands`,
    input,
  );
}

/**
 * `POST /api/special-events/:id/demands/:demandId/submit` — send it to Production.
 *
 * A check-and-set on `status = 'draft'` scoped to the caller's own branch, so a
 * double-tap cannot submit twice and an id cannot be guessed into another
 * branch's demand; either way the second attempt is a 409 rather than a second
 * submission. Notifies the production role on success.
 *
 * The deadline is **not** re-checked here. A draft that was saved in time can
 * still be sent afterwards, which is the behaviour the deadline banner should
 * describe rather than contradict.
 */
export function submitEventDemand(
  eventId: string,
  demandId: string,
): Promise<{ success: boolean; status: string }> {
  return api.post<{ success: boolean; status: string }>(
    `/api/special-events/${eventId}/demands/${demandId}/submit`,
    {},
  );
}
