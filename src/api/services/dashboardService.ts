import { apiClient } from '../client';
import type {
  ReportPeriod,
  ReportSummary,
  SalesAnalytics,
  StockHistoryDayResponse,
  StockHistorySeriesResponse,
} from '../types';

/** `fields=basic` is what `docs/branch-dashboard-v2-api-map.md` says the dashboard uses. */
export async function getReportSummary(period: ReportPeriod): Promise<ReportSummary> {
  return apiClient.get<ReportSummary>('/reports/summary', { period, fields: 'basic' });
}

export async function getSalesAnalytics(from: string, to: string, topLimit = 5): Promise<SalesAnalytics> {
  return apiClient.get<SalesAnalytics>('/sales-analytics', { from, to, topLimit });
}

export async function getStockHistoryDay(date: string): Promise<StockHistoryDayResponse> {
  return apiClient.get<StockHistoryDayResponse>('/stock/history', { date });
}

export async function getStockHistorySeries(days: number): Promise<StockHistorySeriesResponse> {
  return apiClient.get<StockHistorySeriesResponse>('/stock/history', { days });
}
