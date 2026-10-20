import { apiClient } from '../client';
import type { AdminCustomerInput } from '../types';

/**
 * Super Admin's catalogue write actions — the web `CategoriesPage` and
 * `CustomerForm`, same endpoints and bodies. Every route re-checks the role
 * (`super_admin` for categories; `super_admin` or a branch role for customers).
 */

/** `POST /api/products/categories` — `{ name }`; a name that slugifies like an existing one is a 409. */
export async function createCategory(name: string): Promise<{ id: string; name: string }> {
  return apiClient.post<{ id: string; name: string }>('/products/categories', { name });
}

/** `PUT /api/products/categories/:id` — the web's rename sends only `{ name }`. */
export async function renameCategory(id: string, name: string): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/products/categories/${id}`, { name });
}

/** `DELETE /api/products/categories/:id` — a soft delete: `is_active = false`, so it leaves the list. */
export async function removeCategory(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/products/categories/${id}`);
}

/** `POST /api/customers` — `CreateCustomerSchema`'s body; the server fills `branch_name`. */
export async function createCustomer(input: AdminCustomerInput): Promise<{ id: string; name: string }> {
  return apiClient.post<{ id: string; name: string }>('/customers', input);
}

/**
 * `PUT /api/customers/:id` — the web sends the whole form, `branchId`
 * included; `UpdateCustomerSchema` strips it, so a customer's branch never
 * changes here.
 */
export async function updateCustomer(id: string, input: AdminCustomerInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/customers/${id}`, input);
}
