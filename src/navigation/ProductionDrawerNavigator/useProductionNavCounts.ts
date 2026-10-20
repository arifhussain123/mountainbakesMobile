import {
  useProductionDiscountsAwaitingCount,
  useProductionOrders,
  useProductionReturnsAwaitingCount,
  useProductionStock,
  usePurchasingSummary,
} from '@/api';

/**
 * Keeps the four queries behind Production's badges (`computeProductionBadges`)
 * in the cache from launch, so Orders/Stock/Returns/Discounts show their counts
 * before each screen has been opened. Orders and Stock are the very queries
 * those tabs render, so this costs them nothing extra; Returns and Discounts
 * ask the server for a count only (one row, its `total`).
 */
export function useProductionNavCounts(): void {
  useProductionOrders();
  useProductionStock();
  useProductionReturnsAwaitingCount();
  useProductionDiscountsAwaitingCount();
  // WhatsApp Purchasing's badge: its tab counts, the same response its screen shows.
  usePurchasingSummary();
}
