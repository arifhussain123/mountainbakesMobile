import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/shared/hooks';
import { generateIdempotencyKey, isApiError } from '../client';
import { enqueueOfflineWrite } from '../offlineQueue';
import { queryKeys } from '../queryKeys';
import { notificationService } from '../services';
import type { AppNotification } from '../types';

/** Every 60s while the app is open, refetched on reconnect, and on app foreground (see `startQueryFocusManager`) — all three of this app's own stated refresh triggers. No push exists server-side (Step 0), so polling is the only live-update mechanism available. */
const NOTIFICATIONS_POLL_MS = 60_000;

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationService.listNotifications(),
    staleTime: NOTIFICATIONS_POLL_MS,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

/**
 * `AppNotification.isRead` is a legacy per-row flag; the feed's own `readIds`
 * array (this reader's actual `notification_reads` rows) is what Step 0
 * confirmed is authoritative for a notification that might be broadcast to a
 * whole role/branch, not just one person. This merges both into one `read`
 * boolean per item so nothing downstream has to reason about the two
 * separately.
 */
export interface NotificationWithReadState extends AppNotification {
  read: boolean;
}

/** Pure merge, extracted so it's testable without rendering a hook/mocking TanStack Query — see `__tests__/notificationReadState.test.ts`. */
export function mergeReadState(notifications: AppNotification[], readIds: string[]): NotificationWithReadState[] {
  const readSet = new Set(readIds);
  return notifications.map((n) => ({ ...n, read: n.isRead || readSet.has(n.id) }));
}

export function useNotificationsWithReadState(): { items: NotificationWithReadState[]; unreadCount: number; isLoading: boolean; error: unknown; refetch: () => unknown; isRefetching: boolean } {
  const { data, isLoading, error, refetch, isRefetching } = useNotifications();

  const items = useMemo<NotificationWithReadState[]>(
    () => mergeReadState(data?.notifications ?? [], data?.readIds ?? []),
    [data],
  );

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return { items, unreadCount, isLoading, error, refetch, isRefetching };
}

/**
 * Same offline-write-queue pattern as `useDiscountActions.ts`'s
 * revise/withdraw (CLAUDE.md Section 37: "Do not silently lose ... stock
 * transactions" — a mark-read tapped offline must not just vanish). Queued
 * instead of rejected when offline (checked up front) or when the request
 * itself fails for a network reason (`isApiError` with `status === null` —
 * never for a real server rejection, which still rolls the optimistic
 * update back via `onError`).
 */
async function markReadOrQueue(ids: string[], isOffline: boolean): Promise<{ readIds: string[] }> {
  if (isOffline) {
    await enqueueOfflineWrite({
      endpoint: '/notifications/read',
      method: 'post',
      payload: { ids },
      idempotencyKey: generateIdempotencyKey('notifications-read'),
      invalidateKeys: [[...queryKeys.notifications()]],
    });
    return { readIds: ids };
  }
  try {
    return await notificationService.markNotificationsRead(ids);
  } catch (error) {
    if (isApiError(error) && error.status === null) {
      await enqueueOfflineWrite({
        endpoint: '/notifications/read',
        method: 'post',
        payload: { ids },
        idempotencyKey: generateIdempotencyKey('notifications-read'),
        invalidateKeys: [[...queryKeys.notifications()]],
      });
      return { readIds: ids };
    }
    throw error;
  }
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  return useMutation({
    mutationFn: (ids: string[]) => markReadOrQueue(ids, isOffline),
    // Optimistic: the bell badge and the list's unread dots must clear the
    // instant someone taps, not after a round trip — a mark-read that fails
    // just gets invalidated back to the server's own view in onSettled.
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications() });
      const previous = queryClient.getQueryData(queryKeys.notifications());
      queryClient.setQueryData<{ notifications: AppNotification[]; readIds: string[] } | undefined>(queryKeys.notifications(), (current) => {
        if (!current) return current;
        return { ...current, readIds: [...new Set([...current.readIds, ...ids])] };
      });
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notifications(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}
