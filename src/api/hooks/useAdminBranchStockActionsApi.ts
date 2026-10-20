import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminBranchStockActionsService from '../services/adminBranchStockActionsService';
import type { AdminStockDeleteInput, AdminStockSaveInput } from '../types';

/**
 * Every view an admin stock correction makes wrong: the per-branch ledger and
 * the branch's own Stock page (both under `['stock']`), the day-by-day and
 * branch-wise histories, and Production's branch stock matrices.
 */
function invalidateStock(queryClient: ReturnType<typeof useQueryClient>) {
  for (const root of ['stock', 'stockHistorySeries', 'stockHistoryDay', 'stockHistoryBranches', 'productionBranchStock', 'productionCurrentStock']) {
    void queryClient.invalidateQueries({ queryKey: [root] });
  }
}

/** Admin → Branch Stock: Save edited figures, and Add Stock (one row, current + qty). */
export function useSaveAdminStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminStockSaveInput) => adminBranchStockActionsService.saveAdminStock(input),
    onSuccess: () => invalidateStock(queryClient),
  });
}

/** Admin → Branch Stock: Set to zero, or Delete permanently. */
export function useDeleteAdminStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminStockDeleteInput) => adminBranchStockActionsService.deleteAdminStock(input),
    onSuccess: () => invalidateStock(queryClient),
  });
}
