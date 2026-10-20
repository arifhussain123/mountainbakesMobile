import type { DailySaleAmendField, DailySaleRecord, DailySaleRecordStatus, FeedDailySaleRecordInput } from '@/api';

/**
 * Pure rules behind Super Admin's Daily Sale actions — the web's
 * `DailySaleRecordPage` (RowActions, Generate / Manual Feed buttons),
 * `ManualFeedDialog`, `AmendDialog` and `UnlockDialog`, reproduced exactly.
 * Every gate here is courtesy: the API re-decides each request against the
 * JWT and the status machine.
 */

/** open / pending_verification — still being counted and signed off. */
export function isDailySaleRecordOpen(status: DailySaleRecordStatus): boolean {
  return status === 'open' || status === 'pending_verification';
}

export interface DailySaleRowActions {
  /** A day with sales but no stored record has exactly one action. */
  generate: boolean;
  feed: boolean;
  verify: boolean;
  /** Only where there is a counted figure to correct — amending nothing is a first entry, i.e. Manual Feed. */
  amend: boolean;
  lock: boolean;
  unlock: boolean;
}

export function dailySaleRowActions(r: Pick<DailySaleRecord, 'id' | 'status' | 'fedAt'>): DailySaleRowActions {
  if (!r.id) return { generate: true, feed: false, verify: false, amend: false, lock: false, unlock: false };
  const open = isDailySaleRecordOpen(r.status);
  return {
    generate: false,
    feed: open,
    verify: open,
    amend: !open && r.fedAt !== null,
    lock: r.status === 'verified' || r.status === 'amended',
    unlock: !open,
  };
}

/** Today's row for the picked branch (any branch when none is picked) — drives the top buttons. */
export function findTodayRow(records: DailySaleRecord[], today: string, branchId: string | null): DailySaleRecord | null {
  return records.find((r) => r.businessDate === today && (!branchId || r.branchId === branchId)) ?? null;
}

/**
 * Generate Today is offered only while today has no stored record, for one
 * picked branch, and only when the window reaches today — afterwards the
 * useful action is Manual Feed.
 */
export function canGenerateToday(todayRow: DailySaleRecord | null, branchId: string | null, to: string, today: string): boolean {
  return !todayRow?.id && !!branchId && to >= today;
}

export type ManualMethod = 'cash' | 'easypaisa' | 'bank_account';
export const MANUAL_METHODS: readonly ManualMethod[] = ['cash', 'easypaisa', 'bank_account'];
export const MANUAL_METHOD_LABEL: Record<ManualMethod, string> = { cash: 'Cash', easypaisa: 'Easypaisa', bank_account: 'Bank' };

/** Cash is checked against Cash on Table (expenses already paid out of the drawer); the other two against gross. */
export function expectedOf(r: Pick<DailySaleRecord, 'expectedCashInHand' | 'autoEasypaisa' | 'autoBank'>, method: ManualMethod): number {
  const v = method === 'cash' ? r.expectedCashInHand : method === 'easypaisa' ? r.autoEasypaisa : r.autoBank;
  return Number(v ?? 0);
}

/** The label above each expected figure — cash's is not the raw takings. */
export const EXPECTED_LABEL: Record<ManualMethod, string> = { cash: 'Cash on table', easypaisa: 'System', bank_account: 'System' };

/** Seeded from what was already counted; an uncounted method starts EMPTY, never at the system figure. */
export function initialFeedValues(r: Pick<DailySaleRecord, 'manualCash' | 'manualEasypaisa' | 'manualBank'>): Record<ManualMethod, string> {
  const s = (v: number | null) => (v === null || v === undefined ? '' : String(v));
  return { cash: s(r.manualCash), easypaisa: s(r.manualEasypaisa), bank_account: s(r.manualBank) };
}

/** The live difference for a field, or null while it is empty or unparseable. */
export function liveDifference(expected: number, raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round((n - expected) * 100) / 100 : null;
}

const twoDecimals = (n: number) => Math.round(n * 100) === n * 100;

/**
 * The Manual Feed body, or the problem to show. A blank field leaves that
 * figure as it is; at least one must be entered; each is ≥ 0 with at most two
 * decimals (the numeric(14,2) column).
 */
export function feedPayload(
  values: Record<ManualMethod, string>,
  businessDate: string,
  branchId: string,
): { input: FeedDailySaleRecordInput } | { error: string } {
  const input: FeedDailySaleRecordInput = { businessDate, branchId };
  let any = false;
  for (const method of MANUAL_METHODS) {
    const raw = values[method].trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: `${MANUAL_METHOD_LABEL[method]}: enter a valid amount` };
    if (!twoDecimals(n)) return { error: `${MANUAL_METHOD_LABEL[method]}: at most 2 decimal places` };
    if (method === 'cash') input.cash = n;
    else if (method === 'easypaisa') input.easypaisa = n;
    else input.bank = n;
    any = true;
  }
  if (!any) return { error: 'Enter at least one counted amount' };
  return { input };
}

export const AMEND_FIELDS: readonly DailySaleAmendField[] = ['manual_cash', 'manual_easypaisa', 'manual_bank'];
export const AMEND_FIELD_LABEL: Record<DailySaleAmendField, string> = {
  manual_cash: 'Counted Cash',
  manual_easypaisa: 'Counted Easypaisa',
  manual_bank: 'Counted Bank',
};

export function currentAmendValue(
  r: Pick<DailySaleRecord, 'manualCash' | 'manualEasypaisa' | 'manualBank'>,
  field: DailySaleAmendField,
): number | null {
  return field === 'manual_cash' ? r.manualCash : field === 'manual_easypaisa' ? r.manualEasypaisa : r.manualBank;
}

/** Amend: a corrected amount (≥ 0, two decimals) and a reason of 3+ characters. */
export function amendPayload(amount: string, reason: string): { amount: number; reason: string } | { error: string } {
  const n = Number(amount);
  if (amount.trim() === '' || !Number.isFinite(n) || n < 0) return { error: 'Enter the corrected amount' };
  if (!twoDecimals(n)) return { error: 'An amount can have at most 2 decimal places' };
  if (reason.trim().length < 3) return { error: 'Say why this figure is being amended' };
  return { amount: n, reason: reason.trim() };
}

/** Unlock needs a reason of 3+ characters — the server's own minimum. */
export function unlockReasonProblem(reason: string): string | null {
  return reason.trim().length < 3 ? 'Say why this record is being unlocked' : null;
}
