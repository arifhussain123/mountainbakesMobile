import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { adminCatalogService } from '../services';
import type { AdminProductsQuery } from '../types';

/** Super Admin → Products: the Data Engine list, 50 a page, next page on scroll. */
export function useAdminProductPages(query: AdminProductsQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminProductPages(query),
    queryFn: ({ pageParam }) => adminCatalogService.listAdminProducts({ ...query, page: pageParam, pageSize: 50 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

/** Every packing material, disabled ones included (the admin catalogue). */
export function useAllPackingMaterials() {
  return useQuery({
    queryKey: queryKeys.allPackingMaterials(),
    queryFn: () => adminCatalogService.listAllPackingMaterials(),
  });
}

/** Active branches with the full admin row (manager, share, budgets). */
export function useActiveAdminBranches() {
  return useQuery({
    queryKey: queryKeys.activeAdminBranches(),
    queryFn: () => adminCatalogService.listActiveAdminBranches(),
  });
}
