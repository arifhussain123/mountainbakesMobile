import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBCard, MBHeader, MBInput } from '@/components';
import { ApiError } from '@/services/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Password recovery request.
 *
 * Recovery is restricted to Administrator accounts — the server enforces it and
 * returns 403 with `code: 'not-admin'` for non-admins AND for unknown addresses,
 * so the response never reveals whether an account exists. That distinction is
 * preserved here: the 403 message is about eligibility, not about the address.
 *
 * The reset link opens the WEB app, since this app has no deep-link scheme
 * registered. The success copy says so, or the user waits for something that
 * will never open here.
 */

const ForgotSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
});

type ForgotValues = z.infer<typeof ForgotSchema>;

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }): React.ReactElement {
  const theme = useTheme();
  const requestPasswordReset = useAuthStore(s => s.requestPasswordReset);
  const isOnline = useNetworkStore(s => s.isOnline);

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotValues) => {
    Keyboard.dismiss();
    setSubmitError(null);
    const email = values.email.trim();

    try {
      await requestPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setSubmitError(
          'Password recovery is only available for Administrator accounts. Please contact your system administrator.',
        );
        return;
      }
      setSubmitError(
        error instanceof Error ? error.message : 'Could not send the reset email. Try again.',
      );
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
      <MBHeader title="Reset password" onBack={onBack} />

      <ScrollView
        contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.lg }}
        keyboardShouldPersistTaps="handled">
        {sentTo ? (
          <MBCard>
            <View style={styles.body}>
              <Text style={[theme.type.h3, { color: theme.colors.success }]}>Check your email</Text>
              <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
                If {sentTo} is an Administrator account, a reset link is on its way.
              </Text>
              <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
                The link opens the Mountain Bakes web app. Set your new password there, then come
                back and sign in here.
              </Text>
              <MBButton label="Back to sign in" onPress={onBack} variant="secondary" />
            </View>
          </MBCard>
        ) : (
          <>
            <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
              Enter the email for your Administrator account and we'll send a reset link.
            </Text>

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
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  editable={!isSubmitting}
                  placeholder="admin@mountainbakes.com"
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
                You're offline. Sending a reset link needs a connection.
              </Text>
            ) : null}

            <MBButton
              label="Send reset link"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={!isOnline}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: 10 },
});
