import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessDate } from '../businessDate';
import { queryKeys } from '../queryKeys';
import { productionReturnService } from '../services';
import type { ListProductionReturnsParams } from '../services/productionReturnService';
import type { CreateProductionReturnInput, ReviewProductionReturnInput } from '../types';

export function useProductionReturns(params?: ListProductionReturnsParams) {
  return useQuery({
    queryKey: queryKeys.productionReturns(params),
    queryFn: () => productionReturnService.listProductionReturns(params),
  });
}

/**
 * Production's month-to-date returns summary: every branch plus an overall
 * total, or one branch when `branchId` is set. Under ['productionReturns'], so a
 * create or a review refreshes it with the queue.
 */
export function useProductionReturnsSummary(branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.productionReturnsSummary(branchId, getBusinessDate()),
    queryFn: () => productionReturnService.getProductionReturnsSummary(branchId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateProductionReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductionReturnInput) => productionReturnService.createProductionReturn(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionReturns'] });
    },
  });
}

export function useReviewProductionReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewProductionReturnInput }) => productionReturnService.reviewProductionReturn(id, input),
    onSuccess: () => {
      // A review never moves production stock (only Branch Return Stock and,
      // sometimes, the branch's own balance — neither cached in this session),
      // so this queue is the only thing that needs refetching.
      void queryClient.invalidateQueries({ queryKey: ['productionReturns'] });
    },
  });
}
