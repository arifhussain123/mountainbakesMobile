import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { adminDataService } from '../services';
import { isApiError } from '../client';
import type {
  AdminCustomersQuery,
  AdminUser,
  DataEnginePage,
  LoginAttemptQuery,
  LoginAttemptsPage,
  RestrictionRequestType,
  SecuritySessionPage,
  SecuritySessionQuery,
  UsersDataQuery,
} from '../types';

const PAGE = 50;

export function useAdminCustomers(search: string) {
  return useQuery({
    queryKey: queryKeys.adminCustomers(search),
    queryFn: () => adminDataService.listCustomers(search || undefined),
    placeholderData: keepPreviousData,
  });
}

/** Super Admin → Customers: the Data Engine list (web /customers), 50 a page, next page on scroll. */
export function useAdminCustomersData(query: AdminCustomersQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminCustomersData(query),
    queryFn: ({ pageParam }) => adminDataService.listCustomersData({ ...query, page: pageParam, pageSize: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: queryKeys.productCategories(),
    queryFn: () => adminDataService.listCategories(),
  });
}

export function useAdminBranches() {
  return useQuery({
    queryKey: queryKeys.adminBranches(),
    queryFn: () => adminDataService.listAllBranches(),
  });
}

export function useBranchLocations() {
  return useQuery({
    queryKey: queryKeys.branchLocations(),
    queryFn: () => adminDataService.listBranchLocations(),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers(),
    queryFn: () => adminDataService.listUsers(),
  });
}

export function useLoginSessionPages(suspiciousOnly: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.loginSessions(suspiciousOnly),
    queryFn: ({ pageParam }) => adminDataService.listLoginSessions({ page: pageParam, pageSize: PAGE, suspiciousOnly }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.sessions.length, 0);
      return loaded < lastPage.total && lastPage.sessions.length > 0 ? pages.length + 1 : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

export function useBackupJobPages() {
  return useInfiniteQuery({
    queryKey: queryKeys.backupJobs(),
    queryFn: ({ pageParam }) => adminDataService.listBackupJobs({ page: pageParam, pageSize: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.jobs.length, 0);
      return loaded < lastPage.total && lastPage.jobs.length > 0 ? pages.length + 1 : undefined;
    },
  });
}

// ─── Users / Security / Database Backup / Restriction Rules ────────────────
// Page size 20 — the web tables' default, and one the Data Engine accepts.
const WEB_PAGE = 20;

/** Next page number while fewer rows than `total` are loaded. */
function nextPage<T>(rows: (p: T) => unknown[], total: (p: T) => number) {
  return (lastPage: T, pages: T[]) => {
    const loaded = pages.reduce((n, p) => n + rows(p).length, 0);
    return loaded < total(lastPage) && rows(lastPage).length > 0 ? pages.length + 1 : undefined;
  };
}

export function useUsersDataPages(query: Omit<UsersDataQuery, 'page' | 'pageSize'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.usersData(query),
    queryFn: ({ pageParam }) => adminDataService.listUsersData({ ...query, page: pageParam, pageSize: WEB_PAGE }),
    initialPageParam: 1,
    getNextPageParam: nextPage<DataEnginePage<AdminUser>>((p) => p.data, (p) => p.total),
    placeholderData: keepPreviousData,
  });
}

export function useUserActivity(enabled = true) {
  return useQuery({ queryKey: queryKeys.userActivity(), queryFn: () => adminDataService.listUserActivity(), enabled });
}

export function useSecuritySessionPages(query: Omit<SecuritySessionQuery, 'page' | 'pageSize'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.securitySessions(query),
    queryFn: ({ pageParam }) => adminDataService.listSecuritySessions({ ...query, page: pageParam, pageSize: WEB_PAGE }),
    initialPageParam: 1,
    getNextPageParam: nextPage<SecuritySessionPage>((p) => p.sessions, (p) => p.total),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useActiveSessions(enabled = true) {
  return useQuery({ queryKey: queryKeys.activeSessions(), queryFn: () => adminDataService.getActiveSessions(), enabled });
}

/** The country/city/browser filter options — slow-moving, so held for an hour. */
export function useLoginFilterOptions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.loginFilterOptions(),
    queryFn: () => adminDataService.getLoginFilterOptions(),
    staleTime: 60 * 60 * 1000,
    enabled,
  });
}

export function useSecuritySession(id: string | null) {
  return useQuery({
    queryKey: queryKeys.securitySession(id ?? ''),
    queryFn: () => adminDataService.getSecuritySession(id!),
    enabled: !!id,
  });
}

export function useLoginAttemptPages(query: Omit<LoginAttemptQuery, 'page' | 'pageSize'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.loginAttempts(query),
    queryFn: ({ pageParam }) => adminDataService.listLoginAttempts({ ...query, page: pageParam, pageSize: WEB_PAGE }),
    initialPageParam: 1,
    getNextPageParam: nextPage<LoginAttemptsPage>((p) => p.attempts, (p) => p.total),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Refetches every 10 s while a backup is running, like the web page. A 503 (not configured) is not retried. */
export function useBackupStatus() {
  return useQuery({
    queryKey: queryKeys.backupStatus(),
    queryFn: () => adminDataService.getBackupStatus(),
    refetchInterval: (q) => ((q.state.data?.running.length ?? 0) > 0 ? 10_000 : false),
    retry: (count, error) => !(isApiError(error) && error.status === 503) && count < 2,
  });
}

export function useLatestRestoreTest() {
  return useQuery({ queryKey: queryKeys.latestRestoreTest(), queryFn: () => adminDataService.getLatestRestoreTest() });
}

export function useBackupHistory() {
  return useQuery({ queryKey: queryKeys.backupHistory(), queryFn: () => adminDataService.listBackupHistory() });
}

export function useRestrictionRules() {
  return useQuery({ queryKey: queryKeys.restrictionRules(), queryFn: () => adminDataService.getRestrictionRules() });
}

export function useRestrictionRequests(type: RestrictionRequestType | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.restrictionRequests(type),
    queryFn: () => adminDataService.listRestrictionRequests(type),
    staleTime: 15_000,
    enabled,
  });
}

export function useRestrictionMonitor(enabled = true) {
  return useQuery({ queryKey: queryKeys.restrictionMonitor(), queryFn: () => adminDataService.getRestrictionMonitor(), staleTime: 15_000, enabled });
}

export function useRestrictionEvents(ruleCode: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.restrictionEvents(ruleCode),
    queryFn: () => adminDataService.listRestrictionEvents(ruleCode),
    staleTime: 15_000,
    enabled,
  });
}
