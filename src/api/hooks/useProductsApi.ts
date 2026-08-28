import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import {
  changePrice,
  createProduct,
  getPriceHistory,
  getProduct,
  setProductActive,
  updateProduct,
  type ChangePriceResult,
  type ProductEditPayload,
} from '@/api/services/productsService';
import { qk } from '@/api/queryKeys';
import type { ChangePriceInput } from '@/shared/schemas/price.schemas';
import type { PriceHistoryDoc } from '@/shared/types/price.types';
import type { CreateProductPayload, Product } from '@/shared/types/product.types';

/**
 * Product administration.
 *
 * These are **online-only writes**, and that is the deliberate exception to the
 * offline-first rule the rest of the app follows. `writeOffline()` exists for
 * transactions a shop floor records during a shift — a sale, an expense, a
 * production order — where the alternative to queueing is losing the record.
 * Editing the catalogue is not that: it is an administrative act done from a
 * desk, it is rare, and queueing it would let two admins edit the same product
 * offline and have the later drain silently win. A failure here is an error
 * message and a retry, which is the honest outcome.
 *
 * Every mutation invalidates the whole `products` namespace rather than patching
 * a cache entry: the server keeps its own per-filter cache of product lists, so
 * after a write the only trustworthy copy is the one it returns next.
 */

export function useProduct(id: string): UseQueryResult<Product> {
  return useQuery({
    queryKey: qk.products.byId(id),
    queryFn: () => getProduct(id),
  });
}

/**
 * The audit trail for one product.
 *
 * Reads `GET /api/products/price/history`, which is super-admin only. A branch
 * role never reaches the screen that calls this, but if one did the API answers
 * 403 — the gate is there, not here.
 */
export function usePriceHistory(productId?: string): UseQueryResult<PriceHistoryDoc[]> {
  return useQuery({
    queryKey: qk.products.priceHistory(productId),
    queryFn: () => getPriceHistory(productId),
  });
}

function useInvalidateProducts() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: qk.products.all() });
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: invalidate,
  });
}

/**
 * Edit a product's details.
 *
 * `ProductEditPayload` has no `price` field, and that is the point — a price
 * moves only through `useChangePrice`, which records history and an effective
 * date. See `productsApi.ts` for why the server strips it too.
 */
export function useUpdateProduct(id: string) {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload: ProductEditPayload) => updateProduct(id, payload),
    onSuccess: invalidate,
  });
}

/**
 * Activate or deactivate, rather than delete.
 *
 * A product that has ever been sold is referenced by historical order rows.
 * Deactivating removes it from every picker and leaves those rows — and the
 * reports built on them — exactly as they were.
 */
export function useSetProductActive(id: string) {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (isActive: boolean) => setProductActive(id, isActive),
    onSuccess: invalidate,
  });
}

/**
 * Change a price.
 *
 * Returns the server's own verdict — `active`, `scheduled` or `skipped` — which
 * the screen reports verbatim rather than assuming the change went live. A
 * future effective date schedules it; an unchanged price is skipped and writes
 * no history row.
 */
export function useChangePrice(productId: string) {
  const invalidate = useInvalidateProducts();
  return useMutation<ChangePriceResult, unknown, ChangePriceInput>({
    mutationFn: (input: ChangePriceInput) => changePrice(productId, input),
    onSuccess: invalidate,
  });
}
