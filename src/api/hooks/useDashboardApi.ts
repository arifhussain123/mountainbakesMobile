import { useQuery } from '@tanstack/react-query';
import { LIVE_STALE_TIME_MS, SUMMARY_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { dashboardService } from '../services';
import type { ReportPeriod } from '../types';

export function useReportSummary(period: ReportPeriod, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.reportSummary(period, from, to),
    queryFn: () => dashboardService.getReportSummary(period, from, to),
    staleTime: SUMMARY_STALE_TIME_MS,
  });
}

export function useSalesAnalytics(from: string, to: string, compare = false, topLimit = 5) {
  return useQuery({
    queryKey: queryKeys.salesAnalytics(from, to, compare, topLimit),
    queryFn: () => dashboardService.getSalesAnalytics(from, to, topLimit, compare),
    staleTime: LIVE_STALE_TIME_MS,
  });
}

export function useStockHistoryDay(date: string) {
  return useQuery({
    queryKey: queryKeys.stockHistoryDay(date),
    queryFn: () => dashboardService.getStockHistoryDay(date),
    staleTime: LIVE_STALE_TIME_MS,
  });
}

export function useStockHistorySeries(days: number) {
  return useQuery({
    queryKey: queryKeys.stockHistorySeries(days),
    queryFn: () => dashboardService.getStockHistorySeries(days),
    staleTime: LIVE_STALE_TIME_MS,
  });
}

/** Branch Stock History for a branch the caller names (super_admin) — the per-day series of one shop. */
export function useBranchStockHistorySeries(branchId: string | null, days: number) {
  return useQuery({
    queryKey: queryKeys.branchStockHistorySeries(branchId ?? '', days),
    queryFn: () => dashboardService.getStockHistorySeries(days, branchId!),
    enabled: !!branchId,
    staleTime: LIVE_STALE_TIME_MS,
  });
}
