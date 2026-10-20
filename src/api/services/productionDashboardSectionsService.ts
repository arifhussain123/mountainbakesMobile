import { apiClient } from '../client';
import type {
  ProductionDashboardPeriod,
  ProductionReceivedDemandSection,
  ProductionRepairedStockSection,
  ProductionReturnStockSection,
} from '../types';

/**
 * The web Production Dashboard's three period sections that the phone did not
 * read yet — `GET /api/production/dashboard/{received-demand,repaired-stock,
 * return-stock}?period=&branchId=` (`production.routes.ts`, `super_admin` and
 * `production_user`). Summed in SQL server-side; the phone only draws them.
 * Branch-summary and current-stock live in `productionOverviewService`.
 */
type SectionName = 'received-demand' | 'repaired-stock' | 'return-stock';

function getSection<T>(section: SectionName, period: ProductionDashboardPeriod, branchId?: string | null): Promise<T> {
  return apiClient.get<T>(`/production/dashboard/${section}`, { period, ...(branchId ? { branchId } : {}) });
}

export function getReceivedDemand(period: ProductionDashboardPeriod, branchId?: string | null): Promise<ProductionReceivedDemandSection> {
  return getSection('received-demand', period, branchId);
}

export function getRepairedStock(period: ProductionDashboardPeriod, branchId?: string | null): Promise<ProductionRepairedStockSection> {
  return getSection('repaired-stock', period, branchId);
}

export function getReturnStock(period: ProductionDashboardPeriod, branchId?: string | null): Promise<ProductionReturnStockSection> {
  return getSection('return-stock', period, branchId);
}
