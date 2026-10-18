import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financeService } from '../services';
import type {
  ApproveCashTransferInput,
  CreateFinanceTransactionInput,
  CreateLedgerHeadInput,
  FinanceAuditQuery,
  FinanceCashTransferQuery,
  FinanceReportQuery,
  FinanceTransactionQuery,
  LedgerQuery,
  RejectCashTransferInput,
  UpdateFinanceSettingsInput,
  UpdateFinanceTransactionInput,
  UpdateLedgerHeadInput,
} from '../types';

export function useFinanceDashboard(params?: { from?: string; to?: string; branchId?: string | null }) {
  return useQuery({
    queryKey: queryKeys.financeDashboard(params),
    queryFn: () => financeService.getFinanceDashboard(params),
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.pendingApprovals(),
    queryFn: () => financeService.getPendingApprovals(),
  });
}

export function useFinanceSettings() {
  return useQuery({
    queryKey: queryKeys.financeSettings(),
    queryFn: () => financeService.getFinanceSettings(),
  });
}

export function useUpdateFinanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFinanceSettingsInput) => financeService.updateFinanceSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.financeSettings() });
    },
  });
}

// ─── Daily Ledger (02) ───────────────────────────────────────────────────────

export function useLedgerPage(query: LedgerQuery) {
  return useQuery({
    queryKey: queryKeys.ledgerPage(query),
    queryFn: () => financeService.queryLedger(query),
  });
}

export function useLedgerSummary(params: { to?: string; branchId?: string }) {
  return useQuery({
    queryKey: queryKeys.ledgerSummary(params),
    queryFn: () => financeService.getLedgerSummary(params),
  });
}

export function useLedgerEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.ledgerEntry(id),
    queryFn: () => financeService.getLedgerEntry(id),
    enabled: !!id,
  });
}

// ─── Ledger Heads (16–17) ────────────────────────────────────────────────────

export function useLedgerHeads(opts?: { type?: 'income' | 'expense'; includeInactive?: boolean }) {
  return useQuery({
    queryKey: queryKeys.ledgerHeads(opts),
    queryFn: () => financeService.listLedgerHeads(opts),
  });
}

function invalidateLedgerHeads(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['ledgerHeads'] });
}

export function useCreateLedgerHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLedgerHeadInput) => financeService.createLedgerHead(input),
    onSuccess: () => invalidateLedgerHeads(queryClient),
  });
}

export function useUpdateLedgerHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLedgerHeadInput }) => financeService.updateLedgerHead(id, input),
    onSuccess: () => invalidateLedgerHeads(queryClient),
  });
}

// ─── Income & Expense (04–05) ────────────────────────────────────────────────

export function useFinanceTransactions(query: FinanceTransactionQuery) {
  return useQuery({
    queryKey: queryKeys.financeTransactions(query),
    queryFn: () => financeService.listFinanceTransactions(query),
  });
}

function invalidateFinanceTransactions(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals() });
}

export function useCreateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateFinanceTransactionInput; idempotencyKey?: string }) =>
      financeService.createFinanceTransaction(input, idempotencyKey),
    onSuccess: () => invalidateFinanceTransactions(queryClient),
  });
}

export function useUpdateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFinanceTransactionInput }) => financeService.updateFinanceTransaction(id, input),
    onSuccess: () => invalidateFinanceTransactions(queryClient),
  });
}

export function useSubmitFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeService.submitFinanceTransaction(id),
    onSuccess: () => invalidateFinanceTransactions(queryClient),
  });
}

export function useApproveFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes, idempotencyKey }: { id: string; notes?: string; idempotencyKey?: string }) =>
      financeService.approveFinanceTransaction(id, notes, idempotencyKey),
    onSuccess: () => invalidateFinanceTransactions(queryClient),
  });
}

export function useRejectFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey?: string }) =>
      financeService.rejectFinanceTransaction(id, reason, idempotencyKey),
    onSuccess: () => invalidateFinanceTransactions(queryClient),
  });
}

// ─── Daily Closing (18) ──────────────────────────────────────────────────────

export function useDayClosing(businessDate?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dayClosing(businessDate),
    queryFn: () => financeService.getDayClosing(businessDate),
    enabled: options?.enabled,
  });
}

export function useDayClosingHistory(days = 30) {
  return useQuery({
    queryKey: queryKeys.dayClosingHistory(days),
    queryFn: () => financeService.listDayClosings(days),
  });
}

export function useCloseFinanceDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessDate, notes, idempotencyKey }: { businessDate: string; notes?: string; idempotencyKey?: string }) =>
      financeService.closeFinanceDay(businessDate, notes, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dayClosingHistory(30) });
    },
  });
}

// ─── Reports (19) ────────────────────────────────────────────────────────────

export function useFinanceReport(query: FinanceReportQuery | null) {
  return useQuery({
    queryKey: queryKeys.financeReport(query ?? undefined),
    queryFn: () => financeService.getFinanceReport(query!),
    enabled: !!query,
  });
}

// ─── Audit Trail (20) ────────────────────────────────────────────────────────

export function useFinanceAudit(query: FinanceAuditQuery) {
  return useQuery({
    queryKey: queryKeys.financeAudit(query),
    queryFn: () => financeService.listFinanceAudit(query),
  });
}

// ─── Cash Transfers (03) ─────────────────────────────────────────────────────

export function useFinanceCashTransfers(query: FinanceCashTransferQuery) {
  return useQuery({
    queryKey: queryKeys.financeCashTransfers(query),
    queryFn: () => financeService.listFinanceCashTransfers(query),
  });
}

export function useFinanceCashTransfer(id: string) {
  return useQuery({
    queryKey: queryKeys.financeCashTransfer(id),
    queryFn: () => financeService.getFinanceCashTransfer(id),
    enabled: !!id,
  });
}

function invalidateCashTransfers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['financeCashTransfers'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals() });
}

export function useApproveFinanceCashTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: ApproveCashTransferInput; idempotencyKey?: string }) =>
      financeService.approveFinanceCashTransfer(id, input, idempotencyKey),
    onSuccess: () => invalidateCashTransfers(queryClient),
  });
}

export function useRejectFinanceCashTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: RejectCashTransferInput; idempotencyKey?: string }) =>
      financeService.rejectFinanceCashTransfer(id, input, idempotencyKey),
    onSuccess: () => invalidateCashTransfers(queryClient),
  });
}
