import { apiClient } from '../client';
import type {
  ReportPeriod,
  ReportSummary,
  SalesAnalytics,
  StockHistoryDayResponse,
  StockHistorySeriesResponse,
} from '../types';

/**
 * `fields=basic` is what `docs/branch-dashboard-v2-api-map.md` says the dashboard uses.
 * `from`/`to` are only honoured by the server for `period=custom` (any period it
 * doesn't recognise falls through to the caller-supplied range) — passed through
 * unconditionally here since they're `undefined` for every other period and
 * `apiClient.get` drops undefined params.
 */
export async function getReportSummary(period: ReportPeriod, from?: string, to?: string): Promise<ReportSummary> {
  return apiClient.get<ReportSummary>('/reports/summary', { period, from, to, fields: 'basic' });
}

export async function getSalesAnalytics(from: string, to: string, topLimit = 5, compare = false): Promise<SalesAnalytics> {
  return apiClient.get<SalesAnalytics>('/sales-analytics', { from, to, topLimit, ...(compare ? { compare: true } : {}) });
}

/**
 * The same CSV the web client's Export button generates (`/api/sales-analytics/export`),
 * shared as text rather than a downloaded binary — this app has no file-system/
 * share-sheet native module installed yet for a PDF/Excel attachment.
 */
export async function getSalesAnalyticsExportCsv(from: string, to: string): Promise<string> {
  return apiClient.get<string>('/sales-analytics/export', { from, to, type: 'csv' });
}

export async function getStockHistoryDay(date: string): Promise<StockHistoryDayResponse> {
  return apiClient.get<StockHistoryDayResponse>('/stock/history', { date });
}

export async function getStockHistorySeries(days: number): Promise<StockHistorySeriesResponse> {
  return apiClient.get<StockHistorySeriesResponse>('/stock/history', { days });
}
