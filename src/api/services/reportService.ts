import { apiClient } from '../client';
import type { PackingUsageQuery, PackingUsageResponse, ReportPeriod } from '../types';

/** `/api/reports/packing-usage` — branch-scoped server-side; defaults to the current month. */
export async function getPackingUsage(from: string, to: string): Promise<PackingUsageResponse> {
  return apiClient.get<PackingUsageResponse>('/reports/packing-usage', { from, to, pageSize: 500 });
}

/**
 * One server page of the same report with the web's filters (branch, material,
 * sort). `totals` are summed over the whole filtered range before the slice.
 */
export async function getPackingUsagePage(query: PackingUsageQuery & { page: number }): Promise<PackingUsageResponse> {
  const { from, to, branchId, packingMaterialId, page, pageSize = 50, sortBy, sortDir } = query;
  return apiClient.get<PackingUsageResponse>('/reports/packing-usage', {
    from,
    to,
    page,
    pageSize,
    ...(branchId ? { branchId } : {}),
    ...(packingMaterialId ? { packingMaterialId } : {}),
    ...(sortBy ? { sortBy, sortDir: sortDir ?? 'desc' } : {}),
  });
}

/**
 * `GET /api/reports/export` — a DIFFERENT endpoint from `/sales-analytics/export`
 * (dashboard/sales use that one): this one re-queries raw per-order rows for the
 * period and builds a real server-generated file (pdfkit/exceljs/CSV). Only CSV
 * is usable here — this app has no file-system/share-sheet module for saving a
 * binary PDF/XLSX, so PDF/Excel aren't offered on mobile (same constraint as
 * every other export in this app).
 */
export async function getReportExportCsv(period: ReportPeriod, from?: string, to?: string): Promise<string> {
  return apiClient.get<string>('/reports/export', { type: 'csv', period, from, to });
}
