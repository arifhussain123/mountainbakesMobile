import type { QueuedWrite } from '@/shared/offline';

/**
 * Endpoints whose queued payload carries its own `businessDate` field — sales,
 * expenses and cash deposits all stamp it before enqueueing (see each
 * service's `create*` function). `/stock/return` does not (the server
 * defaults it), so a queued return only counts toward TODAY's business date —
 * an offline return is always "right now" from the device's point of view.
 *
 * NOTE: as of this module's own Step 0 audit, sales/expenses/returns/cash-
 * deposits are not yet wired through the offline write queue at all — only
 * production-order creation is (`useCreateOrderForm`). This still counts
 * correctly for whichever of these eventually are, without needing to change
 * when they are.
 */
const DATED_ENDPOINTS = new Set(['/orders/pos', '/expenses', '/cash-transfers']);
const TODAY_ONLY_ENDPOINTS = new Set(['/stock/return', '/production-orders']);

/** Count of queued (not yet synced) writes that belong to this business date — never mixed into the server-read closing figures. */
export function countUnsyncedForDate(writes: QueuedWrite[], date: string, todayBusinessDate: string): number {
  return writes.filter((write) => {
    if (write.status !== 'pending' && write.status !== 'syncing' && write.status !== 'failed') return false;
    if (DATED_ENDPOINTS.has(write.endpoint)) {
      const payload = write.payload as { businessDate?: unknown } | null;
      return typeof payload?.businessDate === 'string' && payload.businessDate === date;
    }
    if (TODAY_ONLY_ENDPOINTS.has(write.endpoint)) {
      return date === todayBusinessDate;
    }
    return false;
  }).length;
}
