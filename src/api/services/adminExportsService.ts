import { apiClient } from '../client';
import type { AdminCustomersQuery, AdminProductsQuery, UsersDataQuery } from '../types';
import type { ProductionOrdersDataQuery } from './productionOrderService';

/**
 * Super Admin's exports — the files the web builds on the server, fetched
 * as CSV text for the Share sheet. Nothing here writes, except
 * `markProductionOrderPrinted` (the web's bookkeeping flag on a printed slip).
 */

/** A server-built export can take longer than an ordinary read (the web waits as long as it takes). */
const EXPORT_TIMEOUT_MS = 120_000;

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

/** The API answers a CSV as text; a header-only file could parse as JSON — never hand back anything but text. */
const asText = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

/**
 * `GET /data/:resource/export?scope=all&format=csv` — every row of the
 * filtered set. Past the resource's ceiling (10,000 rows by default) the
 * server refuses with a message naming it, which is shown as-is.
 */
export async function exportDataAllCsv(resource: string, params: Params): Promise<string> {
  const res = await apiClient.get<unknown>(`/data/${resource}/export`, { ...params, scope: 'all', format: 'csv' }, { timeout: EXPORT_TIMEOUT_MS });
  return asText(res);
}

/**
 * `GET /data/:resource/export?scope=page&format=csv` for pages 1…`pages` at
 * the list's own page size — one CSV per page, in order (the caller joins
 * them). Sequential: the phone's "current page" is rarely more than a few.
 */
export async function exportDataPagesCsv(resource: string, params: Params, pageSize: number, pages: number): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= Math.max(1, pages); page++) {
    const res = await apiClient.get<unknown>(
      `/data/${resource}/export`,
      { ...params, page, pageSize, scope: 'page', format: 'csv' },
      { timeout: EXPORT_TIMEOUT_MS },
    );
    out.push(asText(res));
  }
  return out;
}

/**
 * `GET /production-reports/export?report=collections&from&to[&branchId]&type=csv`
 * — the web's Collections sheet (one row per billed delivery, what the branch
 * owes for it, then the trailing TOTAL / held-back rows), as CSV. Each row
 * is a balance computation on the server, so this can take a while.
 */
export async function exportCollectionsCsv(query: { from: string; to: string; branchId: string | null }): Promise<string> {
  const res = await apiClient.get<unknown>(
    '/production-reports/export',
    compact({ report: 'collections', from: query.from, to: query.to, branchId: query.branchId, type: 'csv' }),
    { timeout: EXPORT_TIMEOUT_MS },
  );
  return asText(res);
}

/**
 * `PUT /production-orders/:id/printed` — flags the slip printed (idempotent;
 * never touches stock). The web sets it on A4 Challan and POP Print, never on
 * Production Check, fire-and-forget.
 */
export async function markProductionOrderPrinted(id: string): Promise<void> {
  await apiClient.put<unknown>(`/production-orders/${encodeURIComponent(id)}/printed`);
}
