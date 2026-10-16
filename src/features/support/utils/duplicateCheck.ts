import type { SupportTicket } from '@/api';

/**
 * Client-side-only courtesy check — Step 0 confirmed the server has no
 * unique constraint or duplicate-open-ticket guard on `support_tickets`
 * (`POST /api/support` inserts unconditionally), so this can only warn, never
 * actually prevent a second ticket on the same reference. It exists so the
 * New Query screen can offer "Open existing query" instead of silently
 * letting someone raise the same complaint twice.
 */
export function findOpenTicketForReference(tickets: SupportTicket[], referenceId: string): SupportTicket | null {
  const normalized = referenceId.trim().toUpperCase();
  return tickets.find((t) => t.referenceId.toUpperCase() === normalized && t.status === 'open') ?? null;
}
