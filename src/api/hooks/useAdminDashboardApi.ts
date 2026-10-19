import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LIVE_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { adminDataService, dashboardService } from '../services';
import type { LoginHistoryQuery } from '../types';

/**
 * The Super Admin dashboard's own reads — the same requests the web Admin
 * Dashboard makes (`AdminDashboard.tsx`), none of them summed on the phone.
 */

/** Today's business day, full fields (sales, shop expenses, profit, pending), optionally one branch. */
export function useAdminTodaySummary(branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.adminTodaySummary(branchId),
    queryFn: () => dashboardService.getReportSummary('daily', undefined, undefined, { fields: 'full', branchId }),
    placeholderData: keepPreviousData,
    staleTime: LIVE_STALE_TIME_MS,
  });
}

/** `/sales-analytics` for the dashboard's month window and branch. Keeps the last figures while a new filter loads. */
export function useAdminSalesAnalytics(query: { from: string; to: string; topLimit: number; branchId: string | null }) {
  return useQuery({
    queryKey: queryKeys.adminSalesAnalytics(query),
    queryFn: () => dashboardService.getSalesAnalytics(query.from, query.to, query.topLimit, false, query.branchId),
    placeholderData: keepPreviousData,
    staleTime: LIVE_STALE_TIME_MS,
  });
}

/** Live Sales — All Branches. No placeholder: a new period must not show the last one's figures under its label. */
export function useBranchSales(range: { from: string; to: string }) {
  return useQuery({
    queryKey: queryKeys.branchSales(range.from, range.to),
    queryFn: () => dashboardService.getBranchSales(range.from, range.to),
    staleTime: LIVE_STALE_TIME_MS,
  });
}

/** One page of Login History. `enabled` is the card being open — collapsed, it makes no request. */
export function useLoginHistoryPage(query: LoginHistoryQuery, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.loginHistoryPage(query),
    queryFn: () => adminDataService.listLoginHistory(query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: LIVE_STALE_TIME_MS,
  });
}
