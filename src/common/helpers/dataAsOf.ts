import { karachiTimeStr } from '@/shared/utils/timezone';

/**
 * TanStack Query's `dataUpdatedAt` → the "09:14" shown under the offline strip.
 *
 * In **Karachi** time, not device time. Every other clock the user reads in this
 * app is the business clock — the day rolls at 02:00 Karachi — and a stale-data
 * timestamp that silently used the phone's timezone would be the one clock that
 * disagreed. On a device set to another zone that is precisely the reading that
 * makes someone think data is fresher, or older, than it is.
 *
 * Returns `undefined` when the query has never resolved (`dataUpdatedAt` is 0).
 * There is no "as of" for data that has never arrived, and rendering the epoch
 * as "05:00" would be worse than saying nothing.
 */
export function dataAsOfFrom(dataUpdatedAt: number | undefined): string | undefined {
  if (!dataUpdatedAt) return undefined;
  return karachiTimeStr(new Date(dataUpdatedAt));
}
