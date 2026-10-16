import { useEffect, type ComponentType } from 'react';
import { DarkTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComingSoonScreen } from '@/features/placeholder';
import { NewQueryScreen, QueryDetailScreen } from '@/features/support';
import { darkColors } from '@/shared/theme';
import { useAuthStore } from '@/state';
import { AuthNavigator } from '../AuthNavigator';
import { DrawerNavigator } from '../DrawerNavigator';
import { FinanceDrawerNavigator } from '../FinanceDrawerNavigator';
import { ProductionDrawerNavigator } from '../ProductionDrawerNavigator';
import { navigationRef } from '../helpers';
import { Routes } from '../routes';
import type { RootStackParamList } from '../types';
import { SplashView } from './SplashView';
import { UnsupportedRoleView } from './UnsupportedRoleView';

const Stack = createNativeStackNavigator<RootStackParamList>();

const FINANCE_ROLES = new Set(['finance_admin', 'finance_manager', 'accountant', 'finance_auditor']);

/**
 * `NavigationContainer` paints its own chrome (the default-tab-bar/header
 * card background, the gap behind a custom `tabBar`, screen-transition
 * backdrops) from this theme — never from `useAppTheme()`, which only the
 * app's own screens/components read. Left unset, it falls back to React
 * Navigation's light `DefaultTheme` (white `background`/`card`), which is
 * exactly the white strip that showed through behind the floating notch tab
 * bar: the bar's own margins reveal the navigator's chrome color underneath,
 * not any Android system chrome. The app is fixed to one dark theme (no
 * light/dark toggle), so this is built from `darkColors` directly rather than
 * switching on the OS setting.
 */
const navigationTheme: NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.danger,
  },
};

/**
 * Decides Auth vs. which app shell from `authStore.status` + the signed-in
 * user's role — the one place that decision is made. `branch_manager` gets
 * the branchApp.md shell, `production_user` gets mountainbakesProduction.html's,
 * a finance role gets mountainbakesFinance.html's (placeholder until built),
 * and anything else (super_admin) gets an explicit "not built for this role"
 * screen rather than silently falling back to one it was never designed for.
 */
export function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const role = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status === 'bootstrapping') return <SplashView />;

  let mainScreen: { name: typeof Routes.DRAWER | typeof Routes.PRODUCTION_DRAWER | typeof Routes.FINANCE_DRAWER | typeof Routes.UNSUPPORTED_ROLE; component: ComponentType };
  if (role === 'branch_manager') mainScreen = { name: Routes.DRAWER, component: DrawerNavigator };
  else if (role === 'production_user') mainScreen = { name: Routes.PRODUCTION_DRAWER, component: ProductionDrawerNavigator };
  else if (role && FINANCE_ROLES.has(role)) mainScreen = { name: Routes.FINANCE_DRAWER, component: FinanceDrawerNavigator };
  else mainScreen = { name: Routes.UNSUPPORTED_ROLE, component: UnsupportedRoleView };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'signedIn' ? (
          <Stack.Screen name={mainScreen.name} component={mainScreen.component} />
        ) : (
          <Stack.Screen name={Routes.AUTH} component={AuthNavigator} />
        )}
        <Stack.Screen name={Routes.COMING_SOON} component={ComingSoonScreen} options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name={Routes.QUERY_DETAIL} component={QueryDetailScreen} options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name={Routes.NEW_QUERY} component={NewQueryScreen} options={{ presentation: 'modal', headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
