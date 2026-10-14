import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import type { CreateProductionOrderInput, ProductionOrderListResponse, ReviewProductionOrderInput } from '../types';

/** `/api/production-orders` — last 7 business days, branch-scoped server-side. */
export async function listProductionOrders(): Promise<ProductionOrderListResponse> {
  return apiClient.get<ProductionOrderListResponse>('/production-orders');
}

/**
 * Submits a branch's daily stock demand. No geofence on this route (unlike
 * sale/order/return creation) — only `/orders`, `/orders/pos` and
 * `/stock/return` are geofenced server-side.
 *
 * `idempotencyKey`: pass the SAME key on a retry of the same submission.
 */
export async function createProductionOrder(
  input: Omit<CreateProductionOrderInput, 'businessDate'>,
  idempotencyKey: string = generateIdempotencyKey('production_order'),
): Promise<{ id: string }> {
  const body: CreateProductionOrderInput = { ...input, businessDate: getBusinessDate() };
  const options: MutationOptions = { idempotencyKey };
  return apiClient.post<{ id: string }>('/production-orders', body, options);
}

/**
 * `PUT /production-orders/:id/review` — Production sends a pending demand out
 * (`awaiting_verification`, still transfers stock immediately) or rejects it.
 * `production_user`/`super_admin` only.
 */
export async function reviewProductionOrder(id: string, input: ReviewProductionOrderInput): Promise<{ success: boolean; status: string }> {
  return apiClient.put<{ success: boolean; status: string }>(`/production-orders/${id}/review`, input);
}

/** `PUT /production-orders/:id/final-approve` — only once the branch has verified. */
export async function finalApproveProductionOrder(id: string): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/production-orders/${id}/final-approve`);
}
