import { QueryClient } from '@tanstack/react-query';

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
