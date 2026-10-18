import { apiClient } from '../client';
import type {
  ProductionBranchStockResponse,
  ProductionBranchSummarySection,
  ProductionCurrentStockSection,
  ProductionDashboardPeriod,
  ProductionOverview,
} from '../types';

/**
 * `/api/production` — NOT the same resource as `/api/production-orders` or
 * `/api/production-stock`. Two routes this app uses:
 *
 *   GET /overview      — the Production Dashboard (screen 01), SQL-aggregated
 *                         server-side (migrations 112/140/141) rather than
 *                         reduced from raw order rows on the client.
 *   GET /branch-stock  — the Product × Branch balance matrix (screen 09,
 *                         "Branch Stock"). `production_user`/`super_admin`
 *                         only — a DIFFERENT, accessible route from the
 *                         `super_admin`-only `GET /stock/history/branches` in
 *                         `stock.routes.ts`.
 */
export async function getProductionOverview(
  period: ProductionDashboardPeriod,
  branchId?: string | null,
): Promise<ProductionOverview> {
  return apiClient.get<ProductionOverview>('/production/overview', {
    period,
    ...(branchId ? { branchId } : {}),
  });
}

export async function getProductionBranchStock(): Promise<ProductionBranchStockResponse> {
  return apiClient.get<ProductionBranchStockResponse>('/production/branch-stock');
}

/**
 * `GET /production/dashboard/branch-summary` — the web dashboard's Branch-wise
 * section: units demanded, delivered and returned per active branch. Every
 * branch by definition, so it never takes the branch filter (as on the web).
 */
export async function getProductionBranchSummary(period: ProductionDashboardPeriod): Promise<ProductionBranchSummarySection> {
  return apiClient.get<ProductionBranchSummarySection>('/production/dashboard/branch-summary', { period });
}

/** `GET /production/dashboard/current-stock` — stock right now; takes the branch filter, never a period. */
export async function getProductionCurrentStock(branchId?: string | null): Promise<ProductionCurrentStockSection> {
  return apiClient.get<ProductionCurrentStockSection>('/production/dashboard/current-stock', branchId ? { branchId } : undefined);
}
