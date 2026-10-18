import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

/**
 * Matches the web dashboard's own cadence (`docs/branch-dashboard-v2-api-map.md`):
 * 60s for the summary, a shorter "live" window for analytics/stock which change
 * more often within a trading day.
 */
export const LIVE_STALE_TIME_MS = 15_000;
export const SUMMARY_STALE_TIME_MS = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SUMMARY_STALE_TIME_MS,
      retry: 1,
    },
  },
});

let focusManagerStarted = false;

/**
 * TanStack Query's `refetchOnWindowFocus` (on by default) is a web-only
 * `visibilitychange` listener out of the box — it does nothing on React
 * Native until something feeds it `AppState` instead. Without this, no query
 * anywhere in the app actually refetches when the app comes back to the
 * foreground, notifications included (one of this app's own requirements:
 * "refreshed on app foreground"). Call once, from `App.tsx`, alongside
 * `startOfflineQueueRetryWorker()`.
 */
export function startQueryFocusManager(): void {
  if (focusManagerStarted) return;
  focusManagerStarted = true;
  AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
}
