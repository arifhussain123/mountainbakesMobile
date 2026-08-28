import type { Branch } from '@/shared/types/branch.types';
import type { Category, Product } from '@/shared/types/product.types';
import type { AppSettings } from '@/shared/types/settings.types';
import type { StockRow } from '@/shared/types/stock.types';
import { api } from '../client';

/**
 * Read-only catalogue and stock endpoints.
 *
 * Response shapes are resource-keyed, not enveloped — `{products, total}`,
 * `{categories}`, `{date, rows}`. Each is read from the server's route handlers
 * rather than assumed, and unwrapped at the call site here so screens receive
 * plain arrays.
 */

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  /**
   * "Special" products are auto-created to carry a branch's one-off order item.
   * They are real and active so stock works, but must not appear in any
   * catalogue picker — the server excludes them unless this is true. Leave it
   * off for anything a user picks from.
   */
  includeSpecial?: boolean;
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.isActive !== undefined) params.isActive = String(filters.isActive);
  if (filters.includeSpecial) params.includeSpecial = 'true';

  const data = await api.get<{ products: Product[]; total: number }>('/api/products', { params });
  return data.products ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const data = await api.get<{ categories: Category[] }>('/api/products/categories');
  return data.categories ?? [];
}

export async function getBranches(): Promise<Branch[]> {
  const data = await api.get<{ branches: Branch[] }>('/api/branches');
  return data.branches ?? [];
}

export async function getSettings(): Promise<AppSettings> {
  const data = await api.get<{ settings: AppSettings }>('/api/settings');
  return data.settings;
}

export interface StockResponse {
  /** Business date the rows belong to — echoed back by the server. */
  date: string;
  rows: StockRow[];
}

/**
 * Stock for a branch on a business date.
 *
 * Branch roles are auto-scoped server-side to their own branch and must NOT send
 * `branchId`. Admin and production roles have no implicit branch, so the server
 * answers 400 "Branch context required" if one is omitted.
 *
 * Omitting `date` lets the server apply the current BUSINESS date (2 AM
 * rollover), which is more reliable than computing it here and sending it.
 */
export async function getStock(options: {
  branchId?: string | null;
  date?: string;
} = {}): Promise<StockResponse> {
  const params: Record<string, string> = {};
  if (options.branchId) params.branchId = options.branchId;
  if (options.date) params.date = options.date;

  return api.get<StockResponse>('/api/stock', { params });
}
