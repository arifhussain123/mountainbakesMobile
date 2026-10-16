import { apiClient } from '../client';
import type { BranchClosingSummary } from '../types';

/** `/api/branch-closing?date=` — one business date's reconciliation, defaults to today. */
export async function getBranchClosing(date?: string): Promise<BranchClosingSummary> {
  return apiClient.get<BranchClosingSummary>('/branch-closing', date ? { date } : undefined);
}

/**
 * `GET /api/branch-closing/export?from&to&type=csv` — the real, server-built
 * dated workbook (Date/Sales/Discounts/Expenses/Net/Cash Sales/Cash
 * Expenses/Cash in Hand/Orders/Cancelled/Stock on Hand + TOTAL row), same
 * shape the web's Excel export produces. `type=csv` rather than `excel`: CSV
 * is plain text, so it can go straight into the system share sheet the same
 * way `exportSalesCsv` already does — there's no file-system/binary-share
 * native module in this app to hand an .xlsx to instead.
 */
export async function exportBranchClosingCsv(from: string, to: string = from): Promise<string> {
  return apiClient.get<string>('/branch-closing/export', { from, to, type: 'csv' });
}
