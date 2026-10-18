import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import type {
  CashTransfer,
  CashTransferListResponse,
  CashTransferSortKey,
  CashTransferStatus,
  CreateCashTransferInput,
  MonthlyCashTransferSummary,
} from '../types';

/** The server's own max page size (`GET /api/cash-transfers`'s `limit` is clamped 1-200). */
export const CASH_TRANSFERS_MAX_PAGE_SIZE = 200;

export interface ListCashTransfersParams {
  status?: CashTransferStatus;
  paymentMethod?: 'cash' | 'easypaisa' | 'bank_account';
  from?: string;
  to?: string;
  search?: string;
  sortBy?: CashTransferSortKey;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  /** Branch-role requests ignore this (the server pins branchId from the JWT) — only meaningful for an admin caller. */
  branchId?: string;
  [key: string]: unknown;
}

/** `/api/cash-transfers` — this branch's deposits, last 90 days default. */
export async function listCashTransfers(params?: ListCashTransfersParams): Promise<CashTransferListResponse> {
  return apiClient.get<CashTransferListResponse>('/cash-transfers', params);
}

/** `/api/cash-transfers/:id` — a single transfer by id (e.g. deep-linking from a notification). */
export async function getCashTransfer(id: string): Promise<CashTransfer> {
  return apiClient.get<CashTransfer>(`/cash-transfers/${id}`);
}

/** No edit/withdraw exists for this resource — a wrong deposit is rejected and raised again. */
export async function createCashTransfer(
  input: Omit<CreateCashTransferInput, 'businessDate'>,
  idempotencyKey: string = generateIdempotencyKey('cash_transfer'),
): Promise<void> {
  const body: CreateCashTransferInput = { ...input, businessDate: getBusinessDate() };
  const options: MutationOptions = { idempotencyKey };
  await apiClient.post('/cash-transfers', body, options);
}

/**
 * `GET /cash-transfers/monthly-summary` — this branch's transfers, business
 * month to date, summed on the server. The branch comes from the token, and no
 * list filter applies: it is the month, whatever the list below shows.
 */
export async function getMonthlyCashTransferSummary(): Promise<MonthlyCashTransferSummary> {
  return apiClient.get<MonthlyCashTransferSummary>('/cash-transfers/monthly-summary');
}
