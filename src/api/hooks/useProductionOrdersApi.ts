import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { productionOrderService } from '../services';
import type { ProductionOrdersDataQuery } from '../services/productionOrderService';
import type { CancelProductionOrderInput, CreateProductionOrderInput, ReviewProductionOrderInput, VerifyProductionOrderInput } from '../types';

export function useProductionOrders() {
  return useQuery({
    queryKey: queryKeys.productionOrders(),
    queryFn: () => productionOrderService.listProductionOrders(),
  });
}

/** One demand's complete record — the Order Detail screen, including a Verify Delivery flow. */
export function useProductionOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.productionOrder(id ?? ''),
    queryFn: () => productionOrderService.getProductionOrder(id!),
    enabled: !!id,
  });
}

/** The branch withdraws a demand it has just raised, while it is still 'pending'. */
export function useCancelProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CancelProductionOrderInput }) => productionOrderService.cancelProductionOrder(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
    },
  });
}

/** The branch confirms what physically arrived against an 'awaiting_verification' demand. */
export function useVerifyProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: VerifyProductionOrderInput; idempotencyKey: string }) =>
      productionOrderService.verifyProductionOrder(id, input, idempotencyKey),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.productionOrder(id) });
    },
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

/** Every demand, server-paged (`/data/productionOrders`) — the web Production Orders table, for infinite scroll. */
export function useProductionOrderPages(query: ProductionOrdersDataQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.productionOrdersData({ ...query }),
    queryFn: ({ pageParam }) => productionOrderService.listProductionOrdersData({ ...query, page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}
