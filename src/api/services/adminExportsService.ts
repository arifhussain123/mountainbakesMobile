import { apiClient } from '../client';
import type { AdminCustomersQuery, AdminProductsQuery, UsersDataQuery } from '../types';
import type { ProductionOrdersDataQuery } from './productionOrderService';

/**
 * Super Admin's exports — the list query each exported table sends (the
 * files themselves are downloaded with `downloadServerFile`, see
 * `features/admin/utils/exports/fileExports.ts`). Nothing here writes, except
 * `markProductionOrderPrinted` (the web's bookkeeping flag on a printed slip).
 */

type Params = Record<string, string | number>;

/** Drops empty values so the Data Engine never sees `role=` (a 400 on an enum). */
function compact(params: Record<string, string | number | boolean | null | undefined>): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '' || v === false) continue;
    out[k] = typeof v === 'boolean' ? 'true' : typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

// ─── The list query string of each exported table ──────────────────────────
// The same filters the screen's list request sends (`listCustomersData`,
// `listAdminProducts`, `listUsersData`, `listProductionOrdersData`), so the
// file holds exactly the rows the list shows.

export function customersExportParams(q: AdminCustomersQuery): Params {
  return compact({
    sort: q.sort || 'createdAt:desc',
    search: q.search,
    branchId: q.branchId,
    'totalOrders.gte': q.ordersMin,
    'totalOrders.lte': q.ordersMax,
    'totalSpent.gte': q.spentMin,
    'totalSpent.lte': q.spentMax,
    'createdAt.gte': q.sinceFrom,
    'createdAt.lte': q.sinceTo,
  });
}

export function productsExportParams(q: AdminProductsQuery): Params {
  return compact({
    sort: q.sort || 'name:asc',
    search: q.search,
    categoryId: q.categoryId,
    isActive: q.isActive === undefined ? undefined : String(q.isActive),
    'price.gte': q.priceMin,
    'price.lte': q.priceMax,
  });
}

export function usersExportParams(q: Omit<UsersDataQuery, 'page' | 'pageSize'>): Params {
  return compact({
    search: q.search,
    role: q.role,
    status: q.status,
    branchId: q.branchId,
    'lastLoginAt.gte': q.lastLoginFrom,
    'lastLoginAt.lte': q.lastLoginTo,
    sort: q.sort,
  });
}

export function productionOrdersExportParams(q: ProductionOrdersDataQuery): Params {
  return compact({
    search: q.search,
    status: q.status,
    branchId: q.branchId,
    'businessDate.gte': q.dateFrom,
    'businessDate.lte': q.dateTo,
    'requiredDate.gte': q.requiredFrom,
    'requiredDate.lte': q.requiredTo,
    sort: q.sort,
  });
}

/**
 * `PUT /production-orders/:id/printed` — flags the slip printed (idempotent;
 * never touches stock). The web sets it on A4 Challan and POP Print, never on
 * Production Check, fire-and-forget.
 */
export async function markProductionOrderPrinted(id: string): Promise<void> {
  await apiClient.put<unknown>(`/production-orders/${encodeURIComponent(id)}/printed`);
}
