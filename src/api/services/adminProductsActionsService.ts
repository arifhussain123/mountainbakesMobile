import { apiClient } from '../client';
import type {
  ChangeProductPriceInput,
  ChangeProductPriceResult,
  CreatePackingMaterialInput,
  CreateProductInput,
  UpdatePackingMaterialInput,
  UpdateProductInput,
} from '../types';

/**
 * Super Admin → Products' write actions — the web `ProductsPage`,
 * `ProductForm`, `ChangePriceDialog` and `PackingMaterialsPage`, same
 * endpoints and bodies. Every write route is `requireRole('super_admin')`.
 */

/** `POST /api/products` — always created active; branch managers are notified. */
export async function createProduct(input: CreateProductInput): Promise<{ id: string; name: string; price: number }> {
  return apiClient.post<{ id: string; name: string; price: number }>('/products', input);
}

/**
 * `PUT /api/products/:id` — the edit form, and the web's Activate (`{ isActive: true }`).
 * A price in this body is stripped by the server: prices change only through `changeProductPrice`.
 */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/products/${id}`, input);
}

/** `DELETE /api/products/:id` — a soft delete (`is_active = false`): order history still references the product. */
export async function deactivateProduct(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/products/${id}`);
}

/** `POST /api/products/:id/price` — the only way to change a price; records an immutable history row. */
export async function changeProductPrice(id: string, input: ChangeProductPriceInput): Promise<ChangeProductPriceResult> {
  return apiClient.post<ChangeProductPriceResult>(`/products/${id}/price`, input);
}

/** `POST /api/packing-materials` — a taken code is a 409 with a readable message. */
export async function createPackingMaterial(input: CreatePackingMaterialInput): Promise<{ id: string; materialCode: string; materialName: string }> {
  return apiClient.post<{ id: string; materialCode: string; materialName: string }>('/packing-materials', input);
}

/** `PUT /api/packing-materials/:id` — the edit form, and Disable / Enable (`{ isActive }`). */
export async function updatePackingMaterial(id: string, input: UpdatePackingMaterialInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/packing-materials/${id}`, input);
}

/**
 * `DELETE /api/packing-materials/:id` — a REAL delete, unlike products: every
 * packing line snapshots the name and its FK is `on delete set null`, so past
 * demands and printed slips keep their record.
 */
export async function deletePackingMaterial(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/packing-materials/${id}`);
}
