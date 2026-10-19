import { apiClient } from '../client';
import type { CatalogProduct, PriceChange, PriceHistoryQuery, PriceHistoryResponse } from '../types';

/**
 * `GET /api/products/price/history` — super_admin only. The server filters by
 * product and searches the PRC number, product name, code and reason; it sorts
 * by `changed_on` desc by default, or by `sortBy`/`sortDir` (the web's columns). Nothing else (dates, user, direction,
 * source) is a server filter — the screen narrows the loaded rows itself.
 *
 * numeric columns can arrive as strings, so prices are coerced here once.
 */
export async function listPriceHistory(query: PriceHistoryQuery & { limit: number; offset: number }): Promise<PriceHistoryResponse> {
  const res = await apiClient.get<PriceHistoryResponse>('/products/price/history', {
    limit: query.limit,
    offset: query.offset,
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy, sortDir: query.sortDir ?? 'desc' } : {}),
  });
  return { total: Number(res.total ?? 0), history: (res.history ?? []).map(normalisePriceChange) };
}

function normalisePriceChange(h: PriceChange): PriceChange {
  return {
    ...h,
    oldPrice: h.oldPrice === null || h.oldPrice === undefined ? null : Number(h.oldPrice),
    newPrice: Number(h.newPrice),
    versionNumber: Number(h.versionNumber ?? 0),
  };
}

/**
 * `GET /api/products/price/history/export?type=csv` — the server's own export
 * (up to 1,000 rows, optionally one product). CSV rather than Excel: there is
 * no file-system/binary-share module in this app, so plain text into the share
 * sheet is the only honest export (same as `exportBranchClosingCsv`). The
 * server ignores search — the file is the whole history, or one product's.
 */
export async function exportPriceHistoryCsv(productId?: string): Promise<string> {
  return apiClient.get<string>('/products/price/history/export', { type: 'csv', ...(productId ? { productId } : {}) });
}

/**
 * `GET /api/products?includeSpecial=true` — every product, hidden Special Order
 * items too (a price change can be on one), with cost. Used for the "Below
 * cost" hint and the current price.
 */
export async function listCatalogProducts(): Promise<{ products: CatalogProduct[]; total: number }> {
  const res = await apiClient.get<{ products: CatalogProduct[]; total: number }>('/products', { includeSpecial: 'true' });
  return {
    total: res.total,
    products: (res.products ?? []).map((p) => ({
      ...p,
      price: Number(p.price),
      costPrice: p.costPrice === null || p.costPrice === undefined ? null : Number(p.costPrice),
    })),
  };
}
