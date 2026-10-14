import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { salesService } from '../services';
import type { ListOrdersParams } from '../services/salesService';
import type { CreatePosSaleInput } from '../types';

export function useOrders(params?: ListOrdersParams) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => salesService.listOrders(params),
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
