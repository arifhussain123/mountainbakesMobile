import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBCheckbox, MBInput } from '@/components';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import {
  forgetIdentity,
  rememberedIdentity,
  rememberIdentity,
} from '@/services/storage/secureStorage';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumn, space } from '@/theme/spacing';

/**
 * Sign-in.
 *
 * Calls Supabase directly — the Express API has no login endpoint. Role and
 * branch then come from the returned session's `app_metadata`, never from this
 * form. An account with no recognised role is signed straight back out by the
 * auth store rather than being given a default.
 */

const SignInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
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

  /**
   * Read once, at first render. `initStorage()` has already completed during
   * bootstrap, so this is a synchronous read and the field is prefilled on the
   * first frame rather than appearing a beat later.
   */
  const [remembered] = useState(rememberedIdentity);
  const [remember, setRemember] = useState(remembered.remember);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: remembered.email, password: '' },
  });

  const onSubmit = async (values: SignInValues) => {
    Keyboard.dismiss();
    setSubmitError(null);
    try {
      const email = values.email.trim();
      await signIn(email, values.password);
      // Only after the credentials are known good — remembering an address that
      // failed to sign in would prefill a typo forever.
      if (remember) rememberIdentity(email);
      else forgetIdentity();
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
        contentContainerStyle={[contentColumn, styles.content, { padding: theme.layout.screenPad }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={[theme.type.display, { color: theme.colors.accent }]}>Mountain Bakes</Text>
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

          <MBCheckbox
            checked={remember}
            onChange={setRemember}
            label="Remember me on this device"
            hint="Fills in your email next time. Your password is never saved."
            disabled={isSubmitting}
            testID="remember-me"
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
  content: { flexGrow: 1, justifyContent: 'center', gap: space.xxxl },
  brand: { alignItems: 'center', gap: space.tight },
  footer: { width: '100%' },
  form: { width: '100%' },
});
