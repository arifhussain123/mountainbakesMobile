/**
 * Composition only — providers and the root navigator. No business logic,
 * no screens here (folder-structure skill: "never add screens or business
 * logic to App.tsx").
 */
import { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import BootSplash from 'react-native-bootsplash';
import { queryClient, startOfflineQueueRetryWorker } from '@/api';
import { RootNavigator } from '@/navigation';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    void BootSplash.hide({ fade: true });
    startOfflineQueueRetryWorker();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <RootNavigator />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
