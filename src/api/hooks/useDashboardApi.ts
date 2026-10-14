import { useQuery } from '@tanstack/react-query';
import { LIVE_STALE_TIME_MS, SUMMARY_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { dashboardService } from '../services';
import type { ReportPeriod } from '../types';

export function useReportSummary(period: ReportPeriod) {
  return useQuery({
    queryKey: queryKeys.reportSummary(period),
    queryFn: () => dashboardService.getReportSummary(period),
    staleTime: SUMMARY_STALE_TIME_MS,
  });
}

export function useSalesAnalytics(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.salesAnalytics(from, to),
    queryFn: () => dashboardService.getSalesAnalytics(from, to),
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
