import type { ApproveCashTransferInput, FinancePendingApprovalKind, FinanceSettings } from '@/api';
// Direct file import, not the `@/navigation` barrel (it pulls in every screen).
import { Routes } from '@/navigation/routes';

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

/** A drawer screen of the Super Admin shell, optionally one screen of its stack. */
export interface LedgerLinkTarget {
  stack: string;
  screen?: string;
}

/** Web `PendingCashTransfersPanel`'s "Open Cash Transfers" link (`/finance-cash-transfers`). */
export const OPEN_CASH_TRANSFERS_TARGET: LedgerLinkTarget = {
  stack: Routes.FINANCE_CASH_TRANSFERS_STACK,
  screen: Routes.FINANCE_CASH_TRANSFERS_LIST,
};

/**
 * Web `PendingApprovalsPanel`'s REVIEW_ROUTE — each row's "Review" opens the
 * working screen that decides that kind of document, not the read-only ledger
 * of the same subject: `/finance-entries`, `/finance-partner-transactions`,
 * `/finance-payroll` (salaries and advances alike).
 */
export const PENDING_REVIEW_TARGET: Record<FinancePendingApprovalKind, LedgerLinkTarget> = {
  transaction: { stack: Routes.SUPER_ADMIN_FINANCE_ENTRIES },
  partner_expense: { stack: Routes.FINANCE_PARTNERS_STACK },
  salary: { stack: Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, screen: Routes.FINANCE_PAYROLL_LIST },
  advance: { stack: Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK, screen: Routes.FINANCE_PAYROLL_LIST },
};
