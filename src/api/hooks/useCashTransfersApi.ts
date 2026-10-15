import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useCreateCashTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreateCashTransferInput, 'businessDate'>; idempotencyKey: string }) =>
      cashTransferService.createCashTransfer(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cashTransfers'] });
    },
  });
}
