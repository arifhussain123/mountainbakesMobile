import { apiClient } from '../client';
import type { AdminStockDeleteInput, AdminStockSaveInput, AdminStockSaveResult } from '../types';

/**
 * `PATCH /stock/admin` — super_admin only: save ABSOLUTE figures for one or
 * many products in one branch. Not all-or-nothing (the correction RPC is
 * per-product): refused rows come back in `failed` while the rest stay saved.
 * Every row refused is a 409 with the first refusal as the error.
 */
export async function saveAdminStock(input: AdminStockSaveInput): Promise<AdminStockSaveResult> {
  return apiClient.patch<AdminStockSaveResult>('/stock/admin', input);
}

/**
 * `POST /stock/admin/delete` — super_admin only. A POST because it carries a
 * body; `mode: 'purge'` is irreversible and the caller is expected to have
 * confirmed it by name.
 */
export async function deleteAdminStock(input: AdminStockDeleteInput): Promise<{ mode: 'zero' | 'purge'; productId: string; productName: string }> {
  return apiClient.post<{ mode: 'zero' | 'purge'; productId: string; productName: string }>('/stock/admin/delete', input);
}
