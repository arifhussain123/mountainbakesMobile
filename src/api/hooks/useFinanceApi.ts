import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '../client';
import { queryKeys } from '../queryKeys';
import { financeService } from '../services';
import type {
  ApproveCashTransferInput,
  CreateFinanceTransactionInput,
  CreateLedgerHeadInput,
  FinanceAuditQuery,
  FinanceDashboardRecordsQuery,
  FinanceMonthlyDashboardQuery,
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

/** The monthly dashboard. Keeps the previous filter's figures on screen while the next one loads, as the web does. */
export function useFinanceMonthlyDashboard(query: FinanceMonthlyDashboardQuery) {
  return useQuery({
    queryKey: queryKeys.financeMonthlyDashboard(query),
    queryFn: () => financeService.getFinanceMonthlyDashboard(query),
    placeholderData: keepPreviousData,
  });
}

export function useFinanceDashboardRecords(query: FinanceDashboardRecordsQuery) {
  return useQuery({
    queryKey: queryKeys.financeDashboardRecords(query),
    queryFn: () => financeService.getFinanceDashboardRecords(query),
    placeholderData: keepPreviousData,
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

/**
 * The cash book in posting order, `pageSize` vouchers a page, for infinite
 * scroll. Opening balance and totals are server-side over the whole filtered
 * set, so every page carries the same ones.
 */
export function useLedgerPages(query: Omit<LedgerQuery, 'limit' | 'offset'>, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.ledgerPages({ ...query, pageSize }),
    queryFn: ({ pageParam }) => financeService.queryLedger({ ...query, limit: pageSize, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.entries.length, 0);
      return loaded < lastPage.total && lastPage.entries.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
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

export function useFinanceCashTransfers(query: FinanceCashTransferQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.financeCashTransfers(query),
    queryFn: () => financeService.listFinanceCashTransfers(query),
    enabled: options?.enabled ?? true,
  });
}

const CASH_TRANSFERS_PAGE = 50;

/** The list, 50 a page, for infinite scroll. Same filters as `useFinanceCashTransferSummary`. */
export function useFinanceCashTransferPages(query: Omit<FinanceCashTransferQuery, 'limit' | 'offset'>, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: queryKeys.financeCashTransfersPages(query),
    queryFn: ({ pageParam }) => financeService.listFinanceCashTransfers({ ...query, limit: CASH_TRANSFERS_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.transfers.length, 0);
      return loaded < lastPage.total && lastPage.transfers.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/**
 * The summary strip's figures. An API without the endpoint yet answers 404 —
 * that is "not available", not an error to retry; the strip hides itself.
 */
export function useFinanceCashTransferSummary(query: Omit<FinanceCashTransferQuery, 'sortBy' | 'sortDir' | 'limit' | 'offset'>) {
  return useQuery({
    queryKey: queryKeys.financeCashTransferSummary(query),
    queryFn: () => financeService.getFinanceCashTransferSummary(query),
    placeholderData: keepPreviousData,
    retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 2,
  });
}

/** Daily Closing's branch days over a window — the source of every Cash Transfers match badge. */
export function useFinanceDailySales(params: { from: string; to: string; branchId?: string } | null) {
  return useQuery({
    queryKey: queryKeys.financeDailySales(params),
    queryFn: () => financeService.listFinanceDailySales(params!),
    enabled: !!params,
    placeholderData: keepPreviousData,
  });
}

export function useFinanceCashTransfer(id: string) {
  return useQuery({
    queryKey: queryKeys.financeCashTransfer(id),
    queryFn: () => financeService.getFinanceCashTransfer(id),
    enabled: !!id,
  });
}

/**
 * A decision moves more than the list: the transfer itself, the summary (both
 * under ['financeCashTransfers']), Daily Closing's deposit status, and — for an
 * approval — the RV- vouchers in the Daily Ledger and the dashboard's figures.
 */
function invalidateCashTransfers(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  for (const queryKey of [
    ['financeCashTransfers'],
    queryKeys.financeCashTransfer(id),
    ['financeDailySales'],
    queryKeys.pendingApprovals(),
    ['ledgerPage'],
    ['ledgerSummary'],
    ['dayClosing'],
    ['financeDashboard'],
  ]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function useApproveFinanceCashTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: ApproveCashTransferInput; idempotencyKey?: string }) =>
      financeService.approveFinanceCashTransfer(id, input, idempotencyKey),
    // On error too: a 409 means someone else decided first, and the screen must show their decision.
    onSettled: (_data, _error, { id }) => invalidateCashTransfers(queryClient, id),
  });
}

export function useRejectFinanceCashTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: RejectCashTransferInput; idempotencyKey?: string }) =>
      financeService.rejectFinanceCashTransfer(id, input, idempotencyKey),
    onSettled: (_data, _error, { id }) => invalidateCashTransfers(queryClient, id),
  });
}
