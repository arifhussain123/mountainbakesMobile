import { formatDisplayDate } from '@/shared/utils';

/**
 * The Daily Sale Record's window rules — the web's DailySaleRecordPage
 * (`fb269dc`, `cce44e8`, `c5efba8`).
 *
 * - It opens on the current month so far: the 1st of the business month
 *   through today. The question is nearly always "which days are still not
 *   signed off", and a window answers it where a single day cannot.
 * - The record is kept from 1 Sep 2026. Earlier days are never asked of the
 *   API, even where sales exist for them; a window that reaches back past the
 *   start says so, and one lying wholly before it requests nothing at all.
 */

/** The first business date the record lists. */
export const DAILY_SALE_START_DATE = '2026-09-01';
/** The last day NOT shown — the one the notice names. */
export const DAILY_SALE_LAST_UNSHOWN_DATE = '2026-08-31';

export interface DailySaleWindow {
  /** What is actually requested: never before the start date. */
  queryFrom: string;
  to: string;
  /** The picked window reaches back before the start — show the notice. */
  beforeStart: boolean;
  /** The whole window is before the start — request nothing; the empty state explains. */
  allBeforeStart: boolean;
}

export function resolveDailySaleWindow(range: { from: string; to: string }): DailySaleWindow {
  const beforeStart = range.from < DAILY_SALE_START_DATE;
  return {
    queryFrom: beforeStart ? DAILY_SALE_START_DATE : range.from,
    to: range.to,
    beforeStart,
    allBeforeStart: range.to < DAILY_SALE_START_DATE,
  };
}

/** The notice over a window that reaches back past the start, in the web's words. */
export function dailySaleBeforeStartNotice(): { title: string; body: string } {
  return {
    title: `${formatDisplayDate(DAILY_SALE_LAST_UNSHOWN_DATE)} and earlier are not shown.`,
    body: `This record is maintained from ${formatDisplayDate(DAILY_SALE_START_DATE)}, so there is no data for those days.`,
  };
}

/** The empty state for a window wholly before the start. */
export function dailySaleAllBeforeStartEmpty(): { title: string; message: string } {
  return {
    title: `No record before ${formatDisplayDate(DAILY_SALE_START_DATE)}`,
    message: `This record is maintained from ${formatDisplayDate(DAILY_SALE_START_DATE)}. Pick a later date to see data.`,
  };
}
