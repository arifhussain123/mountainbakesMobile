import { apiClient } from '../client';
import type {
  CreateProductionReturnInput,
  MonthlyReturnsSummary,
  ProductionReturnListResponse,
  ReviewProductionReturnInput,
} from '../types';

export interface ListProductionReturnsParams {
  from?: string;
  to?: string;
  branchId?: string;
  productId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/** `/api/production-returns` — last 30 days by default, newest first, server-paged. */
export async function listProductionReturns(params?: ListProductionReturnsParams): Promise<ProductionReturnListResponse> {
  return apiClient.get<ProductionReturnListResponse>('/production-returns', params);
}

/**
 * `/api/production-returns/summary` — this business month to date (1st → today,
 * the server's clock), per branch × status, plus an overall total. `branchId`
 * narrows it to one branch.
 */
export async function getProductionReturnsSummary(branchId?: string | null): Promise<MonthlyReturnsSummary> {
  return apiClient.get<MonthlyReturnsSummary>('/production-returns/summary', branchId ? { branchId } : undefined);
}

/** Production recording a return it received directly — no branch screen involved. */
export async function createProductionReturn(input: CreateProductionReturnInput): Promise<{ id: string }> {
  return apiClient.post<{ id: string }>('/production-returns', input);
}

/** `PUT /production-returns/:id/review` — approve, reject, or send back (branch-raised only). */
export async function reviewProductionReturn(id: string, input: ReviewProductionReturnInput): Promise<{ success: boolean; status: string }> {
  return apiClient.put<{ success: boolean; status: string }>(`/production-returns/${id}/review`, input);
}
