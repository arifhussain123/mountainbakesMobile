/**
 * The web's file downloads, as requests the phone can make. Every Excel / PDF
 * / CSV the web Super Admin saves is built by the server (the browser only
 * saves the Blob), so the phone asks the same endpoint with the same query
 * and names the file as the web does — `downloadServerFile(endpoint, params,
 * fileName)` then `shareFile`. Nothing here touches React or the network.
 */

export type FileFormat = 'excel' | 'pdf' | 'csv';

export const FILE_EXTENSION: Record<FileFormat, 'xlsx' | 'pdf' | 'csv'> = { excel: 'xlsx', pdf: 'pdf', csv: 'csv' };
export const FORMAT_LABEL: Record<FileFormat, string> = { excel: 'Excel', pdf: 'PDF', csv: 'CSV' };

/** Which formats each page's web export offers, in the web's button order. */
export const EXPORT_FORMATS = {
  /** Data Engine tables (Customers, Products, Users, Orders) — `ExportMenu`. */
  dataTable: ['excel', 'csv'],
  /** Orders → Export Collections — `CollectionsExportModal`'s one button. */
  collections: ['excel'],
  /** Reports & Analytics — PDF · Excel · CSV. */
  reports: ['pdf', 'excel', 'csv'],
  /** Price List — both cards: Export Excel · Export CSV. */
  priceList: ['excel', 'csv'],
  /** Price History — Excel · CSV. */
  priceHistory: ['excel', 'csv'],
  /** Finance Reports — PDF · Excel · CSV. */
  financeReports: ['pdf', 'excel', 'csv'],
  /** Finance Ledger (Daily Ledger) — PDF · Excel. */
  financeLedger: ['pdf', 'excel'],
} as const satisfies Record<string, readonly FileFormat[]>;

export interface ServerFileRequest {
  /** Path under the API base, as `apiClient` takes it (`/reports/export`). */
  endpoint: string;
  params: Record<string, string | number>;
  /** The web's own file name, extension included. */
  fileName: string;
}

/** The web's date stamp: `new Date().toISOString().slice(0, 10)` (UTC). */
export function exportStamp(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Drops empty values, as the web's `toQuery` / `URLSearchParams` building does. */
function compact(params: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = typeof v === 'number' ? v : String(v);
  }
  return out;
}

// ─── Data Engine tables (`ExportMenu` → `exportResource`) ──────────────────

/** The page sizes `GET /data/:resource` accepts (`PAGE_SIZES` on the server). */
export const DATA_PAGE_SIZES = [20, 50, 100] as const;

/**
 * The web's "current page" is one page of the table. The phone scrolls, so its
 * "page" is every row loaded so far — sent as page 1 at the smallest page size
 * the server accepts that holds them (at most 100, the server's largest).
 */
export function currentPageWindow(loadedRows: number, listPageSize: number): { page: number; pageSize: number } {
  const want = Math.max(loadedRows, listPageSize);
  return { page: 1, pageSize: DATA_PAGE_SIZES.find((s) => s >= want) ?? DATA_PAGE_SIZES[DATA_PAGE_SIZES.length - 1] };
}

/** What the "current page" file holds, for the row's second line. */
export function currentPageHint(loadedRows: number, listPageSize: number, total: number | null | undefined): string {
  if (loadedRows === 0) return 'No rows on this screen';
  const { pageSize } = currentPageWindow(loadedRows, listPageSize);
  const rows = Math.min(pageSize, total ?? pageSize);
  return rows === loadedRows ? `The ${rows.toLocaleString('en-US')} rows on this screen` : `The first ${rows.toLocaleString('en-US')} rows of this list`;
}

/** The web's file name: `<fileName>-<YYYY-MM-DD>.xlsx|csv`, `fileName` defaulting to `mountain-bakes-<resource>`. */
export function exportFileTitle(resource: string, fileName: string | undefined, format: 'excel' | 'csv', now: Date = new Date()): string {
  return `${fileName ?? `mountain-bakes-${resource}`}-${exportStamp(now)}.${FILE_EXTENSION[format]}`;
}

/**
 * `GET /data/:resource/export?<list query>&scope=page|all&format=excel|csv` —
 * the list's own filters, so the file holds exactly the rows the list shows.
 * Past the resource's ceiling an "all" export is refused with a message naming it.
 */
export function dataTableExportRequest(
  t: { resource: string; fileName?: string; params: Record<string, string | number>; pageSize: number; loadedRows: number },
  scope: 'page' | 'all',
  format: 'excel' | 'csv',
  now: Date = new Date(),
): ServerFileRequest {
  const page = scope === 'page' ? currentPageWindow(t.loadedRows, t.pageSize) : {};
  return {
    endpoint: `/data/${t.resource}/export`,
    params: { ...t.params, ...page, scope, format },
    fileName: exportFileTitle(t.resource, t.fileName, format, now),
  };
}

// ─── Orders → Export Collections ───────────────────────────────────────────

/**
 * Named after the window AND the branch, as the web names it:
 * `mountain-bakes-collections-<all-branches|branch-slug>-<from>[_to_<to>].xlsx`.
 */
export function collectionsFileName(from: string, to: string, branchName: string | null): string {
  const window = from === to ? from : `${from}_to_${to}`;
  const who = branchName === null ? 'all-branches' : (branchName || 'branch').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `mountain-bakes-collections-${who}-${window}.xlsx`;
}

/** `GET /production-reports/export?report=collections&from&to[&branchId]&type=excel`. */
export function collectionsExportRequest(from: string, to: string, branch: { id: string; name: string } | null): ServerFileRequest {
  return {
    endpoint: '/production-reports/export',
    params: compact({ report: 'collections', from, to, branchId: branch?.id, type: 'excel' }),
    fileName: collectionsFileName(from, to, branch ? branch.name : null),
  };
}

// ─── Reports & Analytics ───────────────────────────────────────────────────

/** `GET /reports/export?type=pdf|excel|csv&period=…` → `mountain-bakes-report-<period>.<ext>`. */
export function reportsExportRequest(period: string, format: FileFormat): ServerFileRequest {
  return {
    endpoint: '/reports/export',
    params: { type: format, period },
    fileName: `mountain-bakes-report-${period}.${FILE_EXTENSION[format]}`,
  };
}

// ─── Price List / Price History ────────────────────────────────────────────

/**
 * `GET /products/price/list/export?type=excel|csv[&groupBy=category]` —
 * `mountain-bakes-price-list-<date>` or `mountain-bakes-products-by-category-<date>`.
 */
export function priceListExportRequest(format: 'excel' | 'csv', byCategory: boolean, now: Date = new Date()): ServerFileRequest {
  return {
    endpoint: '/products/price/list/export',
    params: byCategory ? { type: format, groupBy: 'category' } : { type: format },
    fileName: `mountain-bakes-${byCategory ? 'products-by-category' : 'price-list'}-${exportStamp(now)}.${FILE_EXTENSION[format]}`,
  };
}

/** `GET /products/price/history/export?type=excel|csv` — the whole trail, as the web page exports it. */
export function priceHistoryExportRequest(format: 'excel' | 'csv', now: Date = new Date()): ServerFileRequest {
  return {
    endpoint: '/products/price/history/export',
    params: { type: format },
    fileName: `mountain-bakes-price-history-${exportStamp(now)}.${FILE_EXTENSION[format]}`,
  };
}

// ─── Finance Reports / Finance Ledger (`downloadFinanceReport`) ────────────

/**
 * `GET /finance/reports/export?<report query>&format=pdf|excel|csv` — the
 * report's filters without paging (the export holds every matched row),
 * saved as `mountain-bakes-<type-with-dashes>.<ext>`.
 */
export function financeReportExportRequest(query: Record<string, unknown>, format: FileFormat): ServerFileRequest {
  const filters = Object.fromEntries(Object.entries(query).filter(([k]) => k !== 'page' && k !== 'pageSize'));
  return {
    endpoint: '/finance/reports/export',
    params: compact({ ...filters, format }),
    fileName: `mountain-bakes-${String(query.type ?? 'report').replace(/_/g, '-')}.${FILE_EXTENSION[format]}`,
  };
}

/** The Daily Ledger's PDF / Excel: the Daily Cash Book over the ledger's window and branch. */
export function financeLedgerExportRequest(q: { from?: string; to?: string; branchId?: string }, format: 'pdf' | 'excel'): ServerFileRequest {
  return financeReportExportRequest({ type: 'daily_cash_book', from: q.from, to: q.to, branchId: q.branchId }, format);
}
