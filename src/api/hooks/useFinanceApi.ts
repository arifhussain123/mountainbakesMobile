import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financeService } from '../services';
import type {
  FinanceAuditQuery,
  FinanceReportQuery,
  LedgerQuery,
  UpdateFinanceSettingsInput,
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

// ─── Daily Closing (18) ──────────────────────────────────────────────────────

export function useDayClosing(businessDate?: string) {
  return useQuery({
    queryKey: queryKeys.dayClosing(businessDate),
    queryFn: () => financeService.getDayClosing(businessDate),
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
    mutationFn: ({ businessDate, notes }: { businessDate: string; notes?: string }) => financeService.closeFinanceDay(businessDate, notes),
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
