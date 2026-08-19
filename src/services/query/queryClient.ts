import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api/errors';

/**
 * TanStack Query configuration.
 *
 * Mirrors the web client's cache policy so the two stay comparable:
 * `staleTime` 60s by default, 15s for intraday/live data (stock, dashboards).
 *
 * `refetchOnReconnect` is on — coming back online is exactly when a stale screen
 * needs correcting. Retries deliberately skip anything the server has already
 * judged: retrying a 400 or a 403 cannot change the answer and only delays the
 * error the user needs to see.
 */

export const STALE_TIME_MS = 60_000;
export const LIVE_STALE_TIME_MS = 15_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      // Long gcTime so screens the user hasn't opened recently are still present
      // in the persisted cache when they go offline.
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Mutations are never retried automatically. Without server-side
      // idempotency a blind retry can double-apply a sale; offline writes go
      // through the sync queue, which retries deliberately and carries a
      // client_operation_id.
      retry: false,
    },
  },
});
