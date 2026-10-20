import { useEffect, useMemo, type ComponentType } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GlobalSearchScreen } from '@/features/admin';
import { ChangePasswordScreen } from '@/features/auth';
import { NotificationsScreen } from '@/features/notifications';
import { ComingSoonScreen } from '@/features/placeholder';
import { NewQueryScreen, QueryDetailScreen } from '@/features/support';
import { useAppTheme } from '@/shared/theme';
import { useAuthStore } from '@/state';
import { AuthNavigator } from '../AuthNavigator';
import { DrawerNavigator } from '../DrawerNavigator';
import { FinanceDrawerNavigator } from '../FinanceDrawerNavigator';
import { ProductionDrawerNavigator } from '../ProductionDrawerNavigator';
import { SuperAdminDrawerNavigator } from '../SuperAdminDrawerNavigator';
import { navigationRef } from '../helpers';
import { getRoleShell, type ShellRoute } from '../roleShells';
import { Routes } from '../routes';
import type { RootStackParamList } from '../types';
import { SplashView } from './SplashView';
import { UnsupportedRoleView } from './UnsupportedRoleView';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SHELL_COMPONENT: Record<ShellRoute, ComponentType> = {
  [Routes.DRAWER]: DrawerNavigator,
  [Routes.PRODUCTION_DRAWER]: ProductionDrawerNavigator,
  [Routes.FINANCE_DRAWER]: FinanceDrawerNavigator,
  [Routes.SUPER_ADMIN_DRAWER]: SuperAdminDrawerNavigator,
  [Routes.UNSUPPORTED_ROLE]: UnsupportedRoleView,
};

/**
 * `NavigationContainer` paints its own chrome (the default-tab-bar/header
 * card background, the gap behind a custom `tabBar`, screen-transition
 * backdrops) from this theme — never from `useAppTheme()` reads elsewhere,
 * since screens/components get theirs through the hook directly. Left unset,
 * it falls back to React Navigation's own light `DefaultTheme` (white
 * `background`/`card`), which is exactly the white strip that used to show
 * through behind the floating notch tab bar. Now tracks the live
 * `useAppTheme()` (mode + accent), rebuilt from React Navigation's matching
 * Dark/DefaultTheme base so it follows Light/Dark/System same as everything else.
 */
function useNavigationTheme(): NavigationTheme {
  const theme = useAppTheme();
  return useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);
}

/**
 * Decides Auth vs. which app shell from `authStore.status` + the signed-in
 * user's role. Which shell a role gets is `ROLE_SHELLS` (`roleShells.ts`), not
 * decided here: `branch_manager` gets the branchApp.md shell, `production_user`
 * mountainbakesProduction.html's, a finance role mountainbakesFinance.html's,
 * super_admin its own, and anything else an explicit "not built for this role"
 * screen rather than one it was never designed for.
 *
 * A signed-in user with `mustChangePassword` (an admin reset them to a
 * temporary password) gets only the forced Change Password screen, whatever
 * the role — the web RouteGuard's gate, which comes before role routing.
 * Completing it refreshes the session, the flag clears, and the shell mounts.
 */
export function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const role = useAuthStore((state) => state.user?.role);
  const mustChangePassword = useAuthStore((state) => state.user?.mustChangePassword === true);
  const navigationTheme = useNavigationTheme();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status === 'bootstrapping') return <SplashView />;

  const shellRoute = getRoleShell(role).route;

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'signedIn' && mustChangePassword ? (
          <Stack.Screen name={Routes.CHANGE_PASSWORD} component={ChangePasswordScreen} />
        ) : status === 'signedIn' ? (
          <Stack.Screen name={shellRoute} component={SHELL_COMPONENT[shellRoute]} />
        ) : (
          <Stack.Screen name={Routes.AUTH} component={AuthNavigator} />
        )}
        <Stack.Screen name={Routes.COMING_SOON} component={ComingSoonScreen} options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name={Routes.QUERY_DETAIL} component={QueryDetailScreen} options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name={Routes.NEW_QUERY} component={NewQueryScreen} options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name={Routes.NOTIFICATIONS} component={NotificationsScreen} options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name={Routes.GLOBAL_SEARCH} component={GlobalSearchScreen} options={{ presentation: 'modal', headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
