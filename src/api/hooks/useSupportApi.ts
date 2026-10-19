import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financeTicketsService, supportService } from '../services';
import type { AdminSupportTicketQuery, FinanceTicketQuery, SupportReference, SupportTicket, SupportTicketListResponse } from '../types';

/** Super Admin Support Center — the ops queue, server-paged (one page per fetch, appended on scroll). */
export function useAdminSupportTickets(query: Omit<AdminSupportTicketQuery, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminSupportTickets(query),
    queryFn: ({ pageParam }) => supportService.listAdminSupportTickets({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled,
  });
}

/** The cached row a Support Center card was tapped from — there is no `GET /api/support/:id`. */
export function useCachedAdminSupportTicket(ticketId: string): SupportTicket | null {
  const queryClient = useQueryClient();
  const entries = queryClient.getQueriesData<{ pages: SupportTicketListResponse[] }>({ queryKey: ['adminSupportTickets'] });
  for (const [, data] of entries) {
    for (const page of data?.pages ?? []) {
      const hit = page.tickets.find((t) => t.id === ticketId);
      if (hit) return hit;
    }
  }
  return null;
}

/** `GET /api/support/stats` — super_admin only. */
export function useSupportStats() {
  return useQuery({
    queryKey: queryKeys.supportStats(),
    queryFn: () => supportService.getSupportStats(),
  });
}

/**
 * The reference as it reads now (web `useLiveReference`): `pool=1` for a
 * production-pool stock ticket, else the raiser's branch. Disabled (snapshot
 * only) when `enabled` is false.
 */
export function useSupportLiveReference(ref: string, scope: { branchId?: string | null; pool?: boolean }, enabled: boolean) {
  const scopeKey = scope.pool ? 'pool' : (scope.branchId ?? '');
  return useQuery({
    queryKey: queryKeys.supportLiveReference(ref, scopeKey),
    queryFn: () => supportService.lookupSupportReferenceScoped(ref, scope),
    enabled: enabled && !!ref,
    retry: false,
  });
}

/** Finance Help Desk queue, server-paged — the Support Center's "Finance Queries" section. */
export function useFinanceTicketsPaged(query: Omit<FinanceTicketQuery, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.financeTicketsPaged(query),
    queryFn: ({ pageParam }) => financeTicketsService.listFinanceTickets({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled,
  });
}

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
