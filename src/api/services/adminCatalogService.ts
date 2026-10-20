import { apiClient } from '../client';
import type {
  AdminBranch,
  AdminProductsQuery,
  CatalogProduct,
  DataEnginePage,
  PackingMaterialListResponse,
} from '../types';

/**
 * Super Admin's catalogue screens — read-only, exactly the endpoints the web's
 * Products / Packing Materials / Price List / Branches pages read. numeric
 * columns can arrive as strings, so money is coerced here once.
 */

/**
 * `GET /api/data/products` — the web Products tab's server-paged list (Special
 * Order one-offs are excluded by the resource's own scope).
 */
export async function listAdminProducts(query: AdminProductsQuery & { page: number; pageSize?: 20 | 50 | 100 }): Promise<DataEnginePage<CatalogProduct>> {
  const { page, pageSize = 50, search, categoryId, isActive, priceMin, priceMax, sort = 'name:asc' } = query;
  const res = await apiClient.get<DataEnginePage<CatalogProduct>>('/data/products', {
    page,
    pageSize,
    sort,
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(isActive === undefined ? {} : { isActive: String(isActive) }),
    ...(priceMin === undefined ? {} : { 'price.gte': priceMin }),
    ...(priceMax === undefined ? {} : { 'price.lte': priceMax }),
  });
  return {
    ...res,
    total: Number(res.total ?? 0),
    data: (res.data ?? []).map((p) => ({
      ...p,
      price: Number(p.price),
      costPrice: p.costPrice === null || p.costPrice === undefined ? null : Number(p.costPrice),
    })),
  };
}

/** `GET /api/packing-materials?includeInactive=true` — the admin view, disabled materials included. */
export async function listAllPackingMaterials(): Promise<PackingMaterialListResponse> {
  return apiClient.get<PackingMaterialListResponse>('/packing-materials', { includeInactive: 'true' });
}

/** `GET /api/branches` — active branches only, as the web Branches page lists them. */
export async function listActiveAdminBranches(): Promise<{ branches: AdminBranch[] }> {
  const res = await apiClient.get<{ branches: AdminBranch[] }>('/branches');
  return {
    branches: (res.branches ?? []).map((b) => ({
      ...b,
      companySharePct: b.companySharePct === null || b.companySharePct === undefined ? null : Number(b.companySharePct),
    })),
  };
}

