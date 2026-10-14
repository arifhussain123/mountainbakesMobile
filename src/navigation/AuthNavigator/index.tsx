import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen, ONBOARDING_SEEN_KEY, OnboardingScreen } from '@/features/auth';
import { Routes } from '../routes';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof AuthStackParamList | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((seen) => setInitialRoute(seen === 'true' ? Routes.LOGIN : Routes.ONBOARDING))
      .catch(() => setInitialRoute(Routes.LOGIN));
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name={Routes.ONBOARDING} component={OnboardingScreen} />
      <Stack.Screen name={Routes.LOGIN} component={LoginScreen} />
    </Stack.Navigator>
  );
}
