import type {
  BranchProductionOrder,
  BranchProductionOrderStatus,
} from '@/shared/types/production-order.types';
import type { StockRow } from '@/shared/types/stock.types';
import { api } from './client';

/**
 * Production endpoints.
 *
 * Every route here is restricted to `super_admin` and `production_user`
 * server-side. The mobile Production role is the latter.
 */

export interface ProductionOverviewCards {
  waitingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  changedOrders: number;
  returnedProducts: number;
  todayProduction: number;
  weeklyProduction: number;
  monthlyProduction: number;
  totalBranches: number;
  totalProducts: number;
  totalDemandQty: number;
  availableProductionStock: number;
}

export interface ProductionOverview {
  cards: ProductionOverviewCards;
  demandByDay: Array<{ date: string; qty: number; orders: number }>;
  demandByMonth: Array<{ month: string; qty: number }>;
  branchDemand: Array<{ branchId: string; branchName: string; qty: number }>;
  topProducts: Array<{ productId: string; productName: string; qty: number }>;
}

export function getProductionOverview(): Promise<ProductionOverview> {
  return api.get<ProductionOverview>('/api/production/overview');
}

export async function getProductionStock(date?: string): Promise<{ rows: StockRow[]; date: string }> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  return api.get<{ rows: StockRow[]; date: string }>('/api/production-stock', { params });
}

export interface ProductionOrderFilters {
  status?: BranchProductionOrderStatus;
  branchId?: string;
  date?: string;
}

export async function getProductionOrders(
  filters: ProductionOrderFilters = {},
): Promise<BranchProductionOrder[]> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.date) params.date = filters.date;

  const data = await api.get<{ orders: BranchProductionOrder[]; total: number }>(
    '/api/production-orders',
    { params },
  );
  return data.orders ?? [];
}

export interface ReviewInput {
  /**
   * `awaiting_verification` is Production's approval. It is NOT the end of the
   * workflow: the branch must still verify receipt, and stock moves at THAT
   * step (migration 20260810000058), not here.
   *
   * Several comments in the server tree still say review transfers stock
   * immediately — they predate that migration and are wrong.
   */
  status: 'awaiting_verification' | 'rejected';
  /** Per-item overrides. Omitted items keep their requested quantity. */
  approvedItems?: Array<{ productId: string; approvedQty: number }>;
  approvedPackingItems?: Array<{ packingMaterialId: string; approvedQty: number }>;
  reason?: string;
}

/**
 * Production's review of a branch demand.
 *
 * Deliberately NOT offline-queueable. This is a decision about a server record
 * that other people are acting on, not a transaction originating on this device:
 * the demand may be cancelled or corrected between going offline and syncing,
 * and replaying a stale approval would authorise quantities nobody agreed to.
 */
export function reviewProductionOrder(orderId: string, input: ReviewInput): Promise<unknown> {
  return api.put(`/api/production-orders/${orderId}/review`, input);
}

/** Mark a demand as printed, so Production can see what has been issued. */
export function markPrinted(orderId: string): Promise<unknown> {
  return api.put(`/api/production-orders/${orderId}/printed`, {});
}

export interface PreviousBalance {
  amountToCollect: number;
  deliveredValue?: number;
  returnsValue?: number;
  companySharePct?: number;
}

/**
 * The amount to collect against the branch's PREVIOUS delivered order.
 *
 * Bills the immediately preceding delivered order, not "yesterday" and not a
 * running total — a branch can receive several deliveries in a day. It does not
 * track whether that previous order was actually settled, so a reprint shows the
 * same figure every time.
 */
export function getPreviousBalance(orderId: string): Promise<PreviousBalance> {
  return api.get<PreviousBalance>(`/api/production-orders/${orderId}/previous-balance`);
}
