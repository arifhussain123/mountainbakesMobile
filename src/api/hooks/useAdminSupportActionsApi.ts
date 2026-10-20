import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminSupportActionsService from '../services/adminSupportActionsService';
import type { CorrectFinanceRecordInput, FinanceTicketStatusInput, SupportSaleItemInput } from '../services/adminSupportActionsService';
import type { PaymentMethod } from '../types';

/** Active products for the sale / demand line editors (web `/api/products?isActive=true`). */
export function useSupportProducts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.supportProducts(),
    queryFn: () => adminSupportActionsService.listActiveProducts(),
    enabled,
  });
}

/** The queue, its counts and every live reference — what each ops action can move. */
function invalidateQueue(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.supportStats() });
  void queryClient.invalidateQueries({ queryKey: ['supportLiveReference'] });
}

/**
 * A correction also moves the record behind the query: stock (branch ledger
 * and the production pool), the sale / demand, or the deposit and the Daily
 * Ledger. Invalidated by root so every screen that reads them refetches.
 */
function invalidateCorrected(queryClient: QueryClient) {
  invalidateQueue(queryClient);
  for (const root of [
    'stock',
    'stockHistoryDay',
    'productionStock',
    'productionCurrentStock',
    'productionOrders',
    'orders',
    'salesData',
    'reportSummary',
    'expenses',
    'cashTransfers',
    'financeCashTransfers',
    'ledgerPages',
    'ledgerSummary',
    'pendingApprovals',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [root] });
  }
}

export function useEditSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message, resolutionNote }: { id: string; message: string; resolutionNote: string }) =>
      adminSupportActionsService.editSupportTicket(id, { message, resolutionNote }),
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useResolveSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolutionNote }: { id: string; status: 'resolved' | 'rejected'; resolutionNote: string }) =>
      adminSupportActionsService.resolveSupportTicket(id, { status, resolutionNote }),
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useChangeSupportFigures() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, edits, note }: { id: string; edits: Record<string, string | number>; note: string }) =>
      adminSupportActionsService.changeSupportFigures(id, { edits, note }),
    onSuccess: () => invalidateCorrected(queryClient),
  });
}

export function useEditSupportSaleItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; items: SupportSaleItemInput[]; paymentMethod?: PaymentMethod; note: string }) =>
      adminSupportActionsService.editSupportSaleItems(id, input),
    onSuccess: () => invalidateCorrected(queryClient),
  });
}

export function useEditSupportDemandItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      items: { productId: string; productName: string; qty: number; approvedQty: number }[];
      reason: string;
      note: string;
    }) => adminSupportActionsService.editSupportDemandItems(id, input),
    onSuccess: () => invalidateCorrected(queryClient),
  });
}

export function useDeleteSupportDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; reason: string; confirmDemandNumber: string; note: string }) =>
      adminSupportActionsService.deleteSupportDemand(id, input),
    onSuccess: () => invalidateCorrected(queryClient),
  });
}

export function useDeleteSupportCashDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; reason: string; confirmTransferNo: string; note: string }) =>
      adminSupportActionsService.deleteSupportCashDeposit(id, input),
    onSuccess: () => invalidateCorrected(queryClient),
  });
}

export function useArchiveSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSupportActionsService.archiveSupportTicket(id),
    onSuccess: () => invalidateQueue(queryClient),
  });
}

// ─── Finance queries ────────────────────────────────────────────────────────

/** The finance queue (list, paged list, stats) and the one query. */
function invalidateFinanceQuery(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: ['financeTickets'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.financeTicketStats() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.financeTicket(id) });
}

export function useFeedFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode, body }: { id: string; mode: 'edit' | 'amend' | 'recreate'; body: Record<string, unknown> }) =>
      adminSupportActionsService.feedFinanceTicket(id, mode, body),
    onSuccess: (_data, { id }) => invalidateFinanceQuery(queryClient, id),
  });
}

export function useRestoreFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminSupportActionsService.restoreFinanceTicket(id, reason),
    onSuccess: (_data, { id }) => invalidateFinanceQuery(queryClient, id),
  });
}

export function useSaveFinanceTicketResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => adminSupportActionsService.saveFinanceTicketResponse(id, body),
    onSuccess: (_data, { id }) => invalidateFinanceQuery(queryClient, id),
  });
}

export function useSetFinanceTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FinanceTicketStatusInput }) => adminSupportActionsService.setFinanceTicketStatus(id, input),
    onSuccess: (_data, { id }) => invalidateFinanceQuery(queryClient, id),
  });
}

export function useAssignFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string | null }) => adminSupportActionsService.assignFinanceTicket(id, assignedTo),
    onSuccess: (_data, { id }) => invalidateFinanceQuery(queryClient, id),
  });
}

export function useDeleteFinanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminSupportActionsService.deleteFinanceTicket(id, reason),
    onSuccess: (_data, { id }) => invalidateFinanceQuery(queryClient, id),
  });
}

/** A record correction or deletion moves the books too — the ledger, the deposit lists and the finance dashboards. */
function invalidateFinanceRecord(queryClient: QueryClient, id: string) {
  invalidateFinanceQuery(queryClient, id);
  for (const root of [
    'ledgerPages',
    'ledgerPage',
    'ledgerSummary',
    'ledgerEntry',
    'pendingApprovals',
    'financeCashTransfers',
    'financeCashTransfer',
    'cashTransfers',
    'financeTransactions',
    'financeDashboard',
    'salaries',
    'advances',
    'partnerExpenses',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [root] });
  }
}

export function useCorrectFinanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CorrectFinanceRecordInput }) => adminSupportActionsService.correctFinanceRecord(id, input),
    onSuccess: (_data, { id }) => invalidateFinanceRecord(queryClient, id),
  });
}

export function useDeleteFinanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminSupportActionsService.deleteFinanceRecord(id, reason),
    onSuccess: (_data, { id }) => invalidateFinanceRecord(queryClient, id),
  });
}
