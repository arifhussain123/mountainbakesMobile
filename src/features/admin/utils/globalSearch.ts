// Direct file import, not the `@/navigation` barrel (it pulls in every screen — see notifications/deepLinks.ts).
import { Routes } from '@/navigation/routes';
import type { GlobalSearchResult } from '@/api/services/adminSearchAndFilesService';

/**
 * Global Search — where each result goes on the phone. The server answers with
 * the WEB route (`href`); this maps it to the Super Admin screen that shows the
 * same record, or explains why there is none. Pure, so it is unit-tested.
 *
 * - `/products/<id>` (a product) and `/products` (a packing material) → the
 *   Products screen, which holds both catalogues as the web page does.
 * - `/customers/<id>` → the Customers screen.
 * - `/orders/<id>` is a COUNTER order (the `orders` table: order number and
 *   customer). The web's Orders page now lists production demands instead, and
 *   the phone's Super Admin app has no screen for a counter order, so the row
 *   is shown but cannot be opened.
 *
 * The web has no `/products/<id>` or `/customers/<id>` page either — its links
 * land on the list — so opening the list screen is the same destination.
 */

export type GlobalSearchScreen = typeof Routes.SUPER_ADMIN_PRODUCTS | typeof Routes.SUPER_ADMIN_CUSTOMERS;

export type GlobalSearchTarget = { kind: 'screen'; screen: GlobalSearchScreen } | { kind: 'unavailable'; note: string };

export const COUNTER_ORDER_NOTE = 'Counter orders have no Super Admin screen on the phone.';
const UNKNOWN_NOTE = 'This result has no screen on the phone.';

export function globalSearchTarget(result: Pick<GlobalSearchResult, 'type' | 'href'>): GlobalSearchTarget {
  const path = result.href.split(/[?#]/)[0] ?? '';
  if (result.type === 'product' || result.type === 'packingMaterial' || path === '/products' || path.startsWith('/products/')) {
    return { kind: 'screen', screen: Routes.SUPER_ADMIN_PRODUCTS };
  }
  if (result.type === 'customer' || path === '/customers' || path.startsWith('/customers/')) {
    return { kind: 'screen', screen: Routes.SUPER_ADMIN_CUSTOMERS };
  }
  if (result.type === 'order' || path.startsWith('/orders/')) {
    return { kind: 'unavailable', note: COUNTER_ORDER_NOTE };
  }
  return { kind: 'unavailable', note: UNKNOWN_NOTE };
}

/** The web's empty-list line for the current state — `null` once there are results to show. */
export function globalSearchEmptyText(term: string, opts: { loading: boolean; resultCount: number }, minChars = 2): string | null {
  const q = term.trim();
  if (q.length < minChars) return `Type at least ${minChars} characters to search`;
  if (opts.loading) return 'Searching…';
  if (opts.resultCount === 0) return `No results found for "${q}"`;
  return null;
}
