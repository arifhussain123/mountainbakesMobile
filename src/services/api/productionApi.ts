import type {
  BranchProductionOrder,
  BranchProductionOrderStatus,
} from '@/shared/types/production-order.types';
import type { StockRow } from '@/shared/types/stock.types';
import type { CancelProductionOrderInput } from '@/shared/schemas/production-order.schemas';
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

/**
 * Live counts for the preparation station.
 *
 * These are **customer orders** (`orders.status`), not branch demands. The two
 * are separate resources and separate pipelines, and the production role has a
 * tab for each — see `roleConfig.ts`. Conflating them is easy and expensive: a
 * demand that is `approved` and an order that is `ready` are different objects
 * at different stages of different journeys.
 */
export interface ProductionQueueStats {
  /** Orders at `pending` — accepted, not started. */
  waitingCount: number;
  /** Orders at `preparing` — on the bench now. */
  preparingCount: number;
  /** Orders at `ready` — made, waiting to go out. */
  readyCount: number;
  totalActive: number;
}

/**
 * `GET /api/production/queue`.
 *
 * The response also carries the full queue grouped by branch; the dashboard
 * wants only `stats`, so the rest is typed loosely and ignored here rather than
 * mirrored into a shape nothing reads.
 */
export async function getProductionQueueStats(): Promise<ProductionQueueStats> {
  const data = await api.get<{ stats: ProductionQueueStats }>('/api/production/queue');
  return data.stats;
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
/**
 * The branch withdraws a demand it raised.
 *
 * A **soft delete**, and the reason is mandatory (migration 73): Production is
 * planning against these demands, so one vanishing off the summary without
 * explanation is worse than one that stays visible as `cancelled` with a note.
 *
 * Only a `pending` demand can be withdrawn — once Production has reviewed it and
 * sent it out, units are in motion and the way back is a return, not a deletion.
 * The server enforces that; this only decides what is offered.
 */
export function cancelProductionOrder(
  orderId: string,
  input: CancelProductionOrderInput,
): Promise<unknown> {
  return api.put(`/api/production-orders/${orderId}/cancel`, input);
}

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
/** One row per active product, carrying its balance in every active branch. */
export interface BranchStockMatrix {
  branches: { branchId: string; branchName: string }[];
  rows: { productId: string; productName: string; byBranch: Record<string, number> }[];
}

/**
 * `GET /api/production/branch-stock` — the whole branch × product balance matrix.
 *
 * This is the **only single request** that can answer "how many products are low
 * across the company". `GET /api/stock` is one branch at a time (it answers 400
 * without a `branchId` for a role that has no branch of its own), so the
 * alternative is one request per branch — a fan-out that grows with the
 * business, to fill one tile.
 *
 * It is more data than a tile needs, which is why the dashboard gives it the
 * longer `STALE_TIME_MS` window rather than the live one: balances move on every
 * sale, but a *count of products under five units* does not meaningfully change
 * inside a minute.
 */
export function getBranchStock(): Promise<BranchStockMatrix> {
  return api.get<BranchStockMatrix>('/api/production/branch-stock');
}

export function getPreviousBalance(orderId: string): Promise<PreviousBalance> {
  return api.get<PreviousBalance>(`/api/production-orders/${orderId}/previous-balance`);
}
