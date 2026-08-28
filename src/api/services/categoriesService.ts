import type { CreateCategoryInput, UpdateCategoryInput } from '@/shared/schemas/product.schemas';
import { api } from '../client';

/**
 * Category administration — the write side. Reads are `catalogApi.getCategories`.
 *
 * Mounted under the PRODUCTS router (`/api/products/categories`), not a
 * top-level `/api/categories`, because categories are part of the catalogue
 * resource on the server. Writing the path as `/api/categories` here would 404
 * against a route table that has no such prefix.
 *
 * Every write is `requireRole('super_admin')`; the read is authenticated only,
 * which is why a branch account can still populate a product picker.
 *
 * ---------------------------------------------------------------------------
 * Removing a category deactivates it
 * ---------------------------------------------------------------------------
 * `DELETE /api/products/categories/:id` sets `is_active = false`; it does not
 * delete the row. Products carry a `category_id`, and a hard delete would either
 * orphan them or cascade into the catalogue. Deactivating takes the category out
 * of every picker while every product that ever belonged to it keeps resolving
 * its name — which is what a historical order needs in order to still read
 * correctly.
 *
 * The server also filters `is_active = true` out of the list, so a deactivated
 * category disappears from the app without any client-side filtering.
 */

export async function createCategory(input: CreateCategoryInput): Promise<{ id: string }> {
  return api.post<{ id: string }>('/api/products/categories', input);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<void> {
  await api.put<{ success: boolean }>(`/api/products/categories/${id}`, input);
}

/** Deactivate. See the module note: this is not a delete. */
export async function deactivateCategory(id: string): Promise<void> {
  await api.delete<{ success: boolean }>(`/api/products/categories/${id}`);
}
