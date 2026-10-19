import { apiClient } from '../client';
import type { DailySaleRecordDetail, DailySaleRecordList, FeedDailySaleRecordInput } from '../types';

export interface ListDailySaleRecordsParams {
  from?: string;
  to?: string;
  [key: string]: unknown;
}

/** `/api/daily-sale-records` — defaults to the last 30 business days ending today. */
export async function listDailySaleRecords(params?: ListDailySaleRecordsParams): Promise<DailySaleRecordList> {
  return apiClient.get<DailySaleRecordList>('/daily-sale-records', params);
}

/** `GET /api/daily-sale-records/:id` — the record, its audit history, its locks and its branch. */
export async function getDailySaleRecord(id: string): Promise<DailySaleRecordDetail> {
  return apiClient.get<DailySaleRecordDetail>(`/daily-sale-records/${id}`);
}

/** Idempotent — `ensure_daily_sale_record` upserts on (branchId, businessDate). */
export async function generateDailySaleRecord(businessDate: string): Promise<DailySaleRecordDetail> {
  return apiClient.post<DailySaleRecordDetail>('/daily-sale-records/generate', { businessDate });
}

/** Only the counted figures are writable. An omitted method leaves its stored count alone. */
export async function feedDailySaleRecord(input: FeedDailySaleRecordInput): Promise<DailySaleRecordDetail> {
  return apiClient.put<DailySaleRecordDetail>('/daily-sale-records/manual-feed', input);
}

/** `branch_manager` or `super_admin` only — confirmed in `daily-sale.routes.ts`. */
export async function verifyDailySaleRecord(id: string): Promise<DailySaleRecordDetail> {
  return apiClient.put<DailySaleRecordDetail>(`/daily-sale-records/${id}/verify`);
}
