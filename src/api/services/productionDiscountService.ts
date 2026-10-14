import { apiClient } from '../client';
import type { BranchDiscount, BranchDiscountListResponse, ReviewBranchDiscountInput } from '../types';

export interface ListProductionDiscountsParams {
  from?: string;
  to?: string;
  branchId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * `/api/production-discounts` — Production's review queue for a branch's money
 * claim. Same row shape as the Branch app's own `/api/branch-discounts`
 * (`BranchDiscount`), just a different, role-scoped URL — reuse the type,
 * never duplicate it.
 */
export async function listProductionDiscounts(params?: ListProductionDiscountsParams): Promise<BranchDiscountListResponse> {
  return apiClient.get<BranchDiscountListResponse>('/production-discounts', params);
}

/** `PUT /production-discounts/:id/review` — approve, reject, or send back. Moves no money itself. */
export async function reviewProductionDiscount(id: string, input: ReviewBranchDiscountInput): Promise<BranchDiscount> {
  return apiClient.put<BranchDiscount>(`/production-discounts/${id}/review`, input);
}
