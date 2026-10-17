/**
 * @format
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockMarkNotificationsRead = jest.fn();

jest.mock('@/api/services', () => ({
  notificationService: {
    listNotifications: jest.fn(),
    markNotificationsRead: (ids: string[]) => mockMarkNotificationsRead(ids),
  },
}));

import { queryKeys } from '@/api/queryKeys';
import { useMarkNotificationsRead } from '@/api/hooks/useNotificationsApi';
import type { AppNotification, NotificationFeedResponse } from '@/api/types';

function notification(id: string): AppNotification {
  return {
    id,
    type: 'support_resolved',
    title: `Title ${id}`,
    message: 'Message',
    isRead: false,
    targetUserId: null,
    targetRole: null,
    branchId: null,
    relatedId: null,
    createdAt: new Date().toISOString(),
  };
}

// Same harness-ref approach as `cashDepositIdempotency.test.tsx` — a
// component that calls the hook and exposes both it and the query client on
// a mutable ref, so the optimistic cache update is observable without
// rendering any real screen UI.
function renderMarkRead(seed: NotificationFeedResponse) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(queryKeys.notifications(), seed);

  const ref: { current: ReturnType<typeof useMarkNotificationsRead> | null } = { current: null };
  function Harness() {
    ref.current = useMarkNotificationsRead();
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  return { ref, queryClient };
}

describe('useMarkNotificationsRead — optimistic cache update', () => {
  beforeEach(() => {
    mockMarkNotificationsRead.mockReset();
  });

  it('adds the id to readIds immediately, before the server responds', async () => {
    mockMarkNotificationsRead.mockImplementation(() => new Promise(() => {})); // never resolves in this test
    const seed: NotificationFeedResponse = { notifications: [notification('a'), notification('b')], readIds: [] };
    const { ref, queryClient } = renderMarkRead(seed);

    ReactTestRenderer.act(() => {
      ref.current!.mutate(['a']);
    });

    const cached = queryClient.getQueryData<NotificationFeedResponse>(queryKeys.notifications());
    expect(cached!.readIds).toEqual(['a']);
  });

  it('rolls the optimistic update back if the server call fails', async () => {
    mockMarkNotificationsRead.mockRejectedValue(new Error('network down'));
    const seed: NotificationFeedResponse = { notifications: [notification('a')], readIds: [] };
    const { ref, queryClient } = renderMarkRead(seed);

    await ReactTestRenderer.act(async () => {
      try {
        await ref.current!.mutateAsync(['a']);
      } catch {
        // expected — asserting the rollback, not the rejection
      }
    });

    const cached = queryClient.getQueryData<NotificationFeedResponse>(queryKeys.notifications());
    expect(cached!.readIds).toEqual([]);
  });

  it('does not duplicate an id already marked read by an earlier call', async () => {
    mockMarkNotificationsRead.mockImplementation(() => new Promise(() => {}));
    const seed: NotificationFeedResponse = { notifications: [notification('a')], readIds: ['a'] };
    const { ref, queryClient } = renderMarkRead(seed);

    ReactTestRenderer.act(() => {
      ref.current!.mutate(['a']);
    });

    const cached = queryClient.getQueryData<NotificationFeedResponse>(queryKeys.notifications());
    expect(cached!.readIds).toEqual(['a']);
  });
});
