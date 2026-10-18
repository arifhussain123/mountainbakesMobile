import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessDate } from '../businessDate';
import { queryKeys } from '../queryKeys';
import { cashTransferService } from '../services';
import type { ListCashTransfersParams } from '../services/cashTransferService';
import type { CreateCashTransferInput } from '../types';

export function useCashTransfers(params?: ListCashTransfersParams) {
  return useQuery({
    queryKey: queryKeys.cashTransfers(params),
    queryFn: () => cashTransferService.listCashTransfers(params),
  });
}

/** This branch's transfers this business month, summed on the server — never follows the list's filters. */
export function useMonthlyCashTransferSummary() {
  return useQuery({
    queryKey: queryKeys.cashTransferMonthlySummary(getBusinessDate()),
    queryFn: () => cashTransferService.getMonthlyCashTransferSummary(),
    placeholderData: keepPreviousData,
  });
}

export function useCashTransferDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.cashTransfer(id ?? ''),
    queryFn: () => cashTransferService.getCashTransfer(id!),
    enabled: !!id,
  });
}

export function useCreateCashTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreateCashTransferInput, 'businessDate'>; idempotencyKey: string }) =>
      cashTransferService.createCashTransfer(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cashTransfers'] });
      void queryClient.invalidateQueries({ queryKey: ['cashTransferMonthlySummary'] });
    },
  });
}
