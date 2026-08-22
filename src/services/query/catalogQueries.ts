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
import { readThrough } from '@/services/query/readThrough';
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
import { useMirrorStore } from '@/store/mirrorStore';
import type { Branch } from '@/shared/types/branch.types';
import type { Category, Product } from '@/shared/types/product.types';
import type { AppSettings } from '@/shared/types/settings.types';

/**
 * Query definitions for the read-only catalogue — key, fetcher and lifetime in
 * one place, with no React import.
 *
 * They live apart from `hooks/useCatalog.ts` because there are now **two**
 * callers: the screens, through those hooks, and the boot sequence, which warms
 * these same caches before navigating (`services/boot/bootSequence.ts`).
 *
 * Defining them once is not tidiness. A prefetch that rebuilt the key by hand
 * would fill a *second* cache entry, and the screen would then fetch again and
 * find its own entry empty — the warm step would cost a request and buy nothing,
 * while looking like it worked. Same key, same fetcher, or don't warm at all.
 */

export function categoriesQuery() {
  return {
    queryKey: qk.categories.all(),
    queryFn: (): Promise<Category[]> =>
      readThrough({
        resource: 'categories',
        fetch: getCategories,
        save: saveCategories,
        read: readCategories,
      }),
    // Categories change rarely and the server caches them too.
    staleTime: 10 * 60 * 1000,
  };
}

export function branchesQuery() {
  return {
    queryKey: qk.branches.all(),
    queryFn: (): Promise<Branch[]> =>
      readThrough({
        resource: 'branches',
        fetch: getBranches,
        save: saveBranches,
        read: readBranches,
      }),
    staleTime: 10 * 60 * 1000,
  };
}

export function settingsQuery() {
  return {
    queryKey: qk.settings(),
    queryFn: (): Promise<AppSettings> => getSettings(),
    staleTime: 10 * 60 * 1000,
  };
}

export function productsQuery(filters: ProductFilters = {}) {
  // A filtered fetch is a slice of the catalogue, so it is served from the
  // mirror but never written to it — saving a search result would delete every
  // product the search did not match.
  const isFullFetch = !filters.search?.trim() && !filters.categoryId;

  return {
    queryKey: qk.products.list(filters),
    queryFn: (): Promise<Product[]> =>
      readThrough({
        resource: 'products',
        fetch: () => getProducts(filters),
        ...(isFullFetch ? { save: saveProducts } : {}),
        read: () => readProducts(filters),
      }),
  };
}

/**
 * Stock for one branch context.
 *
 * The caller resolves the scope, because the rule differs by role and this
 * module has no claims: a branch role is scoped server-side and must not send a
 * branchId, while admin and production roles have no implicit branch and pass
 * the one that was chosen.
 */
export function stockQuery({
  requestBranchId,
  mirrorScope,
  date,
}: {
  /** Sent to the API. Null for a branch role, which the server scopes itself. */
  requestBranchId: string | null;
  /** Which branch's mirror to read. Always a concrete branch, or ''. */
  mirrorScope: string;
  date?: string;
}) {
  return {
    queryKey: qk.stock.byBranch(requestBranchId ?? mirrorScope ?? null, date ?? 'today'),
    queryFn: async (): Promise<StockResponse> => {
      try {
        const live = await getStock({ branchId: requestBranchId, date });
        // Only today's balances are mirrored: a back-dated read is a report, and
        // serving yesterday's numbers as today's is worse than an error state.
        if (!date) await saveStock(mirrorScope, live.rows, live.date).catch(() => {});
        useMirrorStore.getState().clearSavedAt('stock');
        return live;
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isRetryable) throw error;
        const mirrored = await readStock(mirrorScope).catch(() => null);
        if (!mirrored || mirrored.rows.length === 0) throw error;
        useMirrorStore.getState().setSavedAt('stock', mirrored.savedAt);
        // The server's own date, saved with the balances — never the device's.
        return { date: mirrored.businessDate, rows: mirrored.rows };
      }
    },
    // Stock moves with every sale — treat it as live rather than 60s-stale.
    staleTime: LIVE_STALE_TIME_MS,
  };
}
