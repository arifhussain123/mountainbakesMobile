import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as sectionsService from '../services/productionDashboardSectionsService';
import type { ProductionDashboardPeriod } from '../types';

/** The web dashboard's Received demand section — units and orders per bucket, by order status. */
export function useProductionReceivedDemand(period: ProductionDashboardPeriod, branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.productionDashboardSection('received-demand', period, branchId),
    queryFn: () => sectionsService.getReceivedDemand(period, branchId),
    placeholderData: keepPreviousData,
  });
}

/** The web dashboard's Repaired stock section — accepted returns marked Repaired. */
export function useProductionRepairedStock(period: ProductionDashboardPeriod, branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.productionDashboardSection('repaired-stock', period, branchId),
    queryFn: () => sectionsService.getRepairedStock(period, branchId),
    placeholderData: keepPreviousData,
  });
}

/** The web dashboard's Return stock section — accepted returns, by reason and branch. */
export function useProductionReturnStock(period: ProductionDashboardPeriod, branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.productionDashboardSection('return-stock', period, branchId),
    queryFn: () => sectionsService.getReturnStock(period, branchId),
    placeholderData: keepPreviousData,
  });
}
