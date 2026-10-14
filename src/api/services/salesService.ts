import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import { getCurrentGeoPosition } from '../geo';
import type { CreatePosSaleInput, CreatePosSaleResult, OrderListResponse } from '../types';

export interface ListOrdersParams {
  status?: string;
  from?: string;
  to?: string;
  [key: string]: unknown;
}

export async function listOrders(params?: ListOrdersParams): Promise<OrderListResponse> {
  return apiClient.get<OrderListResponse>('/orders', params);
}

/**
 * Creates a POS sale. Reads the device's current GPS position (CLAUDE.md Section
 * 31) and stamps the business date (2 AM Karachi rollover) itself — the two
 * things `CreatePosSaleInput` leaves to the caller rather than the UI layer,
 * since every call site needs them identically.
 *
 * `idempotencyKey`: pass the SAME key on a retry of the same logical sale (e.g.
 * after a timeout) — generate a fresh one only for a genuinely new sale.
 */
export async function createPosSale(
  input: Omit<CreatePosSaleInput, 'businessDate'>,
  idempotencyKey: string = generateIdempotencyKey('sale'),
): Promise<CreatePosSaleResult> {
  const geoPosition = await getCurrentGeoPosition();
  const body: CreatePosSaleInput = { ...input, businessDate: getBusinessDate() };
  const options: MutationOptions = { idempotencyKey, geoPosition };
  return apiClient.post<CreatePosSaleResult>('/orders/pos', body, options);
}
