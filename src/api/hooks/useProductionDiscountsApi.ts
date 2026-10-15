import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useReviewProductionDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewBranchDiscountInput }) => productionDiscountService.reviewProductionDiscount(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionDiscounts'] });
    },
  });
}
