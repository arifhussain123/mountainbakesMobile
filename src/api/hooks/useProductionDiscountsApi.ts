import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessDate } from '../businessDate';
import { queryKeys } from '../queryKeys';
import { productionDiscountService } from '../services';
import type { ListProductionDiscountsParams } from '../services/productionDiscountService';
import type { ReviewBranchDiscountInput } from '../types';

export function useProductionDiscounts(params?: ListProductionDiscountsParams) {
  return useQuery({
    queryKey: queryKeys.productionDiscounts(params),
    queryFn: () => productionDiscountService.listProductionDiscounts(params),
  });
}

/** Every active branch's approved discounts this business month (or one branch), summed on the server. */
export function useProductionDiscountSummary(branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.productionDiscountSummary(branchId, getBusinessDate()),
    queryFn: () => productionDiscountService.getProductionDiscountSummary(branchId),
    placeholderData: keepPreviousData,
  });
}

export function useReviewProductionDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewBranchDiscountInput }) => productionDiscountService.reviewProductionDiscount(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionDiscounts'] });
    },
  });
}
