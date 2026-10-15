import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { discountService } from '../services';
import type { ListBranchDiscountsParams } from '../services/discountService';
import type { CreateBranchDiscountInput } from '../types';

export function useBranchDiscounts(params?: ListBranchDiscountsParams) {
  return useQuery({
    queryKey: queryKeys.branchDiscounts(params),
    queryFn: () => discountService.listBranchDiscounts(params),
  });
}

function invalidateDiscounts(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['branchDiscounts'] });
}

export function useCreateBranchDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateBranchDiscountInput, 'businessDate'>) => discountService.createBranchDiscount(input),
    onSuccess: () => invalidateDiscounts(queryClient),
  });
}

export function useReviseBranchDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { amount: number; reason: string } }) =>
      discountService.reviseBranchDiscount(id, input),
    onSuccess: () => invalidateDiscounts(queryClient),
  });
}

export function useWithdrawBranchDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => discountService.withdrawBranchDiscount(id),
    onSuccess: () => invalidateDiscounts(queryClient),
  });
}
