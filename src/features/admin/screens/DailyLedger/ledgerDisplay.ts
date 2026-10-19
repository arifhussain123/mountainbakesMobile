import type { CashTransfer, FinancePendingApprovalKind, LedgerEntry, LedgerEntryStatus } from '@/api';

/**
 * Display rules copied from the web Daily Ledger
 * (frontend/src/components/finance/DailyLedgerPage.tsx) so the phone shows
 * the same rows the web does. Pure functions — nothing here changes a stored
 * entry; both are "don't show it twice on screen", not accounting fixes.
 */

/** A row as rendered — either a real ledger entry, or two of them merged into one. */
export type DisplayEntry = LedgerEntry & { merged?: boolean };

const BRANCH_INCOME_SOURCE_TYPES = new Set(['branch_income', 'company_share', 'branch_share']);

/**
 * Hides a manual Income & Expense entry that re-keys money already posted from
 * a branch's daily closing (same ledger head, same date, same amount). The
 * footer totals still include it — both are real posted rows.
 */
export function hideDuplicateManualEntries(entries: LedgerEntry[]): LedgerEntry[] {
  const key = (e: LedgerEntry) => `${e.ledgerHeadId}|${e.entryDate}|${e.debit || e.credit}`;
  const branchIncomeKeys = new Set(entries.filter((e) => BRANCH_INCOME_SOURCE_TYPES.has(e.sourceType)).map(key));
  if (branchIncomeKeys.size === 0) return entries;

  return entries.filter((e) => e.sourceType !== 'manual' || !branchIncomeKeys.has(key(e)));
}

/**
 * Branch income approval posts a company-share and a branch-share entry as two
 * real rows with the same sourceId. Merges each pair into one "Branch Income"
 * row carrying the whole amount collected; the later-posted leg's running
 * balance already reflects both movements.
 */
export function mergeBranchIncomePairs(entries: LedgerEntry[]): DisplayEntry[] {
  const consumed = new Set<string>();
  const merged: DisplayEntry[] = [];

  for (const e of entries) {
    if (consumed.has(e.id)) continue;

    const isShareLeg = e.sourceType === 'company_share' || e.sourceType === 'branch_share';
    const pair = isShareLeg
      ? entries.find(
          (o) =>
            o.id !== e.id &&
            !consumed.has(o.id) &&
            o.sourceId === e.sourceId &&
            (o.sourceType === 'company_share' || o.sourceType === 'branch_share') &&
            o.sourceType !== e.sourceType,
        )
      : undefined;

    if (pair) {
      consumed.add(e.id);
      consumed.add(pair.id);
      const [first, second] = e.seq < pair.seq ? [e, pair] : [pair, e];
      merged.push({
        ...second,
        id: `${first.id}+${second.id}`,
        voucherNo: `${first.voucherNo} / ${second.voucherNo}`,
        ledgerHeadName: 'Branch Income',
        description: `Branch income collected — ${first.branchName ?? 'branch'}`,
        debit: Math.round((first.debit + second.debit) * 100) / 100,
        credit: 0,
        merged: true,
      });
    } else {
      merged.push(e);
    }
  }

  return merged;
}

/** The web's pipeline: hide manual duplicates, then merge share pairs. */
export function toDisplayEntries(entries: LedgerEntry[]): DisplayEntry[] {
  return mergeBranchIncomePairs(hideDuplicateManualEntries(entries));
}

export const LEDGER_STATUS_LABELS: Record<LedgerEntryStatus, string> = {
  posted: 'Posted',
  locked: 'Locked',
  reversed: 'Reversed',
};

/** `FINANCE_PENDING_APPROVAL_LABELS` on the web. */
export const PENDING_APPROVAL_LABELS: Record<FinancePendingApprovalKind, string> = {
  transaction: 'Income / Expense',
  partner_expense: 'Partner Expense',
  salary: 'Salary',
  advance: 'Employee Advance',
};

/** `shortBranch` on the web — "Mountain Bakes Committee Chowk" → "Committee Chowk". */
export function shortBranch(name: string | null | undefined): string {
  return (name ?? '').replace('Mountain Bakes ', '') || '—';
}

/** `cashTransferChannelsLabel` on the web — "Cash + Easypaisa", "Fuel only" or "—". */
export function channelsLabel(t: Pick<CashTransfer, 'cashAmount' | 'easypaisaAmount' | 'bankAmount' | 'fuelCharges'>): string {
  const used = (
    [
      ['Cash', t.cashAmount],
      ['Easypaisa', t.easypaisaAmount],
      ['Bank', t.bankAmount],
    ] as [string, number][]
  )
    .filter(([, v]) => v > 0)
    .map(([label]) => label);
  if (used.length > 0) return used.join(' + ');
  return (t.fuelCharges ?? 0) > 0 ? 'Fuel only' : '—';
}

/** Amount filter text → number, or undefined for blank / non-numeric (never NaN). */
export function parseAmount(text: string): number | undefined {
  const s = text.trim();
  return s === '' || !Number.isFinite(Number(s)) ? undefined : Number(s);
}
