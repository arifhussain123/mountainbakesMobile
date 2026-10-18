import { apiClient } from '../client';
import { getBusinessDate } from '../businessDate';
import type { BranchDiscount, BranchDiscountListResponse, CreateBranchDiscountInput, MonthlyDiscountSummary, ReviseBranchDiscountInput } from '../types';

export interface ListBranchDiscountsParams {
  status?: string;
  days?: number;
  [key: string]: unknown;
}

/** `/api/branch-discounts` — this branch's claims, last 90 days by default. */
export async function listBranchDiscounts(params?: ListBranchDiscountsParams): Promise<BranchDiscountListResponse> {
  return apiClient.get<BranchDiscountListResponse>('/branch-discounts', params);
}

/**
 * The branch's own `business_date`-ranged, searched/sorted/paginated list —
 * the same endpoint as `listBranchDiscounts`, with the fuller param set the
 * server actually accepts (`backend/src/routes/branch-discounts.routes.ts`):
 * explicit `from`/`to` (not `days`) override the rolling window entirely, and
 * `sortBy` goes through the server's own column allowlist (`date` → the
 * stored `business_date`, not `createdAt`).
 */
export interface ListBranchDiscountsPageParams {
  from: string;
  to: string;
  status?: string;
  search?: string;
  sortBy?: 'date' | 'createdAt' | 'reviewedAt' | 'demandNumber' | 'amount' | 'reason' | 'status';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export async function listBranchDiscountsPage(params: ListBranchDiscountsPageParams): Promise<BranchDiscountListResponse> {
  const { limit = 20, offset = 0, ...rest } = params;
  return apiClient.get<BranchDiscountListResponse>('/branch-discounts', { ...rest, limit, offset });
}

/** No idempotency key — `/branch-discounts` has no idempotency middleware (confirmed), so a create requires connectivity rather than being queued for blind retry. */
export async function createBranchDiscount(input: Omit<CreateBranchDiscountInput, 'businessDate'>): Promise<BranchDiscount> {
  const body: CreateBranchDiscountInput = { ...input, businessDate: getBusinessDate() };
  return apiClient.post<BranchDiscount>('/branch-discounts', body);
}

/** Only valid while the claim is still 'pending' or 'returned'; the server resets it to 'pending'. */
export async function reviseBranchDiscount(id: string, input: ReviseBranchDiscountInput): Promise<BranchDiscount> {
  return apiClient.put<BranchDiscount>(`/branch-discounts/${id}`, input);
}

/** Only valid while the claim is still 'pending' or 'returned'. A real DELETE — the row does not come back. */
export async function withdrawBranchDiscount(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/branch-discounts/${id}`);
}

/** `GET /branch-discounts/summary` — this branch's claims this business month; the server takes the branch from the token. */
export async function getBranchDiscountSummary(): Promise<MonthlyDiscountSummary> {
  return apiClient.get<MonthlyDiscountSummary>('/branch-discounts/summary');
}
