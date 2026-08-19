import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Screen-test render helper.
 *
 * Supplies the providers every screen assumes: safe-area insets, a query client,
 * navigation, and the theme. Navigation is included because header affordances
 * like MBSyncStatus call useNavigation and throw without a navigator.
 *
 * `initialMetrics` is required — without it SafeAreaProvider waits for a native
 * measurement that never arrives under Jest, and `useSafeAreaInsets` throws.
 *
 * The query client is created per call with retries off and no cache, so one
 * test's data can never leak into the next.
 *
 * ---------------------------------------------------------------------------
 * `gcTime: 0` on mutations as well as queries
 * ---------------------------------------------------------------------------
 * Both halves matter, and only the query half was here. When a mutation
 * settles, query-core calls `scheduleGc()`, which is
 * `setTimeout(remove, gcTime)` — and an unset `gcTime` defaults to **five
 * minutes** (`removable.js`, `newGcTime ?? 5 * 60 * 1e3`). So every screen test
 * that ran a mutation to completion left a five-minute timer alive in the Jest
 * worker, and the run ended with:
 *
 *   A worker process has failed to exit gracefully ...
 *
 * printed after a green suite. Two `ProductionOrdersScreen` cases were doing it
 * — the two that actually approve a demand.
 *
 * `0` is still a real `setTimeout`, but a zero-delay one: it fires on the next
 * tick, long before teardown, which is exactly why the query side never leaked.
 * The point is not to silence the warning — `--forceExit` would do that while
 * leaving the handle — but to leave nothing pending.
 */

const INITIAL_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export async function renderScreen(
  ui: React.ReactElement,
  options: { scheme?: 'light' | 'dark' } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  const screen = await render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <ThemeProvider mode={options.scheme ?? 'light'}>{ui}</ThemeProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );

  // Returned so a test can assert on the cache itself, which is what
  // `__tests__/render.test.tsx` needs to pin the gcTime rule above.
  return { ...screen, queryClient };
}
