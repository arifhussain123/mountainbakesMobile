import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supportService } from '../services';
import type { SupportReference, SupportTicket, SupportTicketListResponse } from '../types';

export function useSupportTickets() {
  return useQuery({
    queryKey: queryKeys.supportTickets(),
    queryFn: () => supportService.listSupportTickets(),
  });
}

/** A client-only placeholder shown at the top of the list between submit and the server's own response replacing it — `id` is never a real ticket id, so nothing else should key off it persisting. */
export const OPTIMISTIC_TICKET_ID_PREFIX = 'optimistic-';

function buildOptimisticTicket(input: { referenceId: string; message: string }, reference: SupportReference | null): SupportTicket {
  return {
    id: `${OPTIMISTIC_TICKET_ID_PREFIX}${Date.now()}`,
    ticketNumber: 'Sending…',
    referenceType: reference?.type ?? 'system',
    referenceId: input.referenceId,
    referenceSnapshot: reference,
    message: input.message,
    status: 'open',
    resolutionNote: null,
    branchName: null,
    raisedByName: null,
    resolvedByName: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Optimistic insert at the top of the list, rolled back on failure — the
 * brief's own requirement. `onMutate` snapshots the current cache (so
 * `onError` can restore it exactly, not just "remove the optimistic row",
 * which would also undo anything else that changed the list in the
 * meantime) and `onSettled` always refetches, so the optimistic row is
 * replaced by the server's real one on success and simply disappears again on
 * failure/rollback.
 */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: { referenceId: string; message: string };
      idempotencyKey: string;
      /** The already-looked-up reference, purely to make the optimistic row's type/snapshot accurate — never re-sent to the server, which re-resolves it itself. */
      reference: SupportReference | null;
    }) => supportService.createSupportTicket(input, idempotencyKey),
    onMutate: async ({ input, reference }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.supportTickets() });
      const previous = queryClient.getQueryData<SupportTicketListResponse>(queryKeys.supportTickets());
      queryClient.setQueryData<SupportTicketListResponse | undefined>(queryKeys.supportTickets(), (current) => {
        const optimisticTicket = buildOptimisticTicket(input, reference);
        if (!current) return { tickets: [optimisticTicket], total: 1, page: 1, pageSize: 20 };
        return { ...current, tickets: [optimisticTicket, ...current.tickets], total: current.total + 1 };
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.supportTickets(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets() });
    },
  });
}
