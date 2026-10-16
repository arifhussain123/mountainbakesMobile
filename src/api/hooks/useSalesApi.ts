import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { salesService } from '../services';
import type { ListOrdersParams, ListSalesDataParams } from '../services/salesService';
import type { CreatePosSaleInput } from '../types';

export function useOrders(params?: ListOrdersParams) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => salesService.listOrders(params),
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: queryKeys.order(id ?? ''),
    queryFn: () => salesService.getOrder(id!),
    enabled: !!id,
  });
}

/** Infinite-scroll feed for the Sales list — see `ListSalesDataParams`/`DataEnginePage` for why this reads `/api/data/sales` rather than `/api/orders`. */
export function useSalesData(params: Omit<ListSalesDataParams, 'page' | 'pageSize'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.salesData({ businessDate: params.businessDate, search: params.search, paymentMethod: params.paymentMethod, sort: params.sort }),
    queryFn: ({ pageParam }) => salesService.listSalesData({ ...params, page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
  });
}

export function useCreatePosSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreatePosSaleInput, 'businessDate'>; idempotencyKey: string }) =>
      salesService.createPosSale(input, idempotencyKey),
    onSuccess: () => {
      // A completed sale moves stock and every revenue figure on the dashboard —
      // invalidate broadly rather than guessing which date/period was showing.
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['stockHistoryDay'] });
      void queryClient.invalidateQueries({ queryKey: ['stockHistorySeries'] });
      void queryClient.invalidateQueries({ queryKey: ['reportSummary'] });
      void queryClient.invalidateQueries({ queryKey: ['salesAnalytics'] });
    },
  });
}
