import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { productionOrderService } from '../services';
import type { CreateProductionOrderInput, ReviewProductionOrderInput } from '../types';

export function useProductionOrders() {
  return useQuery({
    queryKey: queryKeys.productionOrders(),
    queryFn: () => productionOrderService.listProductionOrders(),
  });
}

export function useCreateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreateProductionOrderInput, 'businessDate'>; idempotencyKey: string }) =>
      productionOrderService.createProductionOrder(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
    },
  });
}

export function useReviewProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewProductionOrderInput }) =>
      productionOrderService.reviewProductionOrder(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
    },
  });
}

export function useFinalApproveProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productionOrderService.finalApproveProductionOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
    },
  });
}

/** mountainbakesProduction.html screen 03 — "Previous Order Balance" + "Returned since last order". */
export function usePreviousOrderBalance(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.productionOrderPreviousBalance(orderId ?? ''),
    queryFn: () => productionOrderService.getPreviousOrderBalance(orderId!),
    enabled: !!orderId,
  });
}
