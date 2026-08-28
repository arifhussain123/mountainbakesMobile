import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForgotPasswordScreen } from '@/features/auth';
import { FinanceSignInScreen } from '@/features/auth';
import { SignInScreen } from '@/features/auth';

export type AuthStackParamList = {
  SignIn: undefined;
  FinanceSignIn: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Unauthenticated stack.
 *
 * Finance is a separate sign-in rather than a mode of the main one: it takes a
 * Finance User ID instead of an email, may require TOTP, and admits only the
 * finance roles.
 *
 * There is no ChangePassword route here — that gate applies to an already
 * authenticated session and lives in RootNavigator.
 */
export function AuthNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="FinanceSignIn">
        {({ navigation }) => <FinanceSignInScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="ForgotPassword">
        {({ navigation }) => <ForgotPasswordScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
