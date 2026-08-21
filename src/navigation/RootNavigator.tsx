import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';

import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { navigationRef } from '@/navigation/navigationRef';
import { ChangePasswordScreen } from '@/screens/auth/ChangePasswordScreen';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Root navigation.
 *
 * The stack shown is derived from auth state rather than navigated to. There is
 * no `navigate('SignIn')` on sign-out anywhere: when the session goes, the
 * authenticated tree unmounts, so no screen can linger holding stale
 * branch-scoped data.
 */
export function RootNavigator(): React.ReactElement {
  const theme = useTheme();
  const status = useAuthStore(s => s.status);
  const claims = useAuthStore(s => s.claims);

  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        // React Navigation spends `primary` on **type** — a header back
        // label, a default tab's active tint — so it takes the brand mark, not
        // the brand fill. The ember is 3.2:1 and would be unreadable there.
        primary: theme.colors.accent,
        background: theme.colors.bg,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);

  /**
   * Three states, in strict precedence:
   *
   *   not signed in            → auth stack
   *   signed in, must change   → change-password, and nothing else
   *   signed in                → the role's tabs
   *
   * The forced change-password gate sits ABOVE the navigators, and outside
   * NavigationContainer entirely. That is deliberate on both counts: it applies
   * to every role with no tab, deep link or back gesture that reaches a business
   * screen around it, and it needs no navigation of its own — the only ways out
   * are setting a password or signing out, both of which change auth state and
   * re-render this component.
   */
  const mustChangePassword = status === 'signedIn' && claims?.mustChangePassword === true;

  return (
    // The background is set here as well as on the navigation theme: the
    // container paints a frame later than this view, and without it the gap
    // between the native splash tearing down and the first navigator frame
    // shows through as white — jarring in dark mode.
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      {mustChangePassword ? (
        <ChangePasswordScreen />
      ) : (
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          {status === 'signedIn' && claims ? (
            <AppNavigator role={claims.role} branchId={claims.branchId} />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
