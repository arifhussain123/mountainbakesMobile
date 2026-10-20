import { apiClient } from '../client';
import type { PrepareSpecialOrderInput, SpecialOrderListResponse } from '../types';

/**
 * `/api/special-orders` — a branch's one-off sent straight to Production,
 * deliberately NOT a demand line and never counted in it (migration 143).
 * Open orders (pending/awaiting_verification/verified) plus the last 7
 * business days of finished ones — same window as `/production-orders`.
 */
export async function listSpecialOrders(): Promise<SpecialOrderListResponse> {
  return apiClient.get<SpecialOrderListResponse>('/special-orders');
}

/**
 * `PUT /special-orders/:id/prepare` — Production marks a pending Special
 * Order prepared, handing it to the branch to verify with a photo. No body
 * prepares every item in full. Moves no stock itself (migration 145 — stock
 * is added once, at the branch's own verify+approve step).
 */
export async function prepareSpecialOrder(
  id: string,
  input: PrepareSpecialOrderInput = {},
): Promise<{ success: boolean; status: string }> {
  return apiClient.put<{ success: boolean; status: string }>(`/special-orders/${id}/prepare`, input);
}

/**
 * `PUT /special-orders/:id/approve` — LEGACY: finishes an order the branch
 * verified before verification itself moved the stock. Nothing raised since
 * reaches 'verified', so this only ever clears old orders.
 */
export async function approveSpecialOrder(id: string): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/special-orders/${id}/approve`);
}
