import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { adminDataService } from '../services';

const PAGE = 50;

export function useAdminCustomers(search: string) {
  return useQuery({
    queryKey: queryKeys.adminCustomers(search),
    queryFn: () => adminDataService.listCustomers(search || undefined),
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
