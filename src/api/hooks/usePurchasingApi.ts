import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { purchasingService } from '../services';
import type {
  BillDecisionInput,
  BillInput,
  CreditInput,
  DeliveryInput,
  DemandInput,
  DemandUpdateInput,
  MessageReplyInput,
  MessageReviewInput,
  PaymentInput,
  PurchaseDemandQuery,
  PurchaseItemInput,
  QuotationDecisionInput,
  QuotationInput,
  ReceiptInput,
  SupplierInput,
  WhatsAppMessageQuery,
} from '../purchasingTypes';

/**
 * WhatsApp Purchasing (Production). Every mutation refreshes the whole
 * `purchasing` root — list, counts, the demand, its messages — on error as
 * well as success: a 409 means the demand moved under a stale screen, and the
 * screen must show where it is now.
 */

const DEMANDS_PAGE = 25;
const MESSAGES_PAGE = 50;
const CONVERSATIONS_PAGE = 30;

function refreshPurchasing(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.purchasingRoot() });
}

// ── Overview ────────────────────────────────────────────────────────────────

export function usePurchasingStatus() {
  return useQuery({ queryKey: queryKeys.purchasingStatus(), queryFn: purchasingService.getConnectionStatus });
}

export function usePurchasingSummary(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: queryKeys.purchasingSummary(), queryFn: purchasingService.getSummary, enabled: options?.enabled ?? true });
}

/** The demand list, 25 a page, for infinite scroll. */
export function usePurchaseDemandPages(query: Omit<PurchaseDemandQuery, 'limit' | 'offset'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.purchasingDemandPages(query),
    queryFn: ({ pageParam }) => purchasingService.listDemands({ ...query, limit: DEMANDS_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.demands.length, 0);
      return loaded < lastPage.total && lastPage.demands.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

/** One page of demands — the Unmatched queue's "which demand" chooser. */
export function usePurchaseDemands(query: PurchaseDemandQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.purchasingDemands(query),
    queryFn: () => purchasingService.listDemands(query),
    enabled: options?.enabled ?? true,
  });
}

export function usePurchaseDemand(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.purchasingDemand(id ?? ''),
    queryFn: () => purchasingService.getDemand(id!),
    enabled: !!id,
  });
}

// ── Suppliers and catalog ───────────────────────────────────────────────────

export function usePurchaseSuppliers(search: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.purchasingSuppliers(search),
    queryFn: () => purchasingService.listSuppliers({ search: search || undefined, limit: 100 }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** One supplier's billed / paid / outstanding and credit position. */
export function usePurchaseSupplierBalance(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.purchasingSupplierBalance(supplierId ?? ''),
    queryFn: async () => (await purchasingService.getSupplierBalances(supplierId!))[0] ?? null,
    enabled: !!supplierId,
  });
}

export function usePurchaseItems(search: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.purchasingItems(search),
    queryFn: () => purchasingService.listItems({ search: search || undefined }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useCreatePurchaseSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => purchasingService.createSupplier(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchasing', 'suppliers'] }),
  });
}

export function useCreatePurchaseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseItemInput) => purchasingService.createItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchasing', 'items'] }),
  });
}

// ── Demand lifecycle ────────────────────────────────────────────────────────

export function useCreatePurchaseDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: DemandInput; idempotencyKey: string }) => purchasingService.createDemand(input, idempotencyKey),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useUpdatePurchaseDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DemandUpdateInput }) => purchasingService.updateDemand(id, input),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useVerifyPurchaseDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) => purchasingService.verifyDemand(id, revision),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useSendPurchaseDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, idempotencyKey }: { id: string; revision: number; idempotencyKey: string }) =>
      purchasingService.sendDemand(id, revision, idempotencyKey),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useResendPurchaseLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: string }) => purchasingService.resendLink(id, idempotencyKey),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useCancelPurchaseDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => purchasingService.cancelDemand(id, reason),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useAddPurchaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => purchasingService.addNote(id, note),
    onSettled: (_d, _e, { id }) => queryClient.invalidateQueries({ queryKey: queryKeys.purchasingDemand(id) }),
  });
}

export function useEnterPurchaseQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: QuotationInput; idempotencyKey: string }) =>
      purchasingService.enterQuotation(id, input, idempotencyKey),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useDecidePurchaseQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quotationId, input }: { id: string; quotationId: string; input: QuotationDecisionInput }) =>
      purchasingService.decideQuotation(id, quotationId, input),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useEnterPurchaseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: BillInput; idempotencyKey: string }) =>
      purchasingService.enterBill(id, input, idempotencyKey),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useDecidePurchaseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, billId, input }: { id: string; billId: string; input: BillDecisionInput }) => purchasingService.decideBill(id, billId, input),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useSavePurchaseDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeliveryInput }) => purchasingService.saveDelivery(id, input),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useRecordPurchaseReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: ReceiptInput; idempotencyKey: string }) =>
      purchasingService.recordReceipt(id, input, idempotencyKey),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchasing', 'items'] });
      return refreshPurchasing(queryClient);
    },
  });
}

export function useRecordSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: PaymentInput; idempotencyKey: string }) =>
      purchasingService.recordPayment(id, input, idempotencyKey),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplierPaymentsRoot() });
      return refreshPurchasing(queryClient);
    },
  });
}

export function useRequestSupplierCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: CreditInput; idempotencyKey: string }) =>
      purchasingService.requestCredit(id, input, idempotencyKey),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplierPaymentsRoot() });
      return refreshPurchasing(queryClient);
    },
  });
}

// ── Conversations and messages ──────────────────────────────────────────────

export function usePurchaseConversationPages(search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.purchasingConversations(search),
    queryFn: ({ pageParam }) => purchasingService.listConversations({ search: search || undefined, limit: CONVERSATIONS_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.conversations.length, 0);
      return loaded < lastPage.total && lastPage.conversations.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

/** Messages, newest first, 50 a page. */
export function usePurchaseMessagePages(query: Omit<WhatsAppMessageQuery, 'limit' | 'offset'>, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: queryKeys.purchasingMessages(query),
    queryFn: ({ pageParam }) => purchasingService.listMessages({ ...query, limit: MESSAGES_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.messages.length, 0);
      return loaded < lastPage.total && lastPage.messages.length > 0 ? loaded : undefined;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useMarkPurchaseConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasingService.markConversationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchasing', 'conversations'] }),
  });
}

export function useReplyToPurchaseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: MessageReplyInput; idempotencyKey: string }) =>
      purchasingService.replyToConversation(id, input, idempotencyKey),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useRetryPurchaseMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => purchasingService.retryMessage(messageId),
    onSettled: () => refreshPurchasing(queryClient),
  });
}

export function useReviewPurchaseMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, input }: { messageId: string; input: MessageReviewInput }) => purchasingService.reviewMessage(messageId, input),
    onSettled: () => refreshPurchasing(queryClient),
  });
}
