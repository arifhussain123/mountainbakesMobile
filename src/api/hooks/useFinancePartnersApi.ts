import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financePartnersService } from '../services';
import type {
  CreatePartnerExpenseInput,
  PartnerExpenseQuery,
  PartnerLedgerQuery,
  PartnerLedgerTransactionsQuery,
  UpdateFinancePartnerInput,
} from '../types';

export function useFinancePartners(includeInactive?: boolean) {
  return useQuery({
    queryKey: queryKeys.financePartners(includeInactive),
    queryFn: () => financePartnersService.listFinancePartners(includeInactive),
  });
}

export function useUpdateFinancePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: UpdateFinancePartnerInput; idempotencyKey?: string }) =>
      financePartnersService.updateFinancePartner(id, input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financePartners'] });
    },
  });
}

export function usePartnerShareSummary(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.partnerShareSummary(params),
    queryFn: () => financePartnersService.getPartnerShareSummary(params),
  });
}

export function usePartnerExpenses(query: PartnerExpenseQuery) {
  return useQuery({
    queryKey: queryKeys.partnerExpenses(query),
    queryFn: () => financePartnersService.listPartnerExpenses(query),
  });
}

function invalidatePartnerExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['partnerExpenses'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.partnerShareSummary(undefined) });
}

export function useCreatePartnerExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreatePartnerExpenseInput; idempotencyKey?: string }) =>
      financePartnersService.createPartnerExpense(input, idempotencyKey),
    onSuccess: () => invalidatePartnerExpenses(queryClient),
  });
}

export function useApprovePartnerExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes, idempotencyKey }: { id: string; notes?: string; idempotencyKey?: string }) =>
      financePartnersService.approvePartnerExpense(id, notes, idempotencyKey),
    onSuccess: () => invalidatePartnerExpenses(queryClient),
  });
}

export function useRejectPartnerExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey?: string }) =>
      financePartnersService.rejectPartnerExpense(id, reason, idempotencyKey),
    onSuccess: () => invalidatePartnerExpenses(queryClient),
  });
}

export function usePartnerLedger(query: PartnerLedgerQuery) {
  return useQuery({
    queryKey: queryKeys.partnerLedger(query),
    queryFn: () => financePartnersService.getPartnerLedger(query),
  });
}

export function usePartnerLedgerTransactions(query: PartnerLedgerTransactionsQuery) {
  return useQuery({
    queryKey: queryKeys.partnerLedgerTransactions(query),
    queryFn: () => financePartnersService.getPartnerLedgerTransactions(query),
  });
}
