import { apiClient } from '../client';
import type {
  AmendDailySaleRecordInput,
  DailySaleRecordDetail,
  DailySaleRecordList,
  FeedDailySaleRecordInput,
  PaymentMethodLock,
  SetPaymentMethodLockInput,
} from '../types';

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

/**
 * Idempotent — `ensure_daily_sale_record` upserts on (branchId, businessDate).
 * `branchId` is super admin only; a branch role's comes off its JWT.
 */
export async function generateDailySaleRecord(businessDate: string, branchId?: string): Promise<DailySaleRecordDetail> {
  return apiClient.post<DailySaleRecordDetail>('/daily-sale-records/generate', { businessDate, ...(branchId ? { branchId } : {}) });
}

/** Only the counted figures are writable. An omitted method leaves its stored count alone. */
export async function feedDailySaleRecord(input: FeedDailySaleRecordInput): Promise<DailySaleRecordDetail> {
  return apiClient.put<DailySaleRecordDetail>('/daily-sale-records/manual-feed', input);
}

/** `PUT /:id/lock` — super admin closes a verified (or amended) record. */
export async function lockDailySaleRecord(id: string): Promise<DailySaleRecordDetail> {
  return apiClient.put<DailySaleRecordDetail>(`/daily-sale-records/${id}/lock`, {});
}

/** `PUT /:id/unlock` — super admin; back to Pending Verification, sign-off cleared. Reason required (3+ chars). */
export async function unlockDailySaleRecord(id: string, reason: string): Promise<DailySaleRecordDetail> {
  return apiClient.put<DailySaleRecordDetail>(`/daily-sale-records/${id}/unlock`, { reason });
}

/** `PUT /:id/amend` — super admin corrects a counted figure; the original stays in the history. */
export async function amendDailySaleRecord(id: string, input: AmendDailySaleRecordInput): Promise<DailySaleRecordDetail> {
  return apiClient.put<DailySaleRecordDetail>(`/daily-sale-records/${id}/amend`, input);
}

/** `GET /locks?branchId=` — one branch's per-payment-method manual-entry locks. */
export async function getDailySaleLocks(branchId: string): Promise<{ locks: PaymentMethodLock[] }> {
  return apiClient.get<{ locks: PaymentMethodLock[] }>('/daily-sale-records/locks', { branchId });
}

/** `PUT /locks` — super admin sets one method's lock for one branch. Saves immediately. */
export async function setPaymentMethodLock(input: SetPaymentMethodLockInput): Promise<{ locks: PaymentMethodLock[] }> {
  return apiClient.put<{ locks: PaymentMethodLock[] }>('/daily-sale-records/locks', input);
}
