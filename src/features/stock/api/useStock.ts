import { useMemo } from 'react';
import { getBusinessDate, useProductionOrders, useStock as useStockRows } from '@/api';
import { computeWaitingDemand, withExpectedBalance, type StockRowWithDemand } from '../calculations';

export interface UseStockResult {
  date: string;
  rows: StockRowWithDemand[];
  isToday: boolean;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  isRefetching: boolean;
}

/**
 * Combines the existing `useStock(date)` (stock rows) with `useProductionOrders()`
 * to attach Waiting Demand / Expected Balance — a concept that does not exist
 * on the stock endpoint itself (see calculations.ts's doc comment). Waiting
 * demand is only meaningful for today's live balance, so it's zeroed out for
 * any other date rather than joined in, matching the web (which hides the
 * columns entirely on a past date).
 */
export function useStock(date?: string): UseStockResult {
  const targetDate = date ?? getBusinessDate();
  const isToday = targetDate === getBusinessDate();

  const stockQuery = useStockRows(date);
  const productionOrdersQuery = useProductionOrders();

  const rows = useMemo(() => {
    const stockRows = stockQuery.data?.rows ?? [];
    if (!isToday) return withExpectedBalance(stockRows, new Map());
    const waitingDemand = computeWaitingDemand(productionOrdersQuery.data?.orders ?? []);
    return withExpectedBalance(stockRows, waitingDemand);
  }, [stockQuery.data, productionOrdersQuery.data, isToday]);

  return {
    date: stockQuery.data?.date ?? targetDate,
    rows,
    isToday,
    isLoading: stockQuery.isLoading,
    error: stockQuery.error,
    refetch: () => void stockQuery.refetch(),
    isRefetching: stockQuery.isRefetching,
  };
}
