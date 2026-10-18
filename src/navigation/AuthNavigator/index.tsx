import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForgotPasswordScreen, LoginScreen, ONBOARDING_SEEN_KEY, OnboardingScreen } from '@/features/auth';
import { Routes } from '../routes';
import type { AuthStackParamList } from '../types';
import { resolveInitialRoute } from './resolveInitialRoute';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof AuthStackParamList | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((seen) => setInitialRoute(resolveInitialRoute(seen)))
      .catch(() => setInitialRoute(Routes.LOGIN));
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name={Routes.ONBOARDING} component={OnboardingScreen} />
      <Stack.Screen name={Routes.LOGIN} component={LoginScreen} />
      <Stack.Screen name={Routes.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
