import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { productionOverviewService, productionReportService } from '../services';
import type { GetProductionReportParams, ProductionDashboardPeriod } from '../types';

/** mountainbakesProduction.html screen 01 — Production Dashboard. */
export function useProductionOverview(period: ProductionDashboardPeriod, branchId?: string | null) {
  return useQuery({
    queryKey: queryKeys.productionOverview(period, branchId),
    queryFn: () => productionOverviewService.getProductionOverview(period, branchId),
  });
}

/** mountainbakesProduction.html screen 09 — Branch Stock (Product × Branch matrix). */
export function useProductionBranchStock() {
  return useQuery({
    queryKey: queryKeys.productionBranchStock(),
    queryFn: () => productionOverviewService.getProductionBranchStock(),
  });
}

/** mountainbakesProduction.html screen 13 — Production Reports. */
export function useProductionReportSummary(params: GetProductionReportParams) {
  return useQuery({
    queryKey: queryKeys.productionReportSummary(params),
    queryFn: () => productionReportService.getProductionReportSummary(params),
  });
}
