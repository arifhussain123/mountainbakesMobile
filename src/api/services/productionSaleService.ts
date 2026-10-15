import { apiClient } from '../client';
import type { CreateProductionSaleInput, CreatePosSaleResult, OrderListResponse } from '../types';

export interface ListProductionSalesParams {
  from?: string;
  to?: string;
  [key: string]: unknown;
}

/** `/api/orders/production-sales` — the Production dashboard's own sale list. */
export async function listProductionSales(params?: ListProductionSalesParams): Promise<OrderListResponse> {
  return apiClient.get<OrderListResponse>('/orders/production-sales', params);
}

/**
 * `/api/orders/production-sale` — counter sale against the central production
 * pool. Unlike `createPosSale`, this route has no geofence and no
 * `idempotent()` middleware server-side (confirmed by reading
 * `orders.routes.ts`), so there is no geo position or idempotency key to
 * attach here.
 */
export async function createProductionSale(input: CreateProductionSaleInput): Promise<CreatePosSaleResult> {
  return apiClient.post<CreatePosSaleResult>('/orders/production-sale', input);
}
