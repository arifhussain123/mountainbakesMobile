import type { PackingUsageRow, SalesAnalyticsPaymentMethod, SalesAnalyticsTopProduct } from '@/api';

/**
 * `totalOrders - totalCancelled` (the server's own denominator) still
 * includes staff/unpaid orders, which contribute Rs. 0 to `totalRevenue` —
 * ported exactly from `backend/src/routes/reports.routes.ts`'s
 * `averageOrderValue: totalOrders ? totalRevenue / (totalOrders -
 * totalCancelled || 1) : 0`. This slightly understates the true average by
 * design; not a bug to "fix" on mobile.
 */
export function computeAvgOrderValue(totalRevenue: number, totalOrders: number, totalCancelled: number): number {
  if (!totalOrders) return 0;
  const denominator = totalOrders - totalCancelled || 1;
  return totalRevenue / denominator;
}

/**
 * The server literally calls this "Profit" (`totalProfit`) in both the field
 * name and the web's on-screen label, even though it excludes company-share
 * and product cost — not real profit. Mobile labels it "Net (Sales −
 * Expenses)" instead, matching the Dashboard's own "Net Amount" naming.
 */
export function computeNet(totalRevenue: number, totalExpenses: number): number {
  return totalRevenue - totalExpenses;
}

export function sumPaymentMethodRevenue(methods: SalesAnalyticsPaymentMethod[]): number {
  return methods.reduce((sum, m) => sum + m.total, 0);
}

export function sumPaymentMethodCount(methods: SalesAnalyticsPaymentMethod[]): number {
  return methods.reduce((sum, m) => sum + m.count, 0);
}

export type TopProductSort = 'revenue' | 'qty';

export function sortTopProducts(products: SalesAnalyticsTopProduct[], sort: TopProductSort): SalesAnalyticsTopProduct[] {
  const sorted = [...products];
  sorted.sort((a, b) => (sort === 'revenue' ? b.sales - a.sales : b.qty - a.qty));
  return sorted;
}

/**
 * Packing status, derived honestly from what this report's aggregation
 * actually tracks. The server only ever sets `approvedQty`/`deliveredQty`
 * together, from the same value, when a production order's status is exactly
 * `'approved'` (`backend/src/routes/reports.routes.ts`) — delivery is never
 * tracked separately from approval in this endpoint. So a real fourth state
 * ("approved but not yet delivered") can't be told apart from "delivered"
 * with the data this endpoint provides — this derivation does not invent
 * one. `approvedQty === 0` also can't distinguish "rejected" from "still
 * pending/awaiting verification" (confirmed: all read as 0 here), so it is
 * labeled "Not approved", not "Rejected".
 */
export type PackingStatus = 'delivered' | 'partlyApproved' | 'notApproved';

export const PACKING_STATUS_LABEL: Record<PackingStatus, string> = {
  delivered: 'Delivered',
  partlyApproved: 'Partly delivered',
  notApproved: 'Not approved',
};

export function derivePackingStatus(row: Pick<PackingUsageRow, 'requestedQty' | 'approvedQty'>): PackingStatus {
  if (row.approvedQty <= 0) return 'notApproved';
  if (row.approvedQty >= row.requestedQty) return 'delivered';
  return 'partlyApproved';
}

/** Highlight a request where what was approved/delivered falls short of what was asked for. */
export function isPackingShortfall(row: Pick<PackingUsageRow, 'requestedQty' | 'approvedQty'>): boolean {
  return row.approvedQty < row.requestedQty;
}

export interface TrendDaySummary {
  bestDay: { date: string; sales: number } | null;
  slowestDay: { date: string; sales: number } | null;
  averageDailyRevenue: number;
}

/** Best/slowest/average for the Sales Trend tab's footer — zero-sales days are real days, not excluded, since "slowest" must be able to show a Rs. 0 day. */
export function summarizeTrend(daily: { date: string; sales: number }[]): TrendDaySummary {
  if (daily.length === 0) return { bestDay: null, slowestDay: null, averageDailyRevenue: 0 };
  let best = daily[0];
  let slowest = daily[0];
  let total = 0;
  for (const point of daily) {
    if (point.sales > best.sales) best = point;
    if (point.sales < slowest.sales) slowest = point;
    total += point.sales;
  }
  return { bestDay: best, slowestDay: slowest, averageDailyRevenue: total / daily.length };
}
