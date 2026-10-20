import { apiClient } from '../client';
import type {
  BranchSalesGroup,
  DataEngineAggregateResponse,
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
export async function getReportSummary(
  period: ReportPeriod,
  from?: string,
  to?: string,
  /** Admin Dashboard only: `fields=full` (pending count, expenses, profit) and a super_admin branch filter. */
  opts?: { fields?: 'basic' | 'full'; branchId?: string | null },
): Promise<ReportSummary> {
  return apiClient.get<ReportSummary>('/reports/summary', {
    period,
    from,
    to,
    fields: opts?.fields ?? 'basic',
    ...(opts?.branchId ? { branchId: opts.branchId } : {}),
  });
}

/** `branchId` is honoured for super_admin only; a branch account is pinned to its own branch by the server. */
export async function getSalesAnalytics(from: string, to: string, topLimit = 5, compare = false, branchId?: string | null): Promise<SalesAnalytics> {
  return apiClient.get<SalesAnalytics>('/sales-analytics', { from, to, topLimit, ...(compare ? { compare: true } : {}), ...(branchId ? { branchId } : {}) });
}

/**
 * Paid sales per branch over business dates `from`–`to`, summed in Postgres —
 * the web's Live Sales board (`useBranchSales`): `sum:grandTotal` and `count`
 * grouped by branch over non-cancelled, non-staff orders. `between` takes a
 * comma list, so no repeated-key serialisation is needed.
 */
export async function getBranchSales(from: string, to: string): Promise<BranchSalesGroup[]> {
  const res = await apiClient.get<DataEngineAggregateResponse>('/data/orders/aggregate', {
    metrics: 'sum:grandTotal,count',
    groupBy: 'branchId,branchName',
    'businessDate.between': `${from},${to}`,
    'status.neq': 'cancelled',
    'paymentMethod.neq': 'staff',
  });
  return (res.rows ?? []).map((r) => ({
    branchId: String(r.group?.branchId ?? ''),
    branchName: String(r.group?.branchName ?? ''),
    sales: Number(r.values['sum:grandTotal'] ?? 0) || 0,
    orders: Number(r.values.count ?? 0) || 0,
  }));
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

/** `branchId` is honoured for super_admin only — a branch role is pinned to its own branch server-side. */
export async function getStockHistorySeries(days: number, branchId?: string): Promise<StockHistorySeriesResponse> {
  return apiClient.get<StockHistorySeriesResponse>('/stock/history', branchId ? { days, branchId } : { days });
}
