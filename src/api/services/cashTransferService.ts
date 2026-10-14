import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import type { CashTransferListResponse, CreateCashTransferInput } from '../types';

export interface ListCashTransfersParams {
  status?: string;
  days?: number;
  [key: string]: unknown;
}

/** `/api/cash-transfers` — this branch's deposits, last 90 days default. */
export async function listCashTransfers(params?: ListCashTransfersParams): Promise<CashTransferListResponse> {
  return apiClient.get<CashTransferListResponse>('/cash-transfers', params);
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
