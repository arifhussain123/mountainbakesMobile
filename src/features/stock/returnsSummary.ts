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
  { showBranches = false, branchId = null }: { showBranches?: boolean; branchId?: string | null } = {},
): ReturnsSummaryTile[] {
  const totals = scopedReturnsTotals(summary, branchId);
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

/**
 * The branches that get a row on Production's per-branch list: those with at
 * least one return this month, in the server's order. The totals and Branches
 * Reporting are the server's, so leaving out the zero rows changes no figure.
 */
export function reportingBranches(summary: MonthlyReturnsSummary): MonthlyReturnsSummary['branches'] {
  return summary.branches.filter((b) => b.submitted.count > 0);
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

const zeroBucket = (): ReturnsBucket => ({ qty: 0, amount: 0, count: 0 });

/**
 * The totals the tiles show: every branch, or the one picked. The summary always
 * covers every branch, so picking one needs no second request; a branch with no
 * entry (none this month, or inactive) is all zeros.
 */
export function scopedReturnsTotals(summary: MonthlyReturnsSummary, branchId: string | null): ReturnsSummaryTotals {
  if (!branchId) return summary.totals;
  return (
    summary.branches.find((b) => b.branchId === branchId) ?? {
      submitted: zeroBucket(), pending: zeroBucket(), accepted: zeroBucket(), rejected: zeroBucket(), returned: zeroBucket(), unpricedCount: 0,
    }
  );
}

// ─── Monthly Return Amount by Branch (Production) ───────────────────────────
// Mirrors backend shared/utils/returns-summary.ts (`branchReturnAmount`,
// `buildBranchReturnBoxes`) so the phone and the web state the same figures.

/**
 * The statuses a branch's monthly return amount counts: approved, awaiting
 * review, and sent back to correct. Rejected is left out — refused, its units
 * went back on the branch's own balance.
 */
export const BRANCH_RETURN_AMOUNT_STATUSES: readonly ReturnsSummaryStatus[] = ['accepted', 'pending', 'returned'];

/** That rule over the server's status buckets, added in whole paisa. */
export function branchReturnAmount(totals: ReturnsSummaryTotals): number {
  return BRANCH_RETURN_AMOUNT_STATUSES.reduce((sum, s) => (Math.round(sum * 100) + Math.round(totals[s].amount * 100)) / 100, 0);
}

/** "Rs. 12,500.00" / "Rs. 0.00" — box amounts always carry the paisa. */
export function formatBoxAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface BranchReturnBox {
  branchId: string;
  name: string;
  amount: number;
  /** `formatBoxAmount(amount)` */
  total: string;
  /** This branch's returns still awaiting review — part of `amount`, not final. */
  awaitingAmount: number;
  /** How many claims (return rows) that is. */
  awaitingCount: number;
}

/**
 * The line under a box's amount, as the web words it: "Rs. 400.50 awaiting
 * review · 1 claim", or "Nothing awaiting review". `label` is the screen's own
 * name for the pending status.
 */
export function formatAwaitingLine(box: Pick<BranchReturnBox, 'awaitingAmount' | 'awaitingCount'>, label: string): string {
  const name = label.toLowerCase();
  if (box.awaitingCount === 0) return `Nothing ${name}`;
  const claims = `${box.awaitingCount.toLocaleString('en-US')} ${box.awaitingCount === 1 ? 'claim' : 'claims'}`;
  return `${formatBoxAmount(box.awaitingAmount)} ${name} · ${claims}`;
}

/**
 * One box per ACTIVE branch, alphabetical, matched to the summary by id (never
 * by name); Rs. 0.00 where the branch has no returns. Inactive branches get no
 * box, though their returns stay in the overall totals.
 */
export function buildBranchReturnBoxes(summary: MonthlyReturnsSummary, branches: { id: string; name: string; isActive?: boolean }[]): BranchReturnBox[] {
  const byId = new Map(summary.branches.map((b) => [b.branchId, b]));
  // Sorted on the full name, as the web is, before the shared prefix is dropped for display.
  return branches
    .filter((b) => b.isActive !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => {
      const entry = byId.get(b.id);
      const amount = entry ? branchReturnAmount(entry) : 0;
      return {
        branchId: b.id,
        name: b.name.replace('Mountain Bakes ', ''),
        amount,
        total: formatBoxAmount(amount),
        awaitingAmount: entry?.pending.amount ?? 0,
        awaitingCount: entry?.pending.count ?? 0,
      };
    });
}
