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

/**
 * Drop every cached server response. Called when a session ends.
 *
 * ---------------------------------------------------------------------------
 * Why this is necessary, and not merely tidy
 * ---------------------------------------------------------------------------
 * This client is a module singleton mounted above the auth tree in `App.tsx`,
 * so it outlives every sign-out in the process, and `gcTime` is 24 hours.
 * Meanwhile several cache keys carry **no identity at all**, because the server
 * scopes those responses from the JWT rather than from anything the client
 * sends:
 *
 *   qk.reports.summary({period})        a branch's takings, keyed only by period
 *   qk.productionOrders.list({status})  "the caller's own branch"
 *   qk.expenses.list({...})             branchId optional; absent means "mine"
 *   qk.stock.byBranch(null, date)       keyed literally as 'self'
 *
 * A branch handset is shared. Without this, a manager signing out and a shift
 * user signing in on the same phone could be shown the previous account's
 * takings, demands and balances — and with staleTime up to ten minutes on
 * settings, branches and categories, possibly with no refetch to correct it.
 *
 * Putting the account into all forty keys would also work and is worse: it has
 * to be remembered for every key anyone adds later, and a key that forgets it
 * fails silently. This fails safe instead — after a sign-out there is nothing
 * left to leak.
 *
 * ---------------------------------------------------------------------------
 * Server state ONLY
 * ---------------------------------------------------------------------------
 * This touches nothing on disk. Unsynced transactions stay in SQLite and resume
 * on the next sign-in on that phone — sign-out never deletes local data — and
 * the reference mirror stays too, because clearing it would break the offline
 * cold start it exists for.
 */
export function clearCachedServerState(): void {
  queryClient.clear();
}
