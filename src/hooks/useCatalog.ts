import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getBranches,
  getCategories,
  getProducts,
  getSettings,
  getStock,
  type ProductFilters,
  type StockResponse,
} from '@/services/api/catalogApi';
import { qk } from '@/services/query/queryKeys';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import type { Branch } from '@/shared/types/branch.types';
import type { Category, Product } from '@/shared/types/product.types';
import type { AppSettings } from '@/shared/types/settings.types';
import { isBranchRole } from '@/navigation/roleNavigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Server-state hooks for the read-only catalogue.
 *
 * Cache lifetimes are chosen per resource rather than globally: the catalogue
 * and branch list barely move, while stock changes with every sale and is
 * therefore treated as live data.
 */

/** Catalogue data is stable; the default 60s staleTime applies. */
export function useProducts(filters: ProductFilters = {}): UseQueryResult<Product[]> {
  return useQuery({
    queryKey: qk.products.list(filters),
    queryFn: () => getProducts(filters),
    // Keeps the previous list on screen while a new search resolves, instead of
    // flashing a skeleton on every keystroke.
    placeholderData: previous => previous,
  });
}

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: qk.categories.all(),
    queryFn: getCategories,
    // Categories change rarely and the server caches them too.
    staleTime: 10 * 60 * 1000,
  });
}

export function useBranches(): UseQueryResult<Branch[]> {
  return useQuery({
    queryKey: qk.branches.all(),
    queryFn: getBranches,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSettings(): UseQueryResult<AppSettings> {
  return useQuery({
    queryKey: qk.settings(),
    queryFn: getSettings,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Stock for the caller's branch context.
 *
 * A branch role is scoped server-side to its own branch and must not send a
 * branchId. Admin and production roles have no implicit branch, so the query
 * stays disabled until one is chosen — otherwise the request 400s with
 * "Branch context required" and the screen shows an error the user cannot act on.
 */
export function useStock(options: { branchId?: string | null; date?: string } = {}): UseQueryResult<StockResponse> {
  const role = useAuthStore(s => s.claims?.role);
  const ownBranchId = useAuthStore(s => s.claims?.branchId);

  const scopedByServer = role ? isBranchRole(role) : false;
  const branchId = scopedByServer ? null : (options.branchId ?? null);
  const enabled = scopedByServer ? Boolean(ownBranchId) : Boolean(branchId);

  return useQuery({
    queryKey: qk.stock.byBranch(branchId ?? ownBranchId ?? null, options.date ?? 'today'),
    queryFn: () => getStock({ branchId, date: options.date }),
    enabled,
    // Stock moves with every sale — treat it as live rather than 60s-stale.
    staleTime: LIVE_STALE_TIME_MS,
  });
}
