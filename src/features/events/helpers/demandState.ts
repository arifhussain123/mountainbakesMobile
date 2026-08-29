import type {
  EventBranchDemand,
  SpecialEventView,
} from '@/shared/types/special-event.types';
import { businessDateStr } from '@/shared/utils/timezone';

/**
 * What a branch's advance demand for one event currently is, and what it may
 * still do about it.
 *
 * Folded into one place so no component has to work out which of the four cases
 * it is looking at, and — more importantly — so the two permissions below are
 * decided once. They are not symmetrical, and the asymmetry is surprising enough
 * that deriving it ad hoc in a screen would get it wrong.
 */

/** Days before the deadline at which an unsent demand counts as due soon. */
export const DUE_SOON_DAYS = 3;

/** Lead time at or under which an event reads as urgent. */
export const URGENT_DAYS = 1;
export const SOON_DAYS = 10;

export type DemandState = 'not_started' | 'draft' | 'submitted' | 'missed';
export type Urgency = 'urgent' | 'soon' | 'normal';

export interface DemandStatus {
  state: DemandState;
  /**
   * May the working draft still be saved?
   *
   * **The deadline gates saving**, which is the opposite of where one would look
   * for it. `POST /:id/demands` compares the business date against
   * `demand_due_date` and answers 409 — "Contact Admin to submit late" — so
   * after the deadline a branch cannot start or amend a demand at all.
   */
  canSave: boolean;
  /**
   * May an existing draft be sent?
   *
   * **The deadline does not gate submitting.** The submit route checks only that
   * the demand is still a draft and belongs to the caller's branch. So a draft
   * saved in time can be sent afterwards, and the UI must not refuse something
   * the server would accept.
   */
  canSubmit: boolean;
  /**
   * Is there still work for the branch to do here?
   *
   * False once submitted, and false once the deadline has passed with nothing
   * saved — at that point it is a conversation with Admin, not a task. This is
   * what keeps a "due soon" count meaningful: counting deadlines rather than
   * outstanding tasks would leave the tile permanently lit and therefore
   * ignorable, which is the failure mode that makes a warning worthless.
   */
  needsAction: boolean;
  /** Days until the demand deadline. Negative once past, null when unknown. */
  daysToDeadline: number | null;
}

/**
 * Anything past `draft` counts as sent.
 *
 * `approved`, `rejected` and `fulfilled` are all Production's answers to a
 * demand that reached it, so from the branch's side the work is done and the
 * badge must not read as outstanding. A rejected demand is a conversation, not
 * an unstarted task.
 */
function isSent(demand: EventBranchDemand | null | undefined): boolean {
  return Boolean(demand) && demand!.status !== 'draft';
}

/** Whole days from today's business date to `date`, or null. */
export function daysUntil(date: string | null | undefined, today = businessDateStr()): number | null {
  if (!date) return null;
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function demandStatusFor(
  event: Pick<SpecialEventView, 'demandDueDate'>,
  demand: EventBranchDemand | null | undefined,
  today = businessDateStr(),
): DemandStatus {
  const daysToDeadline = daysUntil(event.demandDueDate, today);
  // No deadline recorded is not a passed one. An event with no due date can be
  // demanded against indefinitely, and treating "unknown" as "expired" would
  // lock a branch out of an event nobody set a date on.
  const deadlinePassed = daysToDeadline !== null && daysToDeadline < 0;

  const sent = isSent(demand);
  const hasDraft = Boolean(demand) && demand!.status === 'draft';

  /*
   * Submitted outranks the deadline, deliberately. A demand sent on the last day
   * is in time, and re-reading it as "missed" the following morning would
   * rewrite history — the branch did the thing it was asked to do.
   */
  const state: DemandState = sent
    ? 'submitted'
    : deadlinePassed
      ? 'missed'
      : hasDraft
        ? 'draft'
        : 'not_started';

  return {
    state,
    canSave: !sent && !deadlinePassed,
    // Note the missing deadline term: a draft that exists may still be sent.
    canSubmit: hasDraft,
    needsAction: !sent && !deadlinePassed,
    daysToDeadline,
  };
}

/** True when this event still wants something from the branch, soon. */
export function isDueSoon(status: DemandStatus, within = DUE_SOON_DAYS): boolean {
  return (
    status.needsAction &&
    status.daysToDeadline !== null &&
    status.daysToDeadline <= within
  );
}

/**
 * Urgency from lead time alone.
 *
 * One rule, so a card and an agenda row cannot grade the same event
 * differently. It is about the EVENT date rather than the demand deadline: this
 * is how close the day itself is, which is what decides whether there is time to
 * bake for it.
 */
export function urgencyOf(daysRemaining: number | null): Urgency {
  if (daysRemaining === null) return 'normal';
  if (daysRemaining <= URGENT_DAYS) return 'urgent';
  if (daysRemaining <= SOON_DAYS) return 'soon';
  return 'normal';
}

/** What the badge says, for each of the four cases. */
export const DEMAND_STATE_LABEL: Record<DemandState, string> = {
  not_started: 'Not started',
  draft: 'Draft saved',
  submitted: 'Submitted',
  missed: 'Deadline passed',
};
