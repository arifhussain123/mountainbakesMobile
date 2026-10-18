import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils';
import type { DiscountSummaryTotals, MonthlyDiscountSummary } from '@/api';

/**
 * Layout helpers for the monthly Branch Discount summary, shared by the
 * branch's Discounts screen and Production's Discounts screen.
 *
 * Nothing here adds anything up — every figure is the server's (see
 * backend shared/utils/discount-summary.ts). These only decide how one is
 * worded, so the two screens, and the web, state the same totals the same way.
 */

export interface DiscountSummaryBox {
  key: string;
  name: string;
  /** The approved amount — a box's "Total Discount". */
  total: string;
  /** "2 claims approved" */
  approvedLine: string;
  /** "Rs. 300 awaiting review · 1 claim", or null when nothing is pending. */
  pendingLine: string | null;
  /** The All Branches box. */
  emphasis: boolean;
}

/** "1 October 2026 – 18 October 2026" — the window as the server reports it, worded as the web states it. */
export function formatDiscountWindow(from: string, to: string): string {
  const long = (d: string) => format(parseISO(d), 'd MMMM yyyy');
  return `${long(from)} – ${long(to)}`;
}

/**
 * Said over figures whose refresh failed, so a cached total is never read as a
 * current one. `updatedAt` is React Query's `dataUpdatedAt` (0 when unknown).
 */
export function formatStaleNotice(updatedAt: number): string {
  const when = updatedAt > 0 ? ` at ${format(updatedAt, 'h:mm a, d MMM')}` : ' earlier';
  return `Could not refresh — showing the figures loaded${when}. They may be out of date.`;
}

const claims = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'claim' : 'claims'}`;

function box(key: string, name: string, totals: DiscountSummaryTotals, emphasis = false): DiscountSummaryBox {
  return {
    key,
    name,
    total: formatCurrency(totals.approved.amount),
    approvedLine: `${claims(totals.approved.count)} approved`,
    pendingLine: totals.pending.count > 0 ? `${formatCurrency(totals.pending.amount)} awaiting review · ${claims(totals.pending.count)}` : null,
    emphasis,
  };
}

/**
 * One box per branch in the server's order (every active branch, Rs. 0 where
 * nothing was claimed), then All Branches on Production's view when there is
 * more than one branch.
 */
export function buildDiscountSummaryBoxes(
  summary: MonthlyDiscountSummary,
  { showBranches = false }: { showBranches?: boolean } = {},
): DiscountSummaryBox[] {
  const boxes = summary.branches.map((b) => box(b.branchId, b.branchName.replace('Mountain Bakes ', ''), b));
  if (showBranches && summary.branches.length > 1) boxes.push(box('all', 'All Branches', summary.totals, true));
  return boxes;
}
