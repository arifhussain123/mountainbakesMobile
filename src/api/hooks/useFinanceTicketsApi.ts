import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financeTicketsService } from '../services';
import type { CreateFinanceTicketInput, FinanceTicketMessageInput, FinanceTicketQuery, RequestReopenFinanceTicketInput } from '../types';

export function useFinanceTicketStats() {
  return useQuery({
    queryKey: queryKeys.financeTicketStats(),
    queryFn: () => financeTicketsService.getFinanceTicketStats(),
  });
}

export function useFinanceTickets(query: FinanceTicketQuery) {
  return useQuery({
    queryKey: queryKeys.financeTickets(query),
    queryFn: () => financeTicketsService.listFinanceTickets(query),
  });
}

export function useFinanceTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.financeTicket(id),
    queryFn: () => financeTicketsService.getFinanceTicket(id),
    enabled: !!id,
  });
}

export function useLookupFinanceTicketReference() {
  return useMutation({
    mutationFn: (ref: string) => financeTicketsService.lookupFinanceTicketReference(ref),
  });
}

function invalidateFinanceTickets(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ['financeTickets'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.financeTicketStats() });
  if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.financeTicket(id) });
}

export function useCreateFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateFinanceTicketInput; idempotencyKey?: string }) =>
      financeTicketsService.createFinanceTicket(input, idempotencyKey),
    onSuccess: () => invalidateFinanceTickets(queryClient),
  });
}

export function useEditFinanceDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: CreateFinanceTicketInput; idempotencyKey?: string }) =>
      financeTicketsService.editFinanceDraft(id, input, idempotencyKey),
    onSuccess: (_data, { id }) => invalidateFinanceTickets(queryClient, id),
  });
}

export function useSubmitFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) => financeTicketsService.submitFinanceTicket(id, idempotencyKey),
    onSuccess: (_data, { id }) => invalidateFinanceTickets(queryClient, id),
  });
}

export function usePostFinanceTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: FinanceTicketMessageInput; idempotencyKey?: string }) =>
      financeTicketsService.postFinanceTicketMessage(id, input, idempotencyKey),
    onSuccess: (_data, { id }) => invalidateFinanceTickets(queryClient, id),
  });
}

export function useRequestReopenFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: RequestReopenFinanceTicketInput; idempotencyKey?: string }) =>
      financeTicketsService.requestReopenFinanceTicket(id, input, idempotencyKey),
    onSuccess: (_data, { id }) => invalidateFinanceTickets(queryClient, id),
  });
}
