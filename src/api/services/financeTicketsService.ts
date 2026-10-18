import { apiClient } from '../client';
import type {
  CreateFinanceTicketInput,
  FinanceTicket,
  FinanceTicketMessage,
  FinanceTicketMessageInput,
  FinanceTicketQuery,
  FinanceTicketReferenceLookup,
  FinanceTicketStats,
  RequestReopenFinanceTicketInput,
} from '../types';

const BASE = '/finance/tickets';

/** Preview a record by reference no (RV-/PV-/INC-/FTX-/SAL-/ADV-/PEX-/BSP-/MB-/CT-…) before raising a query. */
export async function lookupFinanceTicketReference(ref: string): Promise<FinanceTicketReferenceLookup> {
  const { reference } = await apiClient.get<{ reference: FinanceTicketReferenceLookup }>(`${BASE}/lookup`, { ref });
  return reference;
}

export async function getFinanceTicketStats(): Promise<Partial<FinanceTicketStats>> {
  const { stats } = await apiClient.get<{ stats: Partial<FinanceTicketStats> }>(`${BASE}/stats`);
  return stats;
}

export async function listFinanceTickets(query: FinanceTicketQuery): Promise<{ tickets: FinanceTicket[]; total: number; page: number; pageSize: number }> {
  return apiClient.get<{ tickets: FinanceTicket[]; total: number; page: number; pageSize: number }>(BASE, query as unknown as Record<string, unknown>);
}

export async function getFinanceTicket(id: string): Promise<FinanceTicket> {
  const { ticket } = await apiClient.get<{ ticket: FinanceTicket }>(`${BASE}/${id}`);
  return ticket;
}

export async function createFinanceTicket(input: CreateFinanceTicketInput, idempotencyKey?: string): Promise<FinanceTicket> {
  const { ticket } = await apiClient.post<{ ticket: FinanceTicket }>(BASE, input, { idempotencyKey });
  return ticket;
}

/** Raiser-only, only while `status === 'draft'`. */
export async function editFinanceDraft(id: string, input: CreateFinanceTicketInput, idempotencyKey?: string): Promise<FinanceTicket> {
  const { ticket } = await apiClient.patch<{ ticket: FinanceTicket }>(`${BASE}/${id}/draft`, input, { idempotencyKey });
  return ticket;
}

export async function submitFinanceTicket(id: string, idempotencyKey?: string): Promise<FinanceTicket> {
  const { ticket } = await apiClient.post<{ ticket: FinanceTicket }>(`${BASE}/${id}/submit`, undefined, { idempotencyKey });
  return ticket;
}

/** Both sides use this — `requireFinanceHelpDeskParticipant` (excludes `finance_auditor`). */
export async function postFinanceTicketMessage(id: string, input: FinanceTicketMessageInput, idempotencyKey?: string): Promise<FinanceTicketMessage> {
  const { message } = await apiClient.post<{ message: FinanceTicketMessage }>(`${BASE}/${id}/messages`, input, { idempotencyKey });
  return message;
}

/**
 * Role-polymorphic: a `super_admin` actually reopens (200). A Finance raiser only
 * REQUESTS a reopen (202, status unchanged, posts a message to the admin) — this app
 * never calls it as `super_admin`, so it always takes the request path in practice.
 */
export async function requestReopenFinanceTicket(id: string, input: RequestReopenFinanceTicketInput, idempotencyKey?: string): Promise<{ requested: true; ticket: FinanceTicket }> {
  return apiClient.post<{ requested: true; ticket: FinanceTicket }>(`${BASE}/${id}/reopen`, input, { idempotencyKey });
}
