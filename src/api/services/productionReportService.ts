import { apiClient } from '../client';
import type { GetProductionReportParams, ProductionReportSummary } from '../types';

/**
 * `GET /api/production-reports/summary` — the mockup's "Production Reports"
 * screen (13). Production's own reporting surface, deliberately separate from
 * `/api/reports` (sales/financials), which refuses `production_user`.
 *
 * PDF/Excel/CSV export (`GET /production-reports/export`) is deferred, same
 * as Finance Reports (screen 19) — this app has no file-download/share
 * library yet, so this ships as an on-screen viewer first.
 */
export async function getProductionReportSummary(params: GetProductionReportParams): Promise<ProductionReportSummary> {
  return apiClient.get<ProductionReportSummary>('/production-reports/summary', { ...params });
}
