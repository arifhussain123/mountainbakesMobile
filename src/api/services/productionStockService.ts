import { apiClient } from '../client';
import type {
  CreateProductionAdjustmentInput,
  PrepareProductionInput,
  PrepareProductionResult,
  ProductionAdjustmentResult,
  ProductionStockListResponse,
} from '../types';

/** `/api/production-stock?date=` — the central pool, defaults to today. */
export async function listProductionStock(date?: string): Promise<ProductionStockListResponse> {
  return apiClient.get<ProductionStockListResponse>('/production-stock', date ? { date } : undefined);
}

/**
 * `/api/production-stock/prepare` — records "Today's Prepared Products". ADDS
 * to whatever the day already holds; it is never a replace. No geofence, no
 * `idempotent()` on this route server-side — a fresh `refId` is minted per
 * submission on the backend, so a genuine retry of a failed Save is expected
 * to be a new call, not a replay of the same key.
 */
export async function prepareProduction(input: PrepareProductionInput): Promise<PrepareProductionResult> {
  return apiClient.post<PrepareProductionResult>('/production-stock/prepare', input);
}

/**
 * `/api/production-stock/adjustment` — books ONE signed movement with a
 * mandatory reason. Never sets a balance; a wrong figure is answered with
 * another movement, not an edit.
 */
export async function createProductionAdjustment(input: CreateProductionAdjustmentInput): Promise<ProductionAdjustmentResult> {
  return apiClient.post<ProductionAdjustmentResult>('/production-stock/adjustment', input);
}
