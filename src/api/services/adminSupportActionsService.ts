import { apiClient } from '../client';
import type { FinanceResolutionType, FinanceTicket, FinanceTicketStatus, PaymentMethod, Product, SupportStockFigures, SupportTicket } from '../types';

/**
 * Super Admin Support Center — the web `SupportCenterPage` and the embedded
 * `FinanceHelpDeskPage` / `FinanceQueryDetail` admin actions, same endpoints
 * and bodies. Branch/production queries live under `/support` (every write is
 * `requireRole('super_admin')`); finance queries under `/finance/tickets`
 * (`requireFinanceHelpDeskAdmin`, which does NOT read "Allow Super Admin to
 * modify" — the Help Desk is the sanctioned channel for those corrections).
 */

// ─── Branches & Production queries (`/support`) ─────────────────────────────

/** `GET /products?isActive=true` — what the web's sale / demand line editors search. */
export async function listActiveProducts(): Promise<Product[]> {
  const { products } = await apiClient.get<{ products: Product[] }>('/products', { isActive: 'true' });
  return products ?? [];
}

/** Web EditDialog: `PATCH /support/:id {message, resolutionNote}`. */
export async function editSupportTicket(id: string, input: { message: string; resolutionNote: string }): Promise<SupportTicket> {
  const { ticket } = await apiClient.patch<{ ticket: SupportTicket }>(`/support/${id}`, input);
  return ticket;
}

/** Web ViewDialog "Mark Resolved" / RejectDialog: `PATCH /support/:id/resolve`. */
export async function resolveSupportTicket(id: string, input: { status: 'resolved' | 'rejected'; resolutionNote: string }): Promise<SupportTicket> {
  const { ticket } = await apiClient.patch<{ ticket: SupportTicket }>(`/support/${id}/resolve`, input);
  return ticket;
}

export interface SupportFiguresResult {
  applied: boolean;
  stock: { applied: boolean; before: SupportStockFigures; after: SupportStockFigures } | null;
  productionStock: { applied: boolean; before: { balance: number }; after: { balance: number } } | null;
}

/** Web Stock / Production / Cash deposit / Field editors: `PATCH /support/:id/figures {edits, note}` — resolves the query. */
export async function changeSupportFigures(id: string, input: { edits: Record<string, string | number>; note: string }): Promise<SupportFiguresResult> {
  return apiClient.patch<SupportFiguresResult>(`/support/${id}/figures`, input);
}

export interface SupportSaleItemInput {
  productId: string | null;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: number;
  qty: number;
  discount: number;
}

/** Web SaleItemsDialog: `PATCH /support/:id/sale-items {items, paymentMethod?, note}`. */
export async function editSupportSaleItems(
  id: string,
  input: { items: SupportSaleItemInput[]; paymentMethod?: PaymentMethod; note: string },
): Promise<unknown> {
  return apiClient.patch(`/support/${id}/sale-items`, input);
}

/** Web DemandItemsDialog: `PATCH /support/:id/demand-items {items, reason, note}`. */
export async function editSupportDemandItems(
  id: string,
  input: { items: { productId: string; productName: string; qty: number; approvedQty: number }[]; reason: string; note: string },
): Promise<unknown> {
  return apiClient.patch(`/support/${id}/demand-items`, input);
}

/** Web DeleteDemandDialog: `DELETE /support/:id/demand {reason, confirmDemandNumber, note}`. */
export async function deleteSupportDemand(
  id: string,
  input: { reason: string; confirmDemandNumber: string; note: string },
): Promise<{ stockMoved: boolean; branchReversals: { productName: string; delta: number }[] }> {
  return apiClient.deleteWithBody(`/support/${id}/demand`, input);
}

/** Web DeleteCashDepositDialog: `DELETE /support/:id/cash-deposit {reason, confirmTransferNo, note}`. */
export async function deleteSupportCashDeposit(id: string, input: { reason: string; confirmTransferNo: string; note: string }): Promise<unknown> {
  return apiClient.deleteWithBody(`/support/${id}/cash-deposit`, input);
}

/** Web "Archive": `DELETE /support/:id` — archives, never deletes (migration 76). */
export async function archiveSupportTicket(id: string): Promise<unknown> {
  return apiClient.delete(`/support/${id}`);
}

// ─── Finance queries (`/finance/tickets`) ───────────────────────────────────

const FIN = '/finance/tickets';

/** Web QuickFeedDialog: Edit → `PATCH /:id`, Amend → `POST /:id/amend-query`, Recreate → `POST /:id/recreate`; body = the changed feed fields + reason. */
export async function feedFinanceTicket(id: string, mode: 'edit' | 'amend' | 'recreate', body: Record<string, unknown>): Promise<FinanceTicket> {
  const { ticket } =
    mode === 'edit'
      ? await apiClient.patch<{ ticket: FinanceTicket }>(`${FIN}/${id}`, body)
      : await apiClient.post<{ ticket: FinanceTicket }>(`${FIN}/${id}/${mode === 'amend' ? 'amend-query' : 'recreate'}`, body);
  return ticket;
}

/** Web Restore: `POST /:id/restore {reason}`. */
export async function restoreFinanceTicket(id: string, reason: string): Promise<unknown> {
  return apiClient.post(`${FIN}/${id}/restore`, { reason });
}

/** Web ResponsePanel "Save response": `POST /:id/response` — only the fields that changed. */
export async function saveFinanceTicketResponse(id: string, body: Record<string, unknown>): Promise<unknown> {
  return apiClient.post(`${FIN}/${id}/response`, body);
}

export interface FinanceTicketStatusInput {
  status: Exclude<FinanceTicketStatus, 'draft' | 'amended' | 'reopened'>;
  resolutionType?: FinanceResolutionType;
  adminResponse?: string;
  resolutionNote?: string;
  resolutionAmount?: number | null;
}

/** Web StatusDialog: `PATCH /:id/status`. */
export async function setFinanceTicketStatus(id: string, input: FinanceTicketStatusInput): Promise<unknown> {
  return apiClient.patch(`${FIN}/${id}/status`, input);
}

/** Web AssignDialog: `PATCH /:id/assign {assignedTo}` — null unassigns. */
export async function assignFinanceTicket(id: string, assignedTo: string | null): Promise<unknown> {
  return apiClient.patch(`${FIN}/${id}/assign`, { assignedTo });
}

/** Web DeleteQueryDialog: `DELETE /:id {reason, confirmDelete: true}` — soft; the record behind it is untouched. */
export async function deleteFinanceTicket(id: string, reason: string): Promise<unknown> {
  return apiClient.deleteWithBody(`${FIN}/${id}`, { reason, confirmDelete: true });
}

export interface CorrectFinanceRecordInput {
  edits: { field: string; value: string; expected: string | null }[];
  note?: string;
  resolve: boolean;
  expectedVersion: number;
  confirmOverwrite?: boolean;
}

export interface CorrectFinanceRecordResult {
  applied: {
    field: string;
    label: string;
    originalValue: string | null;
    newValue: string | null;
    ledger?: { ledgerAmended?: boolean; reversalVoucherNo?: string; correctedVoucherNo?: string };
  }[];
  ticket: FinanceTicket;
}

/** Web Change figures / Correct record: `POST /:id/correct-record` — one transaction, refused (409 `conflict`) on a concurrent change. */
export async function correctFinanceRecord(id: string, input: CorrectFinanceRecordInput): Promise<CorrectFinanceRecordResult> {
  return apiClient.post<CorrectFinanceRecordResult>(`${FIN}/${id}/correct-record`, input);
}

/** Web DeleteRecordDialog: `DELETE /:id/record {reason, confirmDelete: true}` — the record behind the query, soft. */
export async function deleteFinanceRecord(id: string, reason: string): Promise<unknown> {
  return apiClient.deleteWithBody(`${FIN}/${id}/record`, { reason, confirmDelete: true });
}
