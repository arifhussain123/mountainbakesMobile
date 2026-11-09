import { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ForgotPasswordScreen,
  LoginScreen,
  OnboardingScreen,
} from '@/features/auth';
import { useAuthStore } from '@/state';
import { Routes } from '../routes';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Onboarding → Login → (Forgot password). The first route is decided once,
 * from the flag `authStore.bootstrap()` already loaded — so there is no blank
 * frame while storage is read, and completing onboarding mid-flow (which flips
 * the flag) does not remount this stack: the pager resets to Login itself.
 */
export function AuthNavigator() {
  const onboardingCompleted = useAuthStore(state => state.onboardingCompleted);
  const [initialRoute] = useState<keyof AuthStackParamList>(() =>
    onboardingCompleted ? Routes.LOGIN : Routes.ONBOARDING,
  );

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name={Routes.ONBOARDING} component={OnboardingScreen} />
      <Stack.Screen name={Routes.LOGIN} component={LoginScreen} />
      <Stack.Screen
        name={Routes.FORGOT_PASSWORD}
        component={ForgotPasswordScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
