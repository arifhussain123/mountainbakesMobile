import { apiClient } from '../client';
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

/** `branch_manager`/`production_user` only. */
export async function createSupportTicket(input: { referenceId: string; message: string }): Promise<SupportTicket> {
  const { ticket } = await apiClient.post<{ ticket: SupportTicket }>('/support', input);
  return ticket;
}
