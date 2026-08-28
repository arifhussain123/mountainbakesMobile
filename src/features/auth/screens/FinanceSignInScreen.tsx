import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBHeader, MBInput } from '@/common/ui';
import { FinanceLoginLookupSchema } from '@/shared/schemas/finance.schemas';
import { useAuthStore } from '@/state/authStore';
import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn } from '@/common/theme/spacing';

/**
 * Finance Ledger sign-in.
 *
 * A separate entry point because Finance is a separate product surface: staff
 * are issued a "Finance User ID" rather than an email, the account may require
 * TOTP, and only the four finance roles (plus a view-only super_admin) may pass.
 *
 * Every failure below reports the SAME message. The server's lookup endpoint is
 * enumeration-hardened — an unknown ID, a non-finance account and a deactivated
 * one are indistinguishable by design — and reporting them differently here
 * would undo that server-side effort from the client.
 */

const CredentialsSchema = z.object({
  userId: FinanceLoginLookupSchema.shape.userId,
  password: z.string().min(1, 'Enter your password'),
});
type CredentialsValues = z.infer<typeof CredentialsSchema>;

const MfaSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
type MfaValues = z.infer<typeof MfaSchema>;

export function FinanceSignInScreen({ onBack }: { onBack: () => void }): React.ReactElement {
  const theme = useTheme();
  const signInFinance = useAuthStore(s => s.signInFinance);
  const verifyMfa = useAuthStore(s => s.verifyMfa);
  const cancelMfa = useAuthStore(s => s.cancelMfa);
  const mfaChallenge = useAuthStore(s => s.mfaChallenge);
  const isOnline = useNetworkStore(s => s.isOnline);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const credentials = useForm<CredentialsValues>({
    resolver: zodResolver(CredentialsSchema),
    defaultValues: { userId: '', password: '' },
  });

  const mfa = useForm<MfaValues>({
    resolver: zodResolver(MfaSchema),
    defaultValues: { code: '' },
  });

  const onSubmitCredentials = async (values: CredentialsValues) => {
    Keyboard.dismiss();
    setSubmitError(null);
    try {
      await signInFinance(values.userId.trim(), values.password);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Those sign-in details were not recognised.',
      );
    }
  };

  const onSubmitMfa = async (values: MfaValues) => {
    Keyboard.dismiss();
    setSubmitError(null);
    try {
      await verifyMfa(values.code);
    } catch (error) {
      mfa.reset({ code: '' });
      setSubmitError(error instanceof Error ? error.message : 'That code was not accepted.');
    }
  };

  const handleCancelMfa = async () => {
    // The aal1 session from step one must not survive an abandoned verification.
    await cancelMfa();
    mfa.reset({ code: '' });
    setSubmitError(null);
  };

  if (mfaChallenge) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
        <MBHeader title="Two-factor verification" onBack={handleCancelMfa} />
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.lg },
          ]}
          keyboardShouldPersistTaps="handled">
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            Enter the 6-digit code from your authenticator app.
          </Text>

          <Controller
            control={mfa.control}
            name="code"
            render={({ field: { onChange, onBlur, value } }) => (
              <MBInput
                label="Verification code"
                required
                numeric
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={mfa.formState.errors.code?.message}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={mfa.handleSubmit(onSubmitMfa)}
                editable={!mfa.formState.isSubmitting}
                placeholder="000000"
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

          <MBButton
            label="Verify"
            onPress={mfa.handleSubmit(onSubmitMfa)}
            loading={mfa.formState.isSubmitting}
            disabled={!isOnline}
            fullWidth
          />
          <MBButton label="Cancel" onPress={handleCancelMfa} variant="ghost" size="md" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
      <MBHeader title="Finance sign-in" onBack={onBack} />
      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Sign in with your Finance User ID. For Branch, Production or Admin access, use the main
          sign-in.
        </Text>

        <Controller
          control={credentials.control}
          name="userId"
          render={({ field: { onChange, onBlur, value } }) => (
            <MBInput
              label="Finance User ID"
              required
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={credentials.formState.errors.userId?.message}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!credentials.formState.isSubmitting}
              // An email is accepted too, so an admin who only knows the address
              // is not locked out of their own module.
              hint="Your ID, or the account's email address"
            />
          )}
        />

        <Controller
          control={credentials.control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <MBInput
              label="Password"
              required
              isPassword
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={credentials.formState.errors.password?.message}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={credentials.handleSubmit(onSubmitCredentials)}
              editable={!credentials.formState.isSubmitting}
            />
          )}
        />

        {submitError ? (
          <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.danger }]}>
            {submitError}
          </Text>
        ) : null}

        {!isOnline ? (
          <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
            You're offline. Signing in needs a connection.
          </Text>
        ) : null}

        <MBButton
          label="Sign in to Finance"
          onPress={credentials.handleSubmit(onSubmitCredentials)}
          loading={credentials.formState.isSubmitting}
          disabled={!isOnline}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
