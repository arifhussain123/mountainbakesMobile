import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import { getCurrentGeoPosition } from '../geo';
import type { BranchReturn, BranchReturnListResponse, CreateBranchReturnInput, MonthlyReturnsSummary } from '../types';

export interface ListBranchReturnsParams {
  days?: number;
  status?: string;
  [key: string]: unknown;
}

/** `/api/stock/returns` — the branch's own return history, most recent first. */
export async function listBranchReturns(params?: ListBranchReturnsParams): Promise<BranchReturnListResponse> {
  return apiClient.get<BranchReturnListResponse>('/stock/returns', params);
}

/**
 * `/api/stock/returns/summary` — the branch's own returns this business month
 * to date, by status. The server reads the branch off the token.
 */
export async function getBranchReturnsSummary(): Promise<MonthlyReturnsSummary> {
  return apiClient.get<MonthlyReturnsSummary>('/stock/returns/summary');
}

/**
 * `/api/stock/return` — geofenced like order/sale creation; the branch balance
 * moves immediately, Production's pool credit waits for their review.
 */
export async function createBranchReturn(
  input: Omit<CreateBranchReturnInput, 'businessDate'>,
  idempotencyKey: string = generateIdempotencyKey('stock_return'),
): Promise<{ ids: string[] }> {
  const geoPosition = await getCurrentGeoPosition();
  const body: CreateBranchReturnInput = { ...input, businessDate: getBusinessDate() };
  const options: MutationOptions = { idempotencyKey, geoPosition };
  return apiClient.post<{ ids: string[] }>('/stock/return', body, options);
}

/** Only valid while the return is still 'pending' or 'returned'. Geofenced. */
export async function reviseBranchReturn(
  id: string,
  input: { qty: number; reason?: string },
  idempotencyKey: string = generateIdempotencyKey('stock_return_revise'),
): Promise<BranchReturn> {
  const geoPosition = await getCurrentGeoPosition();
  const options: MutationOptions = { idempotencyKey, geoPosition };
  return apiClient.put<BranchReturn>(`/stock/returns/${id}`, input, options);
}

/** Only valid while the return is still 'pending' or 'returned'. Geofenced. */
export async function withdrawBranchReturn(
  id: string,
  idempotencyKey: string = generateIdempotencyKey('stock_return_withdraw'),
): Promise<{ success: boolean }> {
  const geoPosition = await getCurrentGeoPosition();
  const options: MutationOptions = { idempotencyKey, geoPosition };
  return apiClient.delete<{ success: boolean }>(`/stock/returns/${id}`, options);
}
