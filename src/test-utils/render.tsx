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
 */

const INITIAL_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderScreen(
  ui: React.ReactElement,
  options: { scheme?: 'light' | 'dark' } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <ThemeProvider mode={options.scheme ?? 'light'}>{ui}</ThemeProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}
