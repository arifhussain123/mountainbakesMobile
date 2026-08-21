import type { SupportReference, SupportTicket } from '@/shared/types/support.types';
import { api } from './client';

/**
 * The Help Desk — a branch or the production counter raising a query on one
 * record, and an admin answering it in the Support Center.
 *
 * ---------------------------------------------------------------------------
 * A query is always *about* something, and the something is snapshotted
 * ---------------------------------------------------------------------------
 * A ticket carries exactly one reference ID — a sale `MB-######`, a demand
 * `DMD-######`, an expense `EXP-######`, or a product's stock `STK-######` — and
 * the server writes that record's figures onto the ticket at submit time. That
 * snapshot is the point: by the time an admin reads the query the underlying row
 * may have moved, and "this is wrong" is unanswerable without knowing what was
 * on screen when it was said.
 *
 * So there is no free-text-only ticket from this app. The lookup runs first, the
 * raiser sees what the admin will see, and only then does the message get typed.
 *
 * ---------------------------------------------------------------------------
 * Reading and writing have different gates, and the write one is narrow
 * ---------------------------------------------------------------------------
 * `GET /api/support` is open to any signed-in account and returns **only that
 * account's own tickets** unless it is the super admin, who gets the whole
 * queue. `GET /api/support/lookup` is likewise open — a reference resolves
 * within the caller's own scope.
 *
 * `POST /api/support` is `requireRole('branch_manager', 'production_user')`.
 * A `branch_user` shift account may read its tickets and may not raise one; so
 * may an admin, who answers them instead. A screen must ask before it offers the
 * button — the alternative is a form that 403s on submit after the operator has
 * typed the paragraph.
 *
 * Every correction an admin can apply — editing figures, sale lines, demand
 * lines — is a Support Center action and is deliberately not in this file. This
 * app raises queries; it does not resolve them.
 */

/**
 * `GET /api/support/lookup?ref=…`.
 *
 * A reference that does not resolve comes back as a 4xx with a sentence naming
 * why (wrong prefix, not found, not yours), not as `{ reference: null }`. That
 * distinction is what lets the form tell "you typed EXP-12 and meant
 * EXP-000012" apart from "that expense belongs to another branch".
 */
export function lookupSupportReference(ref: string): Promise<{ reference: SupportReference }> {
  return api.get<{ reference: SupportReference }>('/api/support/lookup', {
    params: { ref: ref.trim() },
  });
}

/** `GET /api/support` — the caller's own tickets, newest first. */
export async function getSupportTickets(): Promise<SupportTicket[]> {
  const data = await api.get<{ tickets: SupportTicket[] }>('/api/support');
  return data.tickets ?? [];
}

/**
 * `POST /api/support` — raise a query.
 *
 * **Not offline-capable, and deliberately so.** The five writes that queue are
 * the ones that record business the shop actually did — a sale, an order, an
 * expense, a demand, a return — and the rule for those is that the transaction
 * must survive a basement with no signal. A support query is a *message about* a
 * transaction: it needs the server to resolve and snapshot the reference before
 * it can be written at all, so there is nothing to queue that would still be
 * true an hour later. It fails with a normal error and the operator retries.
 */
export function createSupportTicket(payload: {
  referenceId: string;
  message: string;
}): Promise<SupportTicket> {
  return api.post<SupportTicket>('/api/support', {
    referenceId: payload.referenceId.trim(),
    message: payload.message.trim(),
  });
}
