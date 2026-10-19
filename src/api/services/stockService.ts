import { apiClient } from '../client';
import type { BranchStockSummaryResponse, StockListResponse } from '../types';

/**
 * `GET /stock` — one branch's per-product ledger for a business date. A branch
 * role is pinned to its own branch server-side; `branchId` is only honoured for
 * super_admin (Admin → Branch Stock), which has no branch of its own.
 */
export async function getStock(date?: string, branchId?: string): Promise<StockListResponse> {
  const params = { ...(date ? { date } : {}), ...(branchId ? { branchId } : {}) };
  return apiClient.get<StockListResponse>('/stock', Object.keys(params).length > 0 ? params : undefined);
}

/** `GET /stock/history/branches?days=N` — super_admin only: every branch's stock activity over the window. */
export async function getAllBranchesStockSummary(days: number): Promise<BranchStockSummaryResponse> {
  return apiClient.get<BranchStockSummaryResponse>('/stock/history/branches', { days });
}
