import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBInput } from '@/components';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Sign-in.
 *
 * Calls Supabase directly — the Express API has no login endpoint. Role and
 * branch then come from the returned session's `app_metadata`, never from this
 * form. An account with no recognised role is signed straight back out by the
 * auth store rather than being given a default.
 */

const SignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type SignInValues = z.infer<typeof SignInSchema>;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

export function SignInScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const signIn = useAuthStore(s => s.signIn);
  const isOnline = useNetworkStore(s => s.isOnline);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInValues) => {
    Keyboard.dismiss();
    setSubmitError(null);
    try {
      await signIn(values.email.trim(), values.password);
      // On success the auth store flips to 'signedIn' and RootNavigator swaps
      // the stack — there is nothing to navigate to from here.
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not sign in. Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: theme.layout.screenPad }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={[theme.type.display, { color: theme.colors.primary }]}>Mountain Bakes</Text>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            Fresh • Quality • Every Day
          </Text>
        </View>

        <View style={[styles.form, { gap: theme.space.lg }]}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <MBInput
                label="Email"
                required
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                placeholder="you@mountainbakes.com"
                editable={!isSubmitting}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <MBInput
                label="Password"
                required
                isPassword
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit(onSubmit)}
                editable={!isSubmitting}
              />
            )}
          />

          {submitError ? (
            <Text
              accessibilityRole="alert"
              style={[theme.type.body, { color: theme.colors.danger }]}>
              {submitError}
            </Text>
          ) : null}

          {!isOnline ? (
            <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
              You're offline. Signing in needs a connection.
            </Text>
          ) : null}

          <MBButton
            label="Sign in"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={!isOnline}
            fullWidth
          />

          <MBButton
            label="Forgot password?"
            onPress={() => navigation.navigate('ForgotPassword')}
            variant="ghost"
            size="md"
          />
        </View>

        <View style={styles.footer}>
          <MBButton
            label="Finance Ledger sign-in"
            onPress={() => navigation.navigate('FinanceSignIn')}
            variant="secondary"
            size="md"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 40 },
  brand: { alignItems: 'center', gap: 6 },
  footer: { width: '100%' },
  form: { width: '100%' },
});
