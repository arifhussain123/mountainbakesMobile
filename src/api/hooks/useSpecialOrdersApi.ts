import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { specialOrderService } from '../services';
import type { PrepareSpecialOrderInput } from '../types';

/** mountainbakesProduction.html screen 02 — "Special Orders" sub-section. */
export function useSpecialOrders() {
  return useQuery({
    queryKey: queryKeys.specialOrders(),
    queryFn: () => specialOrderService.listSpecialOrders(),
  });
}

export function usePrepareSpecialOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: PrepareSpecialOrderInput }) =>
      specialOrderService.prepareSpecialOrder(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.specialOrders() });
      void queryClient.invalidateQueries({ queryKey: ['productionStock'] });
    },
  });
}
