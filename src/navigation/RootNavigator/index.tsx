import { useEffect, type ComponentType } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComingSoonScreen } from '@/features/placeholder';
import { useAuthStore } from '@/state';
import { AuthNavigator } from '../AuthNavigator';
import { selectAuthRoute } from '../authRoute';
import { DrawerNavigator } from '../DrawerNavigator';
import { FinanceDrawerNavigator } from '../FinanceDrawerNavigator';
import { ProductionDrawerNavigator } from '../ProductionDrawerNavigator';
import { navigationRef } from '../helpers';
import { Routes } from '../routes';
import type { RootStackParamList } from '../types';
import { SplashView } from './SplashView';
import { UnsupportedRoleView } from './UnsupportedRoleView';

const Stack = createNativeStackNavigator<RootStackParamList>();

const FINANCE_ROLES = new Set([
  'finance_admin',
  'finance_manager',
  'accountant',
  'finance_auditor',
]);

/**
 * Decides Auth vs. which app shell from `selectAuthRoute(status,
 * onboardingCompleted)` + the signed-in user's role — the one place that
 * decision is made. `branch_manager` gets the branchApp.md shell,
 * `production_user` gets mountainbakesProduction.html's, a finance role gets
 * mountainbakesFinance.html's (placeholder until built), and anything else
 * (super_admin) gets an explicit "not built for this role" screen rather than
 * silently falling back to one it was never designed for.
 *
 * The switch between the Auth stack and the main shell is driven by the auth
 * store, not by an explicit `navigation.reset` from the login screen: once
 * `status` becomes `signedIn` the Auth stack is unmounted and the main shell is
 * the only route, so Back can never return to Login.
 */
export function RootNavigator() {
  const status = useAuthStore(state => state.status);
  const onboardingCompleted = useAuthStore(state => state.onboardingCompleted);
  const bootstrap = useAuthStore(state => state.bootstrap);
  const role = useAuthStore(state => state.user?.role);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const route = selectAuthRoute(status, onboardingCompleted);
  if (route === 'splash') return <SplashView />;

  let mainScreen: {
    name:
      | typeof Routes.DRAWER
      | typeof Routes.PRODUCTION_DRAWER
      | typeof Routes.FINANCE_DRAWER
      | typeof Routes.UNSUPPORTED_ROLE;
    component: ComponentType;
  };
  if (role === 'branch_manager')
    mainScreen = { name: Routes.DRAWER, component: DrawerNavigator };
  else if (role === 'production_user')
    mainScreen = {
      name: Routes.PRODUCTION_DRAWER,
      component: ProductionDrawerNavigator,
    };
  else if (role && FINANCE_ROLES.has(role))
    mainScreen = {
      name: Routes.FINANCE_DRAWER,
      component: FinanceDrawerNavigator,
    };
  else
    mainScreen = {
      name: Routes.UNSUPPORTED_ROLE,
      component: UnsupportedRoleView,
    };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {route === 'main' ? (
          <Stack.Screen
            name={mainScreen.name}
            component={mainScreen.component}
          />
        ) : (
          <Stack.Screen name={Routes.AUTH} component={AuthNavigator} />
        )}
        <Stack.Screen
          name={Routes.COMING_SOON}
          component={ComingSoonScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
