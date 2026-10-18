import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessDate } from '../businessDate';
import { queryKeys } from '../queryKeys';
import { discountService } from '../services';
import type { ListBranchDiscountsPageParams, ListBranchDiscountsParams } from '../services/discountService';
import type { CreateBranchDiscountInput, ReviseBranchDiscountInput } from '../types';

export function useBranchDiscounts(params?: ListBranchDiscountsParams) {
  return useQuery({
    queryKey: queryKeys.branchDiscounts(params),
    queryFn: () => discountService.listBranchDiscounts(params),
  });
}

/** The branch's own discount claims this business month, summed on the server. */
export function useBranchDiscountSummary() {
  return useQuery({
    queryKey: queryKeys.branchDiscountSummary(getBusinessDate()),
    queryFn: () => discountService.getBranchDiscountSummary(),
    placeholderData: keepPreviousData,
  });
}

const PAGE_SIZE = 20;

/** Infinite-scroll feed for the Discounts list — see `ListBranchDiscountsPageParams`'s doc comment for the explicit from/to override. */
export function useBranchDiscountsList(params: Omit<ListBranchDiscountsPageParams, 'limit' | 'offset'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.branchDiscountsList({ from: params.from, to: params.to, status: params.status, search: params.search, sortBy: params.sortBy, sortDir: params.sortDir }),
    queryFn: ({ pageParam }) => discountService.listBranchDiscountsPage({ ...params, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, p) => sum + p.discounts.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

function invalidateDiscounts(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['branchDiscounts'] });
  void queryClient.invalidateQueries({ queryKey: ['branchDiscountsList'] });
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
    mutationFn: ({ id, input }: { id: string; input: ReviseBranchDiscountInput }) => discountService.reviseBranchDiscount(id, input),
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
