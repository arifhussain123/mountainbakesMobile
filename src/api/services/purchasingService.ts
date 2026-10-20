import { apiClient } from '../client';
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
  PurchaseDelivery,
  PurchaseDemand,
  PurchaseDemandDetail,
  PurchaseDemandListResponse,
  PurchaseDemandQuery,
  PurchaseItem,
  PurchaseItemInput,
  PurchasingSummary,
  Quotation,
  QuotationDecisionInput,
  QuotationInput,
  ReceiptInput,
  ReceiptResult,
  Supplier,
  SupplierBalance,
  SupplierBill,
  SupplierCredit,
  SupplierInput,
  SupplierListResponse,
  SupplierPayment,
  VerificationResult,
  WhatsAppConnectionStatus,
  WhatsAppConversationListResponse,
  WhatsAppMessage,
  WhatsAppMessageListResponse,
  WhatsAppMessageQuery,
} from '../purchasingTypes';

/**
 * WhatsApp Purchasing — Production's endpoints (`backend/src/routes/purchasing.routes.ts`).
 *
 * The routes wrapped in `idempotent(...)` server-side take an
 * `idempotencyKey` here: create demand, send, resend link, enter quotation,
 * enter bill, receipt, payment, credit and reply. The caller mints it once per
 * submission and passes the same one on every retry of it.
 */
const BASE = '/purchasing';

const demandPath = (id: string) => `${BASE}/demands/${encodeURIComponent(id)}`;

// ── Overview ────────────────────────────────────────────────────────────────

export function getConnectionStatus(): Promise<WhatsAppConnectionStatus> {
  return apiClient.get<WhatsAppConnectionStatus>(`${BASE}/status`);
}

export function getSummary(): Promise<PurchasingSummary> {
  return apiClient.get<PurchasingSummary>(`${BASE}/summary`);
}

// ── Suppliers and catalog ───────────────────────────────────────────────────

export function listSuppliers(params: { search?: string; limit?: number; offset?: number }): Promise<SupplierListResponse> {
  return apiClient.get<SupplierListResponse>(`${BASE}/suppliers`, params);
}

export function getSupplierBalances(supplierId?: string): Promise<SupplierBalance[]> {
  return apiClient.get<SupplierBalance[]>(`${BASE}/suppliers/balances`, supplierId ? { supplierId } : undefined);
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return apiClient.post<Supplier>(`${BASE}/suppliers`, input);
}

export function listItems(params: { search?: string }): Promise<PurchaseItem[]> {
  return apiClient.get<PurchaseItem[]>(`${BASE}/items`, params);
}

export function createItem(input: PurchaseItemInput): Promise<PurchaseItem> {
  return apiClient.post<PurchaseItem>(`${BASE}/items`, input);
}

// ── Demands ─────────────────────────────────────────────────────────────────

export function listDemands(query: PurchaseDemandQuery): Promise<PurchaseDemandListResponse> {
  return apiClient.get<PurchaseDemandListResponse>(`${BASE}/demands`, query as Record<string, unknown>);
}

export function getDemand(id: string): Promise<PurchaseDemandDetail> {
  return apiClient.get<PurchaseDemandDetail>(demandPath(id));
}

/** A retried create (same `clientRequestId`) answers 200 with the first demand and `replayed: true`. */
export function createDemand(input: DemandInput, idempotencyKey: string): Promise<PurchaseDemand & { replayed: boolean }> {
  return apiClient.post<PurchaseDemand & { replayed: boolean }>(`${BASE}/demands`, input, { idempotencyKey });
}

export function updateDemand(id: string, input: DemandUpdateInput): Promise<PurchaseDemand> {
  return apiClient.put<PurchaseDemand>(demandPath(id), input);
}

export function verifyDemand(id: string, revision: number): Promise<VerificationResult> {
  return apiClient.post<VerificationResult>(`${demandPath(id)}/verify`, { revision });
}

export function sendDemand(id: string, revision: number, idempotencyKey: string): Promise<PurchaseDemand & { messageId: string }> {
  return apiClient.post<PurchaseDemand & { messageId: string }>(`${demandPath(id)}/send`, { revision }, { idempotencyKey });
}

export function resendLink(id: string, idempotencyKey: string): Promise<PurchaseDemand> {
  return apiClient.post<PurchaseDemand>(`${demandPath(id)}/resend-link`, {}, { idempotencyKey });
}

export function cancelDemand(id: string, reason: string): Promise<PurchaseDemand> {
  return apiClient.post<PurchaseDemand>(`${demandPath(id)}/cancel`, { reason });
}

export function addNote(id: string, note: string): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>(`${demandPath(id)}/notes`, { note });
}

// ── Quotation and bill ──────────────────────────────────────────────────────

export function enterQuotation(id: string, input: QuotationInput, idempotencyKey: string): Promise<Quotation> {
  return apiClient.post<Quotation>(`${demandPath(id)}/quotations`, input, { idempotencyKey });
}

export function decideQuotation(id: string, quotationId: string, input: QuotationDecisionInput): Promise<PurchaseDemand> {
  return apiClient.post<PurchaseDemand>(`${demandPath(id)}/quotations/${encodeURIComponent(quotationId)}/decision`, input);
}

export function enterBill(id: string, input: BillInput, idempotencyKey: string): Promise<SupplierBill> {
  return apiClient.post<SupplierBill>(`${demandPath(id)}/bills`, input, { idempotencyKey });
}

export function decideBill(id: string, billId: string, input: BillDecisionInput): Promise<PurchaseDemand> {
  return apiClient.post<PurchaseDemand>(`${demandPath(id)}/bills/${encodeURIComponent(billId)}/decision`, input);
}

// ── Delivery, receipt, payment, credit ──────────────────────────────────────

export function saveDelivery(id: string, input: DeliveryInput): Promise<PurchaseDelivery> {
  return apiClient.put<PurchaseDelivery>(`${demandPath(id)}/delivery`, input);
}

export function recordReceipt(id: string, input: ReceiptInput, idempotencyKey: string): Promise<ReceiptResult> {
  return apiClient.post<ReceiptResult>(`${demandPath(id)}/receipts`, input, { idempotencyKey });
}

export function recordPayment(id: string, input: PaymentInput, idempotencyKey: string): Promise<SupplierPayment & { replayed: boolean }> {
  return apiClient.post<SupplierPayment & { replayed: boolean }>(`${demandPath(id)}/payments`, input, { idempotencyKey });
}

export function requestCredit(id: string, input: CreditInput, idempotencyKey: string): Promise<SupplierCredit> {
  return apiClient.post<SupplierCredit>(`${demandPath(id)}/credits`, input, { idempotencyKey });
}

// ── Conversations and messages ──────────────────────────────────────────────

export function listConversations(params: { search?: string; limit?: number; offset?: number }): Promise<WhatsAppConversationListResponse> {
  return apiClient.get<WhatsAppConversationListResponse>(`${BASE}/conversations`, params);
}

export function markConversationRead(id: string): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>(`${BASE}/conversations/${encodeURIComponent(id)}/read`, {});
}

export function replyToConversation(id: string, input: MessageReplyInput, idempotencyKey: string): Promise<WhatsAppMessage> {
  return apiClient.post<WhatsAppMessage>(`${BASE}/conversations/${encodeURIComponent(id)}/reply`, input, { idempotencyKey });
}

export function listMessages(query: WhatsAppMessageQuery): Promise<WhatsAppMessageListResponse> {
  return apiClient.get<WhatsAppMessageListResponse>(`${BASE}/messages`, query as Record<string, unknown>);
}

export function retryMessage(messageId: string): Promise<WhatsAppMessage> {
  return apiClient.post<WhatsAppMessage>(`${BASE}/messages/${encodeURIComponent(messageId)}/retry`, {});
}

export function reviewMessage(messageId: string, input: MessageReviewInput): Promise<WhatsAppMessage> {
  return apiClient.post<WhatsAppMessage>(`${BASE}/messages/${encodeURIComponent(messageId)}/review`, input);
}
