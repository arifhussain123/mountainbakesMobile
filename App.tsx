import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
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
import { space } from '@/theme/spacing';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { SplashScreen } from '@/screens/SplashScreen';
import { withBootTimeout } from '@/utils/bootTimeout';

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

    const timer: { id?: ReturnType<typeof setTimeout> } = {};

    (async () => {
      try {
        assertApiReachable();
        // The whole sequence is raced, not each step: the budget is what the
        // user is waiting through, and per-step timeouts would let four slow
        // steps add up to a wait none of them individually exceeded.
        await withBootTimeout(
          (async () => {
            /*
             * Storage and the database are started together.
             *
             * The ORDER constraints are real but narrower than the old
             * `await`-per-line sequence implied: settings and the session live
             * in encrypted storage, and the database has to be open before the
             * session because signing in can trigger a drain immediately.
             * Neither of storage and the database needs anything from the
             * other — one is Keychain plus MMKV, the other is SQLite opening a
             * file and running migrations, and both are native I/O the JS
             * thread only waits on.
             *
             * Run in sequence they added up; started together the wait is the
             * slower of the two rather than the sum, and every constraint above
             * still holds: settings are chained onto storage, and the session
             * waits for both.
             *
             * `Promise.all` rather than two bare promises awaited in turn. The
             * latter leaves a window where one has rejected and nothing is
             * listening yet, which Hermes reports as an unhandled rejection —
             * a red box on a start that was already failing, in front of the
             * retry the user needs to see.
             */
            await Promise.all([initStorage().then(hydrateSettings), initDatabase()]);
            await bootstrapAuth();
          })(),
          timer,
        );
        unsubscribeNetwork = startNetwork();
        if (!cancelled) setState({ phase: 'ready' });
      } catch (error) {
        if (cancelled) return;
        setState({
          phase: 'failed',
          message: error instanceof Error ? error.message : 'Startup failed.',
        });
      } finally {
        // A backstop, not the main path. `SplashScreen` hides the native splash
        // as soon as it mounts, which is far earlier than this and is what lets
        // it be seen at all — hiding here instead meant the app became ready and
        // the splash lifted in the same tick, revealing the dashboard.
        //
        // Still called on BOTH outcomes, and still unconditional: if the splash
        // never mounted, a failed start would otherwise sit behind the native
        // splash with its retry button invisible underneath — the one case where
        // the user most needs to see the screen. Calling it twice is free.
        if (!cancelled) {
          RNBootSplash.hide({ fade: true }).catch(() => {
            // Already hidden, or no splash installed. Not worth surfacing.
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer.id) clearTimeout(timer.id);
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

  if (state.phase === 'loading') return <SplashScreen />;

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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  errorPad: { padding: space.xxl },
  center: { textAlign: 'center' },
});
