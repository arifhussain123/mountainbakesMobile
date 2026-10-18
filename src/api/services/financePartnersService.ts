import { apiClient } from '../client';
import type {
  CreatePartnerExpenseInput,
  FinancePartner,
  LedgerEntry,
  PartnerExpense,
  PartnerExpenseQuery,
  PartnerLedger,
  PartnerLedgerQuery,
  PartnerLedgerTransactions,
  PartnerLedgerTransactionsQuery,
  PartnerShareSummary,
  UpdateFinancePartnerInput,
} from '../types';

const BASE = '/finance/partner-expenses';

export async function listFinancePartners(includeInactive?: boolean): Promise<{ partners: FinancePartner[]; total: number }> {
  return apiClient.get<{ partners: FinancePartner[]; total: number }>(`${BASE}/partners`, { includeInactive });
}

/** `configure` permission — name/sharePct are fixed at seed time, not editable here. */
export async function updateFinancePartner(id: string, input: UpdateFinancePartnerInput, idempotencyKey?: string): Promise<FinancePartner> {
  const { partner } = await apiClient.put<{ partner: FinancePartner }>(`${BASE}/partners/${id}`, input, { idempotencyKey });
  return partner;
}

export async function getPartnerShareSummary(params?: { from?: string; to?: string }): Promise<PartnerShareSummary> {
  const { summary } = await apiClient.get<{ summary: PartnerShareSummary }>(`${BASE}/share-summary`, params);
  return summary;
}

export async function listPartnerExpenses(query: PartnerExpenseQuery): Promise<{ expenses: PartnerExpense[]; total: number }> {
  return apiClient.get<{ expenses: PartnerExpense[]; total: number }>(BASE, query as unknown as Record<string, unknown>);
}

export async function createPartnerExpense(input: CreatePartnerExpenseInput, idempotencyKey?: string): Promise<PartnerExpense> {
  const { expense } = await apiClient.post<{ expense: PartnerExpense }>(BASE, input, { idempotencyKey });
  return expense;
}

export async function submitPartnerExpense(id: string, idempotencyKey?: string): Promise<PartnerExpense> {
  const { expense } = await apiClient.post<{ expense: PartnerExpense }>(`${BASE}/${id}/submit`, undefined, { idempotencyKey });
  return expense;
}

export async function approvePartnerExpense(id: string, notes?: string, idempotencyKey?: string): Promise<{ expense: PartnerExpense; ledgerEntry: LedgerEntry }> {
  return apiClient.post<{ expense: PartnerExpense; ledgerEntry: LedgerEntry }>(`${BASE}/${id}/approve`, { notes }, { idempotencyKey });
}

export async function rejectPartnerExpense(id: string, reason: string, idempotencyKey?: string): Promise<{ expense: PartnerExpense }> {
  return apiClient.post<{ expense: PartnerExpense }>(`${BASE}/${id}/reject`, { reason }, { idempotencyKey });
}

// ─── Partner Ledger (screen 15 "Company Transaction Details") — strictly read-only ──

export async function getPartnerLedger(query: PartnerLedgerQuery): Promise<PartnerLedger> {
  const { ledger } = await apiClient.get<{ ledger: PartnerLedger }>(`${BASE}/ledger`, query as unknown as Record<string, unknown>);
  return ledger;
}

export async function getPartnerLedgerTransactions(query: PartnerLedgerTransactionsQuery): Promise<PartnerLedgerTransactions> {
  return apiClient.get<PartnerLedgerTransactions>(`${BASE}/ledger/transactions`, query as unknown as Record<string, unknown>);
}
