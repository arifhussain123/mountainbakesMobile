import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financeService } from '../services';

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
