import { apiClient } from '../client';
import { getBusinessDate } from '../businessDate';
import type { BranchDiscount, BranchDiscountListResponse, CreateBranchDiscountInput } from '../types';

export interface ListBranchDiscountsParams {
  status?: string;
  days?: number;
  [key: string]: unknown;
}

/** `/api/branch-discounts` — this branch's claims, last 90 days by default. */
export async function listBranchDiscounts(params?: ListBranchDiscountsParams): Promise<BranchDiscountListResponse> {
  return apiClient.get<BranchDiscountListResponse>('/branch-discounts', params);
}

/** No idempotency key, no geofence — a discount claim moves no stock. */
export async function createBranchDiscount(input: Omit<CreateBranchDiscountInput, 'businessDate'>): Promise<BranchDiscount> {
  const body: CreateBranchDiscountInput = { ...input, businessDate: getBusinessDate() };
  return apiClient.post<BranchDiscount>('/branch-discounts', body);
}

/** Only valid while the claim is still 'pending' or 'returned'; the server resets it to 'pending'. */
export async function reviseBranchDiscount(id: string, input: { amount: number; reason: string }): Promise<BranchDiscount> {
  return apiClient.put<BranchDiscount>(`/branch-discounts/${id}`, input);
}

/** Only valid while the claim is still 'pending' or 'returned'. */
export async function withdrawBranchDiscount(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/branch-discounts/${id}`);
}
