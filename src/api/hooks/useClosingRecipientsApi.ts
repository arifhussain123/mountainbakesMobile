import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { closingRecipientService } from '../services';
import type { CreateRecipientInput, NotificationLogQuery, UpdateRecipientInput } from '../types';

const LOG_PAGE = 50;

export function useClosingRecipients() {
  return useQuery({
    queryKey: queryKeys.closingRecipients(),
    queryFn: () => closingRecipientService.listRecipients(),
  });
}

export function useMessagingProvider() {
  return useQuery({
    queryKey: queryKeys.messagingProvider(),
    queryFn: () => closingRecipientService.getMessagingProvider(),
  });
}

/** Delivery log, newest first. */
export function useNotificationLogPages(query: NotificationLogQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.closingNotificationLogs(query),
    queryFn: ({ pageParam }) => closingRecipientService.listNotificationLogs({ ...query, limit: LOG_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.logs.length, 0);
      return loaded < lastPage.total && lastPage.logs.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

/** The newest 200 log rows (the server's page ceiling) — each recipient's latest send, for the list. */
export function useRecentNotificationLogs() {
  return useQuery({
    queryKey: queryKeys.closingNotificationLogs('recent'),
    queryFn: () => closingRecipientService.listNotificationLogs({ limit: 200, offset: 0 }),
  });
}

export function useCreateRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecipientInput) => closingRecipientService.createRecipient(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.closingRecipients() }),
  });
}

export function useUpdateRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipientInput }) => closingRecipientService.updateRecipient(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.closingRecipients() }),
  });
}

export function useDeleteRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closingRecipientService.deleteRecipient(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.closingRecipients() }),
  });
}

export function useDispatchClosingSummaries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { businessDate?: string; resend?: boolean }) => closingRecipientService.dispatchClosingSummaries(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['closingNotificationLogs'] }),
  });
}
