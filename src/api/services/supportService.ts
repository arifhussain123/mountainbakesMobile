import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import type { SupportReference, SupportTicket, SupportTicketListResponse } from '../types';

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
