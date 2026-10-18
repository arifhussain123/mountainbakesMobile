import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import type {
  CancelProductionOrderInput,
  CreateProductionOrderInput,
  PreviousOrderBalance,
  ProductionOrder,
  ProductionOrderListResponse,
  ReviewProductionOrderInput,
  VerifyProductionOrderInput,
} from '../types';

/** `/api/production-orders` — last 7 business days, branch-scoped server-side. */
export async function listProductionOrders(): Promise<ProductionOrderListResponse> {
  return apiClient.get<ProductionOrderListResponse>('/production-orders');
}

/** `GET /production-orders/:id` — one demand's complete record, for the detail screen. */
export async function getProductionOrder(id: string): Promise<{ order: ProductionOrder }> {
  return apiClient.get<{ order: ProductionOrder }>(`/production-orders/${id}`);
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
 * `PUT /production-orders/:id/cancel` — the branch withdraws a demand it has
 * just raised, while it is still 'pending'. Not geofenced (unlike `/verify` —
 * there is no physical act here, only a decision).
 */
export async function cancelProductionOrder(id: string, input: CancelProductionOrderInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/production-orders/${id}/cancel`, input);
}

/**
 * `PUT /production-orders/:id/verify` — the branch confirms what physically
 * arrived against an 'awaiting_verification' demand. THIS is the step that
 * moves stock (migration 58) — review no longer does.
 *
 * `idempotencyKey`: pass the SAME key on a retry of the same verification.
 */
export async function verifyProductionOrder(
  id: string,
  input: VerifyProductionOrderInput,
  idempotencyKey: string = generateIdempotencyKey('production_order_verify'),
): Promise<{ success: boolean; items: { productId: string; productName: string; qty: number }[] }> {
  const options: MutationOptions = { idempotencyKey };
  return apiClient.put(`/production-orders/${id}/verify`, input, options);
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

/**
 * `GET /production-orders/:id/previous-balance` — the mockup's "Previous Order
 * Balance" + "Returned since last order" sections (screen 03). `production_user`/
 * `super_admin` only.
 */
export async function getPreviousOrderBalance(id: string): Promise<PreviousOrderBalance> {
  return apiClient.get<PreviousOrderBalance>(`/production-orders/${id}/previous-balance`);
}
