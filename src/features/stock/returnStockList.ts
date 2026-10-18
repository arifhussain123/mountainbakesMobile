import { addDays, format, parseISO } from 'date-fns';
import type { BranchReturnStatus } from '@/api';

/**
 * Return Stock list (mountainbakesBranch.html screen 13): the window, sort,
 * paging and query rules the screen sends to `GET /api/stock/returns`.
 *
 * Everything that narrows or orders the list goes to the server — the window
 * (`from`/`to` on business date), product, status, search, sort and the page
 * — because the list is paged there: filtering or sorting only the page in
 * hand would misstate both the order and the "Showing x of N" count.
 */

export type ReturnWindowKey = 'month' | '7' | '30' | '90';

export const RETURN_WINDOWS: { key: ReturnWindowKey; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
];

/** The mock's "Last · 90 days" — the window the screen has always shown. */
export const DEFAULT_RETURN_WINDOW: ReturnWindowKey = '90';

/** `{ from, to }` business dates, inclusive, for a window ending `today` ('YYYY-MM-DD'). */
export function resolveReturnWindow(key: ReturnWindowKey, today: string): { from: string; to: string } {
  if (key === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  return { from: format(addDays(parseISO(today), -(Number(key) - 1)), 'yyyy-MM-dd'), to: today };
}

/** "Last · 90 days" / "This month" — the window pill's own wording. */
export function returnWindowLabel(key: ReturnWindowKey): string {
  return key === 'month' ? 'This month' : `Last · ${key} days`;
}

/** Server sort columns `GET /api/stock/returns` accepts (`BRANCH_RETURN_SORTABLE_COLUMNS`). */
export type ReturnSortBy = 'createdAt' | 'date' | 'reviewedAt' | 'productName' | 'qty' | 'status';

export interface ReturnSortOption {
  key: string;
  label: string;
  sortBy: ReturnSortBy;
  sortDir: 'asc' | 'desc';
}

export const RETURN_SORTS: ReturnSortOption[] = [
  { key: 'newest', label: 'Newest first', sortBy: 'createdAt', sortDir: 'desc' },
  { key: 'oldest', label: 'Oldest first', sortBy: 'createdAt', sortDir: 'asc' },
  { key: 'qtyDesc', label: 'Quantity, high to low', sortBy: 'qty', sortDir: 'desc' },
  { key: 'qtyAsc', label: 'Quantity, low to high', sortBy: 'qty', sortDir: 'asc' },
  { key: 'productAsc', label: 'Product, A–Z', sortBy: 'productName', sortDir: 'asc' },
  { key: 'productDesc', label: 'Product, Z–A', sortBy: 'productName', sortDir: 'desc' },
  { key: 'reviewed', label: 'Recently reviewed', sortBy: 'reviewedAt', sortDir: 'desc' },
  { key: 'status', label: 'Status', sortBy: 'status', sortDir: 'asc' },
];

export const DEFAULT_RETURN_SORT = RETURN_SORTS[0]!;

export const RETURN_STATUS_FILTERS: { value: BranchReturnStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'returned', label: 'Sent Back' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export const RETURN_STOCK_PAGE_SIZE = 20;

export interface ReturnStockQuery {
  window: ReturnWindowKey;
  today: string;
  productId: string | null;
  status: BranchReturnStatus | 'all';
  search: string;
  sort: ReturnSortOption;
  page: number;
}

/** The exact params for `GET /api/stock/returns` — the cache key is built from these too. */
export function buildReturnStockParams(q: ReturnStockQuery) {
  const { from, to } = resolveReturnWindow(q.window, q.today);
  const search = q.search.trim();
  return {
    from,
    to,
    ...(q.productId ? { productId: q.productId } : {}),
    ...(q.status !== 'all' ? { status: q.status } : {}),
    ...(search ? { search } : {}),
    sortBy: q.sort.sortBy,
    sortDir: q.sort.sortDir,
    limit: RETURN_STOCK_PAGE_SIZE,
    offset: (Math.max(1, q.page) - 1) * RETURN_STOCK_PAGE_SIZE,
  };
}

export function pageCount(total: number, pageSize = RETURN_STOCK_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** "Showing 21–40 of 57" / "No returns" — the mock's count line under the list. */
export function describeShowing(page: number, total: number, pageSize = RETURN_STOCK_PAGE_SIZE): string {
  if (total <= 0) return 'No returns';
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `Showing ${start}–${end} of ${total}`;
}

/**
 * The mock's pager: first, last, and the current page with one either side,
 * gaps marked `'…'` — e.g. 1 … 4 5 6 … 12. Never more than seven slots, so it
 * fits a small phone.
 */
export function pagerSlots(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const slots: (number | '…')[] = [1];
  const lo = Math.max(2, Math.min(page - 1, pages - 4));
  const hi = Math.min(pages - 1, Math.max(page + 1, 5));
  if (lo > 2) slots.push('…');
  for (let p = lo; p <= hi; p++) slots.push(p);
  if (hi < pages - 1) slots.push('…');
  slots.push(pages);
  return slots;
}

/** The short reference the card and detail show — same 8-char uppercase id as Production's cards. */
export function shortReturnRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
