export interface ClosingStockHistogramBar {
  date: string;
  value: number;
}

/**
 * TODO: design lines 974-979 ("CLOSING STOCK HISTOGRAM") want a per-product
 * "days this product had closing stock" sparkline (two bars per day). No
 * endpoint or hook anywhere in `src/features/stock` or `src/features/closing`
 * currently serves a per-product daily balance series — checked
 * `useStockApi`/`useBranchClosingApi`/`BranchStockHistoryRow` (branch-level,
 * not per-product) before stubbing this. Wire this up to a real
 * `GET /api/stock-history?productId=` (or similar, once the backend adds one)
 * instead of fabricating data — returning an empty map keeps
 * `ClosingStockHistogram` rendering its empty state rather than crashing.
 */
export function useClosingStockHistogram(_productIds: string[]): {
  data: Record<string, ClosingStockHistogramBar[]>;
  isLoading: boolean;
} {
  return { data: {}, isLoading: false };
}
