import type { ChangePriceInput } from '@/shared/schemas/price.schemas';
import type { PriceHistoryDoc } from '@/shared/types/price.types';
import type {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from '@/shared/types/product.types';
import { api } from '../client';

/**
 * Product administration. Super-admin only, and every route here is gated
 * `requireRole('super_admin')` on the server — this app hides them from other
 * roles as convenience, not as a boundary.
 *
 * Reads live in `catalogApi.ts`; this module is the write side.
 *
 * ---------------------------------------------------------------------------
 * The rule this module exists to keep
 * ---------------------------------------------------------------------------
 * **Changing a price must never alter a historical sale or order.** Two things
 * hold that, and both are on the server:
 *
 *  1. `POST /api/orders/pos` reads `products.price` at the moment the order is
 *     written and snapshots it onto each `order_items` row as `unit_price` /
 *     `line_total`. A later price change cannot reach those rows — they are the
 *     record of what was actually charged. It is also why the app sends only
 *     `productId`, `qty` and `discount` when ringing up a sale, never a price.
 *  2. `PUT /api/products/:id` **deletes `price` from the update** before it
 *     touches the table. The only way to move a price is `POST /:id/price`,
 *     which appends an immutable `product_price_history` row through the
 *     `apply_price_change` Postgres function.
 *
 * `updateProduct` below mirrors (2) in the type system: it takes a payload with
 * `price` removed, so an edit form physically cannot offer the field. The server
 * would strip it anyway; making it a compile error means nobody has to discover
 * that by wondering why their edit silently did nothing.
 */

/** An edit payload with `price` removed — see the module note. */
export type ProductEditPayload = Omit<UpdateProductPayload, 'price'>;

export async function getProduct(id: string): Promise<Product> {
  const data = await api.get<{ product: Product }>(`/api/products/${id}`);
  return data.product;
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<{ id: string; name: string; price: number }> {
  return api.post<{ id: string; name: string; price: number }>('/api/products', payload);
}

export async function updateProduct(id: string, payload: ProductEditPayload): Promise<void> {
  await api.put<{ success: boolean }>(`/api/products/${id}`, payload);
}

/**
 * Activate or deactivate.
 *
 * Deliberately not `DELETE /api/products/:id`. A product that has ever been sold
 * is referenced by historical order rows; deactivating takes it out of every
 * picker while leaving those rows — and the reports built on them — intact.
 */
export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  await updateProduct(id, { isActive });
}

export interface ChangePriceResult {
  /**
   * `active` — live now, and branches were notified.
   * `scheduled` — dated ahead; it activates on that business date.
   * `skipped` — the price was already this, so no history row was written.
   */
  status: 'active' | 'scheduled' | 'skipped';
  versionNumber?: number;
  effectiveDate?: string;
  reason?: string;
}

/**
 * The only way to move a price.
 *
 * `effectiveDate` carries business-date semantics (the day rolls at 02:00
 * Asia/Karachi), and a future date schedules rather than applies.
 */
export async function changePrice(
  productId: string,
  input: ChangePriceInput,
): Promise<ChangePriceResult> {
  return api.post<ChangePriceResult>(`/api/products/${productId}/price`, input);
}

/**
 * The audit trail, newest first.
 *
 * Mounted at `/api/products/price/history` — a distinct prefix registered before
 * the products router so it never resolves as `GET /api/products/:id`.
 */
export async function getPriceHistory(
  productId?: string,
  limit = 100,
): Promise<PriceHistoryDoc[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (productId) params.productId = productId;

  const data = await api.get<{ history: PriceHistoryDoc[]; total: number }>(
    '/api/products/price/history',
    { params },
  );
  return data.history ?? [];
}
