import type { QueuedWrite } from '@/shared/offline';

/**
 * Endpoints whose queued payload carries its own `businessDate` field — sales,
 * expenses and cash deposits all stamp it before enqueueing (see each
 * service's `create*` function). A today-only endpoint counts toward TODAY's
 * business date unless its queued payload carries a `businessDate` — a queued
 * return (`/stock/return`, Return Items' offline path) does, and counts there.
 *
 * NOTE: as of this module's own Step 0 audit, sales/expenses/cash-deposits
 * are not yet wired through the offline write queue at all — production-order
 * creation (`useCreateOrderForm`) and branch returns (`useReturnItemsForm`)
 * are. This still counts
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
      // A queued Return Items save stamps the day it was made (it can wait
      // overnight for a signal) — count it there; an unstamped one is "now".
      const payload = write.payload as { businessDate?: unknown } | null;
      if (typeof payload?.businessDate === 'string') return payload.businessDate === date;
      return date === todayBusinessDate;
    }
    return false;
  }).length;
}
