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
import {
  readBranches,
  readCategories,
  readProducts,
  readStock,
  saveBranches,
  saveCategories,
  saveProducts,
  saveStock,
} from '@/database/repositories/referenceRepository';
import { ApiError } from '@/services/api/errors';
import { readThrough } from '@/services/query/readThrough';
import { useMirrorStore } from '@/store/mirrorStore';
import { useAuthStore } from '@/store/authStore';

/**
 * Server-state hooks for the read-only catalogue.
 *
 * Cache lifetimes are chosen per resource rather than globally: the catalogue
 * and branch list barely move, while stock changes with every sale and is
 * therefore treated as live data.
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
  // A filtered fetch is a slice of the catalogue, so it is served from the
  // mirror but never written to it — saving a search result would delete every
  // product the search did not match.
  const isFullFetch = !filters.search?.trim() && !filters.categoryId;

  return useQuery({
    queryKey: qk.products.list(filters),
    queryFn: () =>
      readThrough({
        resource: 'products',
        fetch: () => getProducts(filters),
        ...(isFullFetch ? { save: saveProducts } : {}),
        read: () => readProducts(filters),
      }),
    // Keeps the previous list on screen while a new search resolves, instead of
    // flashing a skeleton on every keystroke.
    placeholderData: previous => previous,
  });
}

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: qk.categories.all(),
    queryFn: () =>
      readThrough({
        resource: 'categories',
        fetch: getCategories,
        save: saveCategories,
        read: readCategories,
      }),
    // Categories change rarely and the server caches them too.
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * `enabled` exists for the screens shared between an admin and a branch manager.
 * A branch manager is scoped to their own branch by the server and has no branch
 * filter to draw, so fetching the list for them is a request whose answer is
 * discarded — allowed by the API (`GET /api/branches` is authenticate-only), and
 * still worth not making.
 */
export function useBranches({ enabled = true } = {}): UseQueryResult<Branch[]> {
  return useQuery({
    queryKey: qk.branches.all(),
    queryFn: () =>
      readThrough({
        resource: 'branches',
        fetch: getBranches,
        save: saveBranches,
        read: readBranches,
      }),
    staleTime: 10 * 60 * 1000,
    enabled,
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
export function useStock(
  options: { branchId?: string | null; date?: string } = {},
): UseQueryResult<StockResponse> {
  const role = useAuthStore(s => s.claims?.role);
  const ownBranchId = useAuthStore(s => s.claims?.branchId);

  const scopedByServer = role ? isBranchRole(role) : false;
  const branchId = scopedByServer ? null : options.branchId ?? null;
  const enabled = scopedByServer ? Boolean(ownBranchId) : Boolean(branchId);

  return useQuery({
    queryKey: qk.stock.byBranch(branchId ?? ownBranchId ?? null, options.date ?? 'today'),
    queryFn: async () => {
      // The mirror is keyed by branch, and a branch role's branch comes from its
      // claims rather than the request — the server scopes it either way.
      const scope = branchId ?? ownBranchId ?? '';
      try {
        const live = await getStock({ branchId, date: options.date });
        // Only today's balances are mirrored: a back-dated read is a report, and
        // serving yesterday's numbers as today's is worse than an error state.
        if (!options.date) await saveStock(scope, live.rows, live.date).catch(() => {});
        useMirrorStore.getState().clearSavedAt('stock');
        return live;
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isRetryable) throw error;
        const mirrored = await readStock(scope).catch(() => null);
        if (!mirrored || mirrored.rows.length === 0) throw error;
        useMirrorStore.getState().setSavedAt('stock', mirrored.savedAt);
        // The server's own date, saved with the balances — never the device's.
        return { date: mirrored.businessDate, rows: mirrored.rows };
      }
    },
    enabled,
    // Stock moves with every sale — treat it as live rather than 60s-stale.
    staleTime: LIVE_STALE_TIME_MS,
  });
}
