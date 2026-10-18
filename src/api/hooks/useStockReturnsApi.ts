import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessDate } from '../businessDate';
import { queryKeys } from '../queryKeys';
import { stockReturnService } from '../services';
import type { ListBranchReturnsParams } from '../services/stockReturnService';
import type { CreateBranchReturnInput } from '../types';

export function useBranchReturns(params?: ListBranchReturnsParams) {
  return useQuery({
    queryKey: queryKeys.branchReturns(params),
    queryFn: () => stockReturnService.listBranchReturns(params),
  });
}

/**
 * The branch's own returns this business month to date, by status — summed on
 * the server, which also picks the branch from the token. Refreshed by every
 * return write here (`invalidateReturns` covers the ['branchReturns'] prefix).
 */
export function useBranchReturnsSummary() {
  return useQuery({
    queryKey: queryKeys.branchReturnsSummary(getBusinessDate()),
    queryFn: () => stockReturnService.getBranchReturnsSummary(),
  });
}

function invalidateReturns(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['stock'] });
  void queryClient.invalidateQueries({ queryKey: ['branchReturns'] });
}

export function useCreateBranchReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreateBranchReturnInput, 'businessDate'>; idempotencyKey: string }) =>
      stockReturnService.createBranchReturn(input, idempotencyKey),
    onSuccess: () => invalidateReturns(queryClient),
  });
}

export function useReviseBranchReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { qty: number; reason?: string } }) =>
      stockReturnService.reviseBranchReturn(id, input),
    onSuccess: () => invalidateReturns(queryClient),
  });
}

export function useWithdrawBranchReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stockReturnService.withdrawBranchReturn(id),
    onSuccess: () => invalidateReturns(queryClient),
  });
}
