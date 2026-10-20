import { useQuery } from '@tanstack/react-query';
import { LIVE_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { stockService } from '../services';

export function useStock(date?: string) {
  return useQuery({
    queryKey: queryKeys.stock(date),
    queryFn: () => stockService.getStock(date),
    staleTime: LIVE_STALE_TIME_MS,
  });
}

/** Admin → Branch Stock: one branch's per-product ledger for a business date. Off until a branch is chosen. */
export function useBranchStock(branchId: string | null, date: string) {
  return useQuery({
    queryKey: queryKeys.branchStock(branchId ?? '', date),
    queryFn: () => stockService.getStock(date, branchId!),
    enabled: !!branchId,
    staleTime: LIVE_STALE_TIME_MS,
  });
}

/** Admin → Branch Stock, "All branches": each branch's stock activity over the last `days` days. */
export function useAllBranchesStockSummary(days: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.allBranchesStockSummary(days),
    queryFn: () => stockService.getAllBranchesStockSummary(days),
    enabled,
    staleTime: LIVE_STALE_TIME_MS,
  });
}
