import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supplierPaymentsService } from '../services';
import type { CreditDecisionInput, SupplierCreditQuery, SupplierPaymentQuery } from '../purchasingTypes';

/**
 * Finance → Supplier Payments. A decision refreshes the Finance lists and the
 * Production side's purchasing cache (a demand's payment status moves when
 * Finance posts), on error too — a 409 is someone else's decision to show.
 */

const PAGE = 30;

function refresh(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.purchasingRoot() });
  return queryClient.invalidateQueries({ queryKey: queryKeys.supplierPaymentsRoot() });
}

export function useSupplierPaymentPages(query: Omit<SupplierPaymentQuery, 'limit' | 'offset'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.supplierPayments(query),
    queryFn: ({ pageParam }) => supplierPaymentsService.listPayments({ ...query, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.payments.length, 0);
      return loaded < lastPage.total && lastPage.payments.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

/** Count only — the drawer badge for payments waiting on Finance. */
export function usePendingSupplierPaymentCount() {
  return useQuery({
    queryKey: queryKeys.supplierPayments({ status: 'pending_approval', limit: 1 }),
    queryFn: () => supplierPaymentsService.listPayments({ status: 'pending_approval', limit: 1 }),
  });
}

export function useSupplierCreditPages(query: Omit<SupplierCreditQuery, 'limit' | 'offset'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.supplierCredits(query),
    queryFn: ({ pageParam }) => supplierPaymentsService.listCredits({ ...query, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.credits.length, 0);
      return loaded < lastPage.total && lastPage.credits.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

export function useSupplierPaymentBalances(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.supplierPaymentBalances(),
    queryFn: () => supplierPaymentsService.getBalances(),
    enabled: options?.enabled ?? true,
  });
}

export function useSupplierPaymentHeads(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.supplierPaymentHeads(),
    queryFn: supplierPaymentsService.getHeads,
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60_000,
  });
}

export function useApproveSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ledgerHeadId }: { id: string; ledgerHeadId: string | null }) => supplierPaymentsService.approvePayment(id, { ledgerHeadId }),
    onSettled: () => refresh(queryClient),
  });
}

export function useRejectSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => supplierPaymentsService.rejectPayment(id, reason),
    onSettled: () => refresh(queryClient),
  });
}

export function useReverseSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => supplierPaymentsService.reversePayment(id, reason),
    onSettled: () => refresh(queryClient),
  });
}

export function useDecideSupplierCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreditDecisionInput }) => supplierPaymentsService.decideCredit(id, input),
    onSettled: () => refresh(queryClient),
  });
}
