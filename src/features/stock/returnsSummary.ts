import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils';
import type { ReturnsBucket, ReturnsSummaryTotals } from '@/api';

/**
 * Layout helpers for the monthly Product Returns summary, shared by the
 * branch's Return Stock screen and Production's Product Returns screen.
 *
 * Nothing here adds anything up — every figure is the server's (see
 * `MonthlyReturnsSummary` in src/api/types.ts). These only decide how one is
 * worded, so the two screens, and the web, state the same totals the same way.
 */

export type ReturnsSummaryStatus = 'pending' | 'accepted' | 'rejected' | 'returned';
export type ReturnsSummaryTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const RETURNS_SUMMARY_STATUS_ORDER: readonly ReturnsSummaryStatus[] = ['accepted', 'pending', 'rejected', 'returned'];

export const RETURNS_SUMMARY_STATUS_TONE: Record<ReturnsSummaryStatus, ReturnsSummaryTone> = {
  accepted: 'success',
  pending: 'warning',
  rejected: 'danger',
  returned: 'info',
};

export interface ReturnsSummaryTile {
  key: string;
  label: string;
  value: string;
  sub: string;
  tone: ReturnsSummaryTone;
}

/** "1 October 2026 – 18 October 2026" — the window as the server reports it. */
export function formatReturnsWindow(from: string, to: string): string {
  const long = (d: string) => format(parseISO(d), 'd MMMM yyyy');
  return `${long(from)} – ${long(to)}`;
}

const plural = (n: number) => `${n} ${n === 1 ? 'return' : 'returns'}`;

/** "3 items · 2 returns" */
export function describeBucket(bucket: ReturnsBucket): string {
  return `${bucket.qty.toLocaleString('en-US')} ${bucket.qty === 1 ? 'item' : 'items'} · ${plural(bucket.count)}`;
}

/**
 * The summary's tiles in display order: the month's whole volume, its whole
 * value, then one per status. "All Submitted" and the Approved tile stay
 * separate so a request still awaiting review is never read as a credited
 * return.
 */
export function buildReturnsSummaryTiles(
  totals: ReturnsSummaryTotals,
  statusLabels: Record<ReturnsSummaryStatus, string>,
): ReturnsSummaryTile[] {
  return [
    { key: 'qty', label: 'Total Returned Items', value: totals.submitted.qty.toLocaleString('en-US'), sub: plural(totals.submitted.count), tone: 'neutral' },
    { key: 'submitted', label: 'All Submitted', value: formatCurrency(totals.submitted.amount), sub: 'every status, this month', tone: 'neutral' },
    ...RETURNS_SUMMARY_STATUS_ORDER.map((status) => ({
      key: status,
      label: statusLabels[status],
      value: formatCurrency(totals[status].amount),
      sub: describeBucket(totals[status]),
      tone: RETURNS_SUMMARY_STATUS_TONE[status],
    })),
  ];
}

/** The caveat line for returns with no price on record, or null when there are none. */
export function unpricedNote(totals: ReturnsSummaryTotals): string | null {
  const n = totals.unpricedCount;
  if (n <= 0) return null;
  return `${n} ${n === 1 ? 'return has' : 'returns have'} no price on record — amounts leave ${n === 1 ? 'it' : 'them'} out, quantities still count ${n === 1 ? 'it' : 'them'}.`;
}
