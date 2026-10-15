import { apiClient } from '../client';
import type {
  AdjustLedgerEntryInput,
  ApproveCashTransferInput,
  CashTransfer,
  CashTransferListResponse,
  CreateFinanceTransactionInput,
  CreateLedgerHeadInput,
  EditLedgerEntryInput,
  FinanceAuditLog,
  FinanceAuditQuery,
  FinanceCashTransferQuery,
  FinanceDashboard,
  FinanceDayClosing,
  FinancePendingApproval,
  FinanceReport,
  FinanceReportQuery,
  FinanceSettings,
  FinanceTransaction,
  FinanceTransactionQuery,
  LedgerEntry,
  LedgerHead,
  LedgerPage,
  LedgerQuery,
  LedgerSummary,
  RejectCashTransferInput,
  UpdateFinanceSettingsInput,
  UpdateFinanceTransactionInput,
  UpdateLedgerHeadInput,
} from '../types';

/** `/api/finance/dashboard` — today's composite + a trailing trend. `requireFinance('view')`. */
export async function getFinanceDashboard(params?: { from?: string; to?: string; branchId?: string | null }): Promise<FinanceDashboard> {
  return apiClient.get<FinanceDashboard>('/finance/dashboard', params);
}

/** `/api/finance/pending-approvals` — the documents behind the dashboard's "pending approval" figure. */
export async function getPendingApprovals(): Promise<FinancePendingApproval[]> {
  const { items } = await apiClient.get<{ items: FinancePendingApproval[] }>('/finance/pending-approvals');
  return items;
}

/** `/api/finance/settings` — this is where `allowSuperAdminWrite` itself lives. */
export async function getFinanceSettings(): Promise<FinanceSettings> {
  const { settings } = await apiClient.get<{ settings: FinanceSettings }>('/finance/settings');
  return settings;
}

/** `configure` permission only. */
export async function updateFinanceSettings(input: UpdateFinanceSettingsInput): Promise<{ settings: FinanceSettings; postedVouchers: string[] }> {
  return apiClient.put<{ settings: FinanceSettings; postedVouchers: string[] }>('/finance/settings', input);
}

// ─── Daily Ledger (screen 02) — strictly read-only except the three `adjust` actions ──

export async function queryLedger(query: LedgerQuery): Promise<LedgerPage> {
  return apiClient.get<LedgerPage>('/finance/ledger', query as unknown as Record<string, unknown>);
}

export async function getLedgerSummary(params: { to?: string; branchId?: string }): Promise<LedgerSummary> {
  return apiClient.get<LedgerSummary>('/finance/ledger/summary', params);
}

export async function getLedgerEntry(id: string): Promise<LedgerEntry | null> {
  const { entry } = await apiClient.get<{ entry: LedgerEntry }>(`/finance/ledger/${id}`);
  return entry;
}

/** `adjust` permission — reverses, and optionally re-posts corrected. */
export async function adjustLedgerEntry(id: string, input: AdjustLedgerEntryInput): Promise<LedgerEntry[]> {
  const { entries } = await apiClient.post<{ entries: LedgerEntry[] }>(`/finance/ledger/${id}/adjust`, input);
  return entries;
}

/** `adjust` permission — edits the SAME voucher in place. */
export async function editLedgerEntry(id: string, input: EditLedgerEntryInput): Promise<LedgerEntry> {
  const { entry } = await apiClient.patch<{ entry: LedgerEntry }>(`/finance/ledger/${id}`, input);
  return entry;
}

/** `adjust` permission. */
export async function deleteLedgerEntry(id: string, reason: string): Promise<{ deleted: true; voucherNo: string }> {
  return apiClient.deleteWithBody<{ deleted: true; voucherNo: string }>(`/finance/ledger/${id}`, { reason });
}

// ─── Ledger Heads (screens 16–17) ───────────────────────────────────────────

export async function listLedgerHeads(opts?: { type?: 'income' | 'expense'; includeInactive?: boolean }): Promise<LedgerHead[]> {
  const { heads } = await apiClient.get<{ heads: LedgerHead[] }>('/finance/heads', opts);
  return heads;
}

/** `configure` permission. */
export async function createLedgerHead(input: CreateLedgerHeadInput): Promise<LedgerHead> {
  const { head } = await apiClient.post<{ head: LedgerHead }>('/finance/heads', input);
  return head;
}

/** `configure` permission — `code`/`type` are not editable (not in `UpdateLedgerHeadInput`). */
export async function updateLedgerHead(id: string, input: UpdateLedgerHeadInput): Promise<LedgerHead> {
  const { head } = await apiClient.put<{ head: LedgerHead }>(`/finance/heads/${id}`, input);
  return head;
}

// ─── Daily Closing (screen 18) ──────────────────────────────────────────────

export async function getDayClosing(businessDate?: string): Promise<FinanceDayClosing> {
  const { closing } = await apiClient.get<{ closing: FinanceDayClosing }>('/finance/closing', businessDate ? { date: businessDate } : undefined);
  return closing;
}

export async function listDayClosings(days = 30): Promise<FinanceDayClosing[]> {
  const { closings } = await apiClient.get<{ closings: FinanceDayClosing[] }>('/finance/closing/history', { days });
  return closings;
}

/** `approve` permission — closing a day is a sign-off, same class of act as approving a voucher. */
export async function closeFinanceDay(businessDate: string, notes?: string): Promise<FinanceDayClosing> {
  const { closing } = await apiClient.post<{ closing: FinanceDayClosing }>('/finance/closing', { businessDate, notes });
  return closing;
}

// ─── Reports (screen 19) ────────────────────────────────────────────────────

export async function getFinanceReport(query: FinanceReportQuery): Promise<FinanceReport> {
  const { report } = await apiClient.get<{ report: FinanceReport }>('/finance-reports', query as unknown as Record<string, unknown>);
  return report;
}

// ─── Audit Trail (screen 20) ────────────────────────────────────────────────

export async function listFinanceAudit(query: FinanceAuditQuery): Promise<{ logs: FinanceAuditLog[]; total: number }> {
  return apiClient.get<{ logs: FinanceAuditLog[]; total: number }>('/finance/audit', query as unknown as Record<string, unknown>);
}

// ─── Cash Transfers (screen 03) — Finance's review side of the Branch app's Cash Deposit ──

export async function listFinanceCashTransfers(query: FinanceCashTransferQuery): Promise<CashTransferListResponse> {
  return apiClient.get<CashTransferListResponse>('/finance/cash-transfers', query as unknown as Record<string, unknown>);
}

export async function getFinanceCashTransfer(id: string): Promise<CashTransfer> {
  return apiClient.get<CashTransfer>(`/finance/cash-transfers/${id}`);
}

/** `approve` permission — posts an RV- receipt under INC-BRANCH-CASH (+ a second under INC-FUEL if fuel charges were entered). */
export async function approveFinanceCashTransfer(id: string, input: ApproveCashTransferInput): Promise<{ transfer: CashTransfer; ledgerEntry: LedgerEntry | null }> {
  return apiClient.put<{ transfer: CashTransfer; ledgerEntry: LedgerEntry | null }>(`/finance/cash-transfers/${id}/approve`, input);
}

export async function rejectFinanceCashTransfer(id: string, input: RejectCashTransferInput): Promise<{ transfer: CashTransfer }> {
  return apiClient.put<{ transfer: CashTransfer }>(`/finance/cash-transfers/${id}/reject`, input);
}

// ─── Income & Expense (screens 04–05) — manual documents, `/finance/income/entries` ──

export async function listFinanceTransactions(query: FinanceTransactionQuery): Promise<{ entries: FinanceTransaction[]; total: number }> {
  return apiClient.get<{ entries: FinanceTransaction[]; total: number }>('/finance/income/entries', query as unknown as Record<string, unknown>);
}

export async function createFinanceTransaction(input: CreateFinanceTransactionInput): Promise<FinanceTransaction> {
  const { entry } = await apiClient.post<{ entry: FinanceTransaction }>('/finance/income/entries', input);
  return entry;
}

/** Only editable while `draft`/`rejected` — `EDITABLE_DOC_STATUSES`. */
export async function updateFinanceTransaction(id: string, input: UpdateFinanceTransactionInput): Promise<FinanceTransaction> {
  const { entry } = await apiClient.put<{ entry: FinanceTransaction }>(`/finance/income/entries/${id}`, input);
  return entry;
}

export async function submitFinanceTransaction(id: string): Promise<FinanceTransaction> {
  const { entry } = await apiClient.post<{ entry: FinanceTransaction }>(`/finance/income/entries/${id}/submit`);
  return entry;
}

export async function approveFinanceTransaction(id: string, notes?: string): Promise<{ entry: FinanceTransaction; ledgerEntry: LedgerEntry }> {
  return apiClient.post<{ entry: FinanceTransaction; ledgerEntry: LedgerEntry }>(`/finance/income/entries/${id}/approve`, { notes });
}

export async function rejectFinanceTransaction(id: string, reason: string): Promise<{ entry: FinanceTransaction }> {
  return apiClient.post<{ entry: FinanceTransaction }>(`/finance/income/entries/${id}/reject`, { reason });
}
