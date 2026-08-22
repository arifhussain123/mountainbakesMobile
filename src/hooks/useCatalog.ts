import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ProductFilters, StockResponse } from '@/services/api/catalogApi';
import {
  branchesQuery,
  categoriesQuery,
  productsQuery,
  settingsQuery,
  stockQuery,
} from '@/services/query/catalogQueries';
import type { Branch } from '@/shared/types/branch.types';
import type { Category, Product } from '@/shared/types/product.types';
import type { AppSettings } from '@/shared/types/settings.types';
import { isBranchRole } from '@/navigation/roleNavigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Server-state hooks for the read-only catalogue.
 *
 * The key, the fetcher and the cache lifetime for each of these now live in
 * `services/query/catalogQueries.ts`, because the boot sequence warms the same
 * caches and both callers have to agree on the key exactly — see the note there.
 * What stays here is the part that needs React and claims: which branch a stock
 * read is scoped to, and when a query is worth enabling at all.
 *
 * ---------------------------------------------------------------------------
 * Every one of these reads through the SQLite mirror
 * ---------------------------------------------------------------------------
 * A cold start with no signal used to leave these hooks in an error state, and
 * therefore left the offline *write* path unreachable: a cashier cannot build a
 * cart from a screen showing "could not connect". `readThrough` fetches, mirrors
 * what it got, and serves the mirror when the request never reached the server.
 * See `database/repositories/referenceRepository.ts`.
 */

/** Catalogue data is stable; the default 60s staleTime applies. */
export function useProducts(filters: ProductFilters = {}): UseQueryResult<Product[]> {
  return useQuery({
    ...productsQuery(filters),
    // Keeps the previous list on screen while a new search resolves, instead of
    // flashing a skeleton on every keystroke.
    placeholderData: previous => previous,
  });
}

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery(categoriesQuery());
}

/**
 * `enabled` exists for the screens shared between an admin and a branch manager.
 * A branch manager is scoped to their own branch by the server and has no branch
 * filter to draw, so fetching the list for them is a request whose answer is
 * discarded — allowed by the API (`GET /api/branches` is authenticate-only), and
 * still worth not making.
 */
export function useBranches({ enabled = true } = {}): UseQueryResult<Branch[]> {
  return useQuery({ ...branchesQuery(), enabled });
}

export function useSettings(): UseQueryResult<AppSettings> {
  return useQuery(settingsQuery());
}

/**
 * Stock for the caller's branch context.
 *
 * A branch role is scoped server-side to its own branch and must not send a
 * branchId. Admin and production roles have no implicit branch, so the query
 * stays disabled until one is chosen — otherwise the request 400s with
 * "Branch context required" and the screen shows an error the user cannot act on.
 */
export function useStock(
  options: { branchId?: string | null; date?: string } = {},
): UseQueryResult<StockResponse> {
  const role = useAuthStore(s => s.claims?.role);
  const ownBranchId = useAuthStore(s => s.claims?.branchId);

  const scopedByServer = role ? isBranchRole(role) : false;
  const requestBranchId = scopedByServer ? null : options.branchId ?? null;
  const enabled = scopedByServer ? Boolean(ownBranchId) : Boolean(requestBranchId);

  return useQuery({
    // The mirror is keyed by branch, and a branch role's branch comes from its
    // claims rather than the request — the server scopes it either way.
    ...stockQuery({
      requestBranchId,
      mirrorScope: requestBranchId ?? ownBranchId ?? '',
      ...(options.date ? { date: options.date } : {}),
    }),
    enabled,
  });
}
