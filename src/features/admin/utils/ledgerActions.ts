import type { ApproveCashTransferInput, FinanceSettings } from '@/api';

/**
 * Pure rules behind Super Admin's Daily Ledger actions — the web's
 * `DailyLedgerPage`, whose only write controls are the pending panel's
 * Approve / Reject (`PendingCashTransfersPanel` → `CashTransferDecisionDialogs`).
 * The row Edit / Delete buttons are switched off on the web for every role
 * (`SHOW_ROW_EDIT_DELETE = false`), and "Pending approval" rows only link to
 * the screen that decides them, so neither has an action here.
 *
 * Every gate is courtesy: `requireFinance('approve')` on the API re-decides
 * each request from the JWT and the Finance Settings toggle.
 */

/** The server's `.max(500)` on both the approval note and the rejection reason. */
export const DECISION_TEXT_MAX = 500;

/**
 * Web `abilities.approve` for super_admin — `financeCan('super_admin',
 * 'approve', allowSuperAdminWrite)`, i.e. the Finance Settings toggle "Allow
 * Super Admin to modify". Off (and unknown while settings load) means no
 * Approve / Reject, exactly as the web's `?? false`.
 */
export function canDecideCashTransfers(settings: Pick<FinanceSettings, 'allowSuperAdminWrite'> | null | undefined): boolean {
  return settings?.allowSuperAdminWrite === true;
}

/** Web Approve body: the note only when one was typed (`{}` otherwise). */
export function approveBody(note: string): ApproveCashTransferInput {
  const trimmed = note.trim();
  return trimmed ? { note: trimmed } : {};
}

/** Web Reject's inline check — the server's `.trim().min(3)`. */
export function rejectReasonProblem(reason: string): string | null {
  return reason.trim().length < 3 ? 'Say why (at least 3 characters).' : null;
}

/** Web Approve toast: names the RV- receipt when the server posted one. */
export function approveSuccessMessage(transferNo: string, ledgerEntry: { voucherNo: string } | null | undefined): string {
  return ledgerEntry ? `Approved — receipt ${ledgerEntry.voucherNo} posted to the Daily Ledger` : `Approved ${transferNo}`;
}

/** Web Reject toast. */
export function rejectSuccessMessage(transferNo: string): string {
  return `Rejected ${transferNo} — the branch has been told why`;
}
