import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils';
import type { MonthlyReturnsSummary, ProductReturnsLine, ReturnsBucket, ReturnsSummaryTotals } from '@/api';

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
 * The summary's tiles in display order — the same as the web's: the month's
 * volume, value and transaction count (every status), Branches Reporting on
 * Production's all-branch view, then one per status splitting that same total
 * so a request still awaiting review is never read as a credited return.
 */
export function buildReturnsSummaryTiles(
  summary: MonthlyReturnsSummary,
  statusLabels: Record<ReturnsSummaryStatus, string>,
  { showBranches = false }: { showBranches?: boolean } = {},
): ReturnsSummaryTile[] {
  const totals = summary.totals;
  const branchCount = summary.branches.length;
  return [
    { key: 'qty', label: 'Total Returned Items', value: totals.submitted.qty.toLocaleString('en-US'), sub: 'every status, this month', tone: 'neutral' },
    { key: 'amount', label: 'Total Return Amount', value: formatCurrency(totals.submitted.amount), sub: 'at each day’s price', tone: 'neutral' },
    { key: 'count', label: 'Return Transactions', value: totals.submitted.count.toLocaleString('en-US'), sub: 'one per product returned', tone: 'neutral' },
    ...(showBranches
      ? [{
          key: 'branches',
          label: 'Branches Reporting',
          value: String(summary.branchesReporting),
          sub: `of ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}`,
          tone: 'neutral' as const,
        }]
      : []),
    ...RETURNS_SUMMARY_STATUS_ORDER.map((status) => ({
      key: status,
      label: statusLabels[status],
      value: formatCurrency(totals[status].amount),
      sub: describeBucket(totals[status]),
      tone: RETURNS_SUMMARY_STATUS_TONE[status],
    })),
  ];
}

/** "3 items · Rs. 450" for an item-wise line. */
export function describeProductLine(line: ProductReturnsLine): string {
  return `${line.qty.toLocaleString('en-US')} ${line.qty === 1 ? 'item' : 'items'} · ${formatCurrency(line.amount)}`;
}

/**
 * One return row's value line, as the server priced it: "FP-01 · Rs. 150 × 2 =
 * Rs. 300". A row with no price on record says so instead of showing Rs. 0.
 */
export function describeReturnValue(item: { qty: number; productCode?: string | null; unitPrice?: number | null; amount?: number | null }): string {
  const code = item.productCode ? `${item.productCode} · ` : '';
  if (item.unitPrice == null || item.amount == null) return `${code}No price on record`;
  return `${code}${formatCurrency(item.unitPrice)} × ${item.qty.toLocaleString('en-US')} = ${formatCurrency(item.amount)}`;
}

/** The caveat line for returns with no price on record, or null when there are none. */
export function unpricedNote(totals: ReturnsSummaryTotals): string | null {
  const n = totals.unpricedCount;
  if (n <= 0) return null;
  return `${n} ${n === 1 ? 'return has' : 'returns have'} no price on record — amounts leave ${n === 1 ? 'it' : 'them'} out, quantities still count ${n === 1 ? 'it' : 'them'}.`;
}
