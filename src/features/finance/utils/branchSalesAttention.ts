import type { FinanceDailySaleRow } from '@/api/types';

/**
 * Daily Closing · Branch Sales — which branch days need Finance's attention.
 *
 * The deposit states are the server's (`reconciliation.status`, decided by
 * `deposit-reconciliation.ts`); this file only sorts them into the lists the
 * tab shows on top. The OUTLIER rule is the one figure decided here: neither
 * the server nor the web flags outliers, so it is a phone-side warning that
 * never changes a figure.
 */

/** A day is an outlier above this multiple of the branch's median day. */
export const OUTLIER_FACTOR = 3;
/** The median needs at least this many other days with sales to mean anything. */
export const OUTLIER_MIN_DAYS = 5;

export const dayKey = (r: Pick<FinanceDailySaleRow, 'branchId' | 'businessDate'>) => `${r.branchId}|${r.businessDate}`;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * The keys of branch days whose total sale is more than OUTLIER_FACTOR times
 * the median of the same branch's OTHER days with sales in the window.
 *
 * The day itself is left out of its own median, so one huge day cannot hide
 * itself by lifting the bar.
 */
export function findOutliers(rows: readonly FinanceDailySaleRow[]): Set<string> {
  const byBranch = new Map<string, FinanceDailySaleRow[]>();
  for (const r of rows) {
    if (r.autoTotalSale <= 0) continue;
    const list = byBranch.get(r.branchId);
    if (list) list.push(r);
    else byBranch.set(r.branchId, [r]);
  }
  const out = new Set<string>();
  for (const list of byBranch.values()) {
    if (list.length - 1 < OUTLIER_MIN_DAYS) continue;
    for (const r of list) {
      const others = list.filter((o) => o !== r).map((o) => o.autoTotalSale);
      if (r.autoTotalSale > OUTLIER_FACTOR * median(others)) out.add(dayKey(r));
    }
  }
  return out;
}

export type AttentionKind = 'notReceived' | 'discrepancy' | 'awaitingApproval' | 'outlier';

export const ATTENTION_LABELS: Record<AttentionKind, string> = {
  notReceived: 'Not received · day closed',
  discrepancy: 'Discrepancy',
  awaitingApproval: 'Awaiting approval',
  outlier: 'Outlier sales',
};

export const ATTENTION_ORDER: readonly AttentionKind[] = ['notReceived', 'discrepancy', 'awaitingApproval', 'outlier'];

/**
 * The "Needs attention" lists, newest day first inside each.
 *
 * "Not received" counts only days the branch has finished with (its record is
 * no longer `open`): an open day's deposit is not late yet, it is not due.
 * A day can sit in two lists (an outlier that is also a discrepancy).
 */
export function needsAttention(rows: readonly FinanceDailySaleRow[]): Record<AttentionKind, FinanceDailySaleRow[]> {
  const outliers = findOutliers(rows);
  const lists: Record<AttentionKind, FinanceDailySaleRow[]> = { notReceived: [], discrepancy: [], awaitingApproval: [], outlier: [] };
  for (const r of rows) {
    const s = r.reconciliation.status;
    if (s === 'not_received' && r.status !== 'open') lists.notReceived.push(r);
    if (s === 'discrepancy') lists.discrepancy.push(r);
    if (s === 'pending') lists.awaitingApproval.push(r);
    if (outliers.has(dayKey(r))) lists.outlier.push(r);
  }
  const newestFirst = (a: FinanceDailySaleRow, b: FinanceDailySaleRow) =>
    b.businessDate.localeCompare(a.businessDate) || a.branchName.localeCompare(b.branchName);
  for (const k of ATTENTION_ORDER) lists[k].sort(newestFirst);
  return lists;
}

/** One business date's figures for the Ledger Closing checklist. */
export function dateAttention(rows: readonly FinanceDailySaleRow[], date: string, unmatchedDepositDates: readonly string[]) {
  const outliers = findOutliers(rows);
  const onDate = rows.filter((r) => r.businessDate === date);
  return {
    unmatchedDeposits:
      onDate.filter((r) => r.reconciliation.status === 'discrepancy' || (r.reconciliation.status === 'not_received' && r.status !== 'open')).length +
      unmatchedDepositDates.filter((d) => d === date).length,
    outlierSales: onDate.filter((r) => outliers.has(dayKey(r))).length,
  };
}
