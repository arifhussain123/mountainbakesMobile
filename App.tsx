/**
 * Composition only — providers and the root navigator. No business logic,
 * no screens here (folder-structure skill: "never add screens or business
 * logic to App.tsx").
 */
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import BootSplash from 'react-native-bootsplash';
import { queryClient, startOfflineQueueRetryWorker } from '@/api';
import { RootNavigator } from '@/navigation';
import { RootErrorBoundary } from '@/shared/components/RootErrorBoundary';
import { ThemeProvider } from '@/shared/theme';
import { logger } from '@/shared/utils';

// If something between JS start and the first `BootSplash.hide()` call never
// resolves (a future regression equivalent to the bundle-load hang this
// constant was added to guard against), force the native splash away anyway
// after this many ms so the app never looks frozen — a stuck JS splash with a
// warning logged is recoverable; a frozen native launch screen is not.
const BOOTSPLASH_FAILSAFE_MS = 5000;

function App() {
  const didHideSplash = useRef(false);

  useEffect(() => {
    const hide = () => {
      if (didHideSplash.current) return;
      didHideSplash.current = true;
      void BootSplash.hide({ fade: true });
    };

    hide();
    startOfflineQueueRetryWorker();

    const failsafe = setTimeout(() => {
      if (didHideSplash.current) return;
      logger.warn('BootSplash failsafe fired — hide() had not run 5s after JS start');
      hide();
    }, BOOTSPLASH_FAILSAFE_MS);

    return () => clearTimeout(failsafe);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ThemeProvider>
              <BottomSheetModalProvider>
                <RootNavigator />
              </BottomSheetModalProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default App;
