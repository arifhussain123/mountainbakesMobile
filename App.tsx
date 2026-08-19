import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClientProvider } from '@tanstack/react-query';
import RNBootSplash from 'react-native-bootsplash';

import { MBButton } from '@/components';
import { assertApiReachable } from '@/config/env';
import { initDatabase } from '@/database/localDb';
import { RootNavigator } from '@/navigation/RootNavigator';
import { queryClient } from '@/services/query/queryClient';
import { initStorage } from '@/services/storage/secureStorage';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/**
 * App root.
 *
 * Startup order is deliberate:
 *   config → encrypted storage → settings → local database → session → network
 *
 * Storage precedes session restore because the Supabase session lives in it.
 * The database precedes the session because signing in can immediately trigger a
 * sync drain, which needs the queue tables to exist.
 *
 * A bootstrap failure surfaces a retry rather than hanging on the splash — an
 * unreadable Keychain or a failed migration is recoverable, and a spinner
 * forever is not a diagnosis.
 */

type BootState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'failed'; message: string };

function useBootstrap(): { state: BootState; retry: () => void } {
  const [state, setState] = useState<BootState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const hydrateSettings = useSettingsStore(s => s.hydrate);
  const bootstrapAuth = useAuthStore(s => s.bootstrap);
  const startNetwork = useNetworkStore(s => s.start);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeNetwork: (() => void) | undefined;

    (async () => {
      try {
        assertApiReachable();
        await initStorage();
        hydrateSettings();
        await initDatabase();
        await bootstrapAuth();
        unsubscribeNetwork = startNetwork();
        if (!cancelled) setState({ phase: 'ready' });
      } catch (error) {
        if (cancelled) return;
        setState({
          phase: 'failed',
          message: error instanceof Error ? error.message : 'Startup failed.',
        });
      } finally {
        // Hide on BOTH outcomes. Hiding only on success would leave a failed
        // start stuck behind the native splash with its retry button invisible
        // underneath — the one case where the user most needs to see the screen.
        if (!cancelled) {
          RNBootSplash.hide({ fade: true }).catch(() => {
            // Already hidden, or no splash installed. Not worth surfacing.
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeNetwork?.();
    };
  }, [attempt, hydrateSettings, bootstrapAuth, startNetwork]);

  const retry = useCallback(() => {
    setState({ phase: 'loading' });
    setAttempt(n => n + 1);
  }, []);

  return { state, retry };
}

function BootGate(): React.ReactElement {
  const theme = useTheme();
  const { state, retry } = useBootstrap();

  if (state.phase === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <Text style={[theme.type.display, { color: theme.colors.primary }]}>Mountain Bakes</Text>
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          Fresh • Quality • Every Day
        </Text>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ marginTop: theme.space.xxl }}
        />
      </View>
    );
  }

  if (state.phase === 'failed') {
    return (
      <View style={[styles.centered, styles.errorPad, { backgroundColor: theme.colors.bg }]}>
        <Text style={[theme.type.h2, { color: theme.colors.danger }]}>Couldn't start</Text>
        <Text style={[theme.type.body, styles.center, { color: theme.colors.textMuted }]}>
          {state.message}
        </Text>
        <MBButton label="Try again" onPress={retry} variant="secondary" />
      </View>
    );
  }

  return <RootNavigator />;
}

function Themed(): React.ReactElement {
  const theme = useTheme();
  return (
    <>
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.bg}
      />
      <BootGate />
    </>
  );
}

export default function App(): React.JSX.Element {
  const themeMode = useSettingsStore(s => s.themeMode);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider mode={themeMode}>
              <Themed />
            </ThemeProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorPad: { padding: 24 },
  center: { textAlign: 'center' },
});
