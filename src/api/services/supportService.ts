import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import type { AdminSupportTicketQuery, SupportReference, SupportStats, SupportTicket, SupportTicketListResponse } from '../types';

/** `GET /api/support?page&pageSize&search&source&sortBy&sortDir` — super_admin sees the whole (non-archived) queue. */
export async function listAdminSupportTickets(query: AdminSupportTicketQuery): Promise<SupportTicketListResponse> {
  return apiClient.get<SupportTicketListResponse>('/support', query as unknown as Record<string, unknown>);
}

/** `GET /api/support/stats` (super_admin) — open-ticket counts by source, for the Source filter's counts. */
export async function getSupportStats(): Promise<SupportStats> {
  return apiClient.get<SupportStats>('/support/stats');
}

/**
 * `GET /api/support/lookup?ref&branchId` / `&pool=1` — the reference as it reads
 * NOW, scoped the way the web's `useLiveReference` scopes it (admin only).
 */
export async function lookupSupportReferenceScoped(ref: string, scope: { branchId?: string | null; pool?: boolean }): Promise<SupportReference> {
  const params: Record<string, unknown> = { ref };
  if (scope.pool) params.pool = 1;
  else if (scope.branchId) params.branchId = scope.branchId;
  const { reference } = await apiClient.get<{ reference: SupportReference }>('/support/lookup', params);
  return reference;
}

/** `/api/support` — own queue only for a branch_manager (server-enforced). */
export async function listSupportTickets(): Promise<SupportTicketListResponse> {
  return apiClient.get<SupportTicketListResponse>('/support');
}

/** `/api/support/lookup?ref=` — typed prefixes MB-/DMD-/EXP-/STK-/CT-. Throws (404/400) if not found. */
export async function lookupSupportReference(ref: string): Promise<SupportReference> {
  const { reference } = await apiClient.get<{ reference: SupportReference }>('/support/lookup', { ref });
  return reference;
}

/**
 * `branch_manager`/`production_user` only. `idempotencyKey` is minted once
 * per submission attempt by the caller (`useNewQueryForm`) and resent
 * unchanged on every retry — same contract as `expenseService.createExpense`
 * — so a flaky connection retrying this call can never raise the same query
 * twice.
 */
export async function createSupportTicket(
  input: { referenceId: string; message: string },
  idempotencyKey: string = generateIdempotencyKey('support_ticket'),
): Promise<SupportTicket> {
  const options: MutationOptions = { idempotencyKey };
  const { ticket } = await apiClient.post<{ ticket: SupportTicket }>('/support', input, options);
  return ticket;
}
