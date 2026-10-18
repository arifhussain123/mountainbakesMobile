/**
 * Ledger Closing — the checklist shown before "Close this day", and the rule
 * that days close in order.
 *
 * THE CHECKLIST BLOCKS NOTHING ON ITS OWN. The server is the gate: it refuses a
 * day with pending approvals (`countPendingForDate`, finance-ledger.service.ts)
 * and nothing else. Every other line here is a warning the closer reads before
 * typing the date, so an amber line is always visible rather than silently
 * waved through. The one exception is ordering — see `closeOrderBlocker`.
 */

export type ChecklistState = 'ok' | 'attention';

export type ChecklistKey = 'pendingApprovals' | 'unmatchedDeposits' | 'outlierSales' | 'previousDayClosed';

export interface ChecklistItem {
  key: ChecklistKey;
  state: ChecklistState;
  label: string;
  /** What the closer should do about an amber line; null when green. */
  hint: string | null;
}

export interface ClosingChecklistInput {
  /** Documents still draft / pending for the date (transactions, partner, advances, branch income, cash transfers). */
  pendingApprovals: number;
  /** Branch days for the date whose deposit is not received or does not match. */
  unmatchedDeposits: number;
  /** Branch days for the date flagged as outliers. */
  outlierSales: number;
  /** Whether the business date before this one is closed (true for the first date of the books). */
  previousDayClosed: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function computeClosingChecklist(input: ClosingChecklistInput): ChecklistItem[] {
  const { pendingApprovals, unmatchedDeposits, outlierSales, previousDayClosed } = input;
  return [
    {
      key: 'pendingApprovals',
      state: pendingApprovals > 0 ? 'attention' : 'ok',
      label: pendingApprovals > 0 ? `${plural(pendingApprovals, 'approval', 'approvals')} pending for this date` : 'No pending approvals for this date',
      hint: pendingApprovals > 0 ? 'Approve or reject them first. The server refuses to close over pending money.' : null,
    },
    {
      key: 'unmatchedDeposits',
      state: unmatchedDeposits > 0 ? 'attention' : 'ok',
      label: unmatchedDeposits > 0 ? `${plural(unmatchedDeposits, 'branch deposit', 'branch deposits')} not matched` : 'No unmatched deposits for this date',
      hint: unmatchedDeposits > 0 ? 'Check Branch Sales. Closing does not wait on branch deposits, but they will be harder to trace later.' : null,
    },
    {
      key: 'outlierSales',
      state: outlierSales > 0 ? 'attention' : 'ok',
      label: outlierSales > 0 ? `${plural(outlierSales, 'outlier sale', 'outlier sales')} for this date` : 'No outlier sales for this date',
      hint: outlierSales > 0 ? 'Confirm the figure with the branch before signing the day off.' : null,
    },
    {
      key: 'previousDayClosed',
      state: previousDayClosed ? 'ok' : 'attention',
      label: previousDayClosed ? 'Previous day closed' : 'Previous day is still open',
      hint: previousDayClosed ? null : 'Days close in order. Close the oldest open day first.',
    },
  ];
}

export const checklistNeedsAttention = (items: ChecklistItem[]) => items.some((i) => i.state === 'attention');

// ---------------------------------------------------------------------------
// Sequential closing
// ---------------------------------------------------------------------------

/** 'YYYY-MM-DD' shifted by whole days, on the calendar (business dates have no time zone). */
export function shiftDate(date: string, by: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + by));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * The oldest business date that is still open, from `firstDate` (the first day
 * of the books) up to `today`. Null when every day in that span is closed.
 */
export function oldestOpenDay(closedDates: Iterable<string>, firstDate: string, today: string): string | null {
  const closed = new Set(closedDates);
  for (let d = firstDate; d <= today; d = shiftDate(d, 1)) {
    if (!closed.has(d)) return d;
  }
  return null;
}

/**
 * Why `date` cannot be closed yet under the in-order rule, or null if it can.
 *
 * The day before must be closed, unless `date` is the first day of the books.
 * A future date is refused too, matching the server.
 */
export function closeOrderBlocker(date: string, closedDates: Iterable<string>, firstDate: string, today: string): string | null {
  const closed = new Set(closedDates);
  if (date > today) return 'A future business date cannot be closed.';
  if (closed.has(date)) return 'This day is already closed.';
  if (date <= firstDate) return null;
  const oldest = oldestOpenDay(closed, firstDate, today);
  if (oldest !== null && oldest < date) return `Close ${oldest} first. Days close in order.`;
  return null;
}
