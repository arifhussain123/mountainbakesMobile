import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClientProvider } from '@tanstack/react-query';
import RNBootSplash from 'react-native-bootsplash';

import { MBButton } from '@/common/ui';
import { RootNavigator } from '@/navigation/RootNavigator';
import { queryClient } from '@/api/queryClient';
import { runBootSequence, type BootStep } from '@/common/boot/bootSequence';
import { useSettingsStore } from '@/state/settingsStore';
import { space } from '@/common/theme/spacing';
import { ThemeProvider, useTheme } from '@/common/theme/ThemeProvider';
import { SplashScreen } from '@/features/app/screens/SplashScreen';
import { withBootTimeout } from '@/common/utils/bootTimeout';

/**
 * App root.
 *
 * The start sequence itself lives in `services/boot/bootSequence.ts` — the order
 * is the design, and it is worth reading and testing in one place rather than
 * inferred from the shape of an effect. What stays here is the gate around it:
 * what the user sees while it runs, what they see when it does not, and what
 * happens to a run nobody is waiting for any more.
 *
 * A bootstrap failure surfaces a retry rather than hanging on the splash — an
 * unreadable Keychain or a failed migration is recoverable, and a spinner
 * forever is not a diagnosis.
 */

type BootState =
  | { phase: 'loading'; step: BootStep | null }
  | { phase: 'ready' }
  | { phase: 'failed'; message: string };

function useBootstrap(): { state: BootState; retry: () => void } {
  const [state, setState] = useState<BootState>({ phase: 'loading', step: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    const timer: { id?: ReturnType<typeof setTimeout> } = {};

    (async () => {
      try {
        // The whole sequence is raced, not each step: the budget is what the
        // user is waiting through, and per-step timeouts would let four slow
        // steps add up to a wait none of them individually exceeded.
        const result = await withBootTimeout(
          runBootSequence({
            isCancelled: () => cancelled,
            // Reported for the splash and for a crash log that would otherwise
            // say only "startup failed" — which step it died on is the whole
            // difference between a locked database and an unreachable API.
            onStep: step => {
              if (!cancelled) setState({ phase: 'loading', step });
            },
          }),
          timer,
        );
        dispose = result.dispose;
        // A run abandoned mid-flight still resolves — `withBootTimeout` cannot
        // cancel the work — so the listener it opened is torn down here rather
        // than leaked to a sequence nobody is watching.
        if (cancelled) {
          dispose();
          return;
        }
        setState({ phase: 'ready' });
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
      dispose?.();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ phase: 'loading', step: null });
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
  const accent = useSettingsStore(s => s.accent);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider mode={themeMode} accent={accent}>
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
