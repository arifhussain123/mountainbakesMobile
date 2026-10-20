import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SUMMARY_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { dashboardService, reportService } from '../services';
import type { PackingUsageQuery, ReportPeriod } from '../types';

export function usePackingUsage(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.packingUsage(from, to),
    queryFn: () => reportService.getPackingUsage(from, to),
  });
}

/**
 * Super Admin Reports: every figure on the web /reports page from ONE call —
 * `/reports/summary` without `fields=basic`, so branchData, topProducts and
 * paymentMethodBreakdown come back too. All branches (super_admin is unscoped).
 */
export function useAdminReportSummary(period: Exclude<ReportPeriod, 'custom'>) {
  return useQuery({
    queryKey: queryKeys.adminReportSummary(period),
    queryFn: () => dashboardService.getReportSummary(period, undefined, undefined, { fields: 'full' }),
    staleTime: SUMMARY_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

/** Packing Materials report, server-paged (50 a page, next page on scroll); totals are per range, not per page. */
export function usePackingUsagePages(query: PackingUsageQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.packingUsagePages(query),
    queryFn: ({ pageParam }) => reportService.getPackingUsagePage({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}
