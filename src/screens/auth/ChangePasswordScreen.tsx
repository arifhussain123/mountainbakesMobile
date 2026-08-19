import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBCard, MBInput } from '@/components';
import { StrongPasswordSchema } from '@/shared/schemas/user.schemas';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Forced password change.
 *
 * Shown whenever the session carries `mustChangePassword`, ahead of every other
 * authenticated screen — typically after an admin reset issued a temporary
 * password. There is no way past it but to set a new one, or to sign out.
 *
 * The rules come from the server's own StrongPasswordSchema via the mirrored
 * shared/, so the client cannot drift from what the API will accept.
 */

const ChangeSchema = z
  .object({
    newPassword: StrongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine(v => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangeValues = z.infer<typeof ChangeSchema>;

/** Mirrors StrongPasswordSchema, for live feedback while typing. */
const RULES: ReadonlyArray<{ label: string; test: (v: string) => boolean }> = [
  { label: 'At least 8 characters', test: v => v.length >= 8 },
  { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: v => /[a-z]/.test(v) },
  { label: 'One number', test: v => /[0-9]/.test(v) },
  { label: 'One special character', test: v => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordScreen(): React.ReactElement {
  const theme = useTheme();
  const changePassword = useAuthStore(s => s.changePassword);
  const signOut = useAuthStore(s => s.signOut);
  const isOnline = useNetworkStore(s => s.isOnline);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeValues>({
    resolver: zodResolver(ChangeSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';

  const onSubmit = async (values: ChangeValues) => {
    Keyboard.dismiss();
    setSubmitError(null);
    try {
      await changePassword(values.newPassword);
      // No navigation here: clearing the claim flips the gate in RootNavigator.
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not update your password. Try again.',
      );
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: theme.layout.screenPad }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={[theme.type.h1, { color: theme.colors.text }]}>Set a new password</Text>
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            Your account needs a new password before you can continue.
          </Text>
        </View>

        <View style={{ gap: theme.space.lg }}>
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <MBInput
                label="New password"
                required
                isPassword
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.newPassword?.message}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                editable={!isSubmitting}
              />
            )}
          />

          <MBCard>
            <View style={styles.rules}>
              {RULES.map(rule => {
                const met = rule.test(newPassword);
                return (
                  <Text
                    key={rule.label}
                    style={[
                      theme.type.caption,
                      { color: met ? theme.colors.success : theme.colors.textMuted },
                    ]}>
                    {/* A glyph as well as colour, so the state is readable without
                        distinguishing green from grey. */}
                    {met ? '✓' : '○'} {rule.label}
                  </Text>
                );
              })}
            </View>
          </MBCard>

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <MBInput
                label="Confirm new password"
                required
                isPassword
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
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
              You're offline. Changing your password needs a connection.
            </Text>
          ) : null}

          <MBButton
            label="Update password"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={!isOnline}
            fullWidth
          />

          <MBButton label="Sign out" onPress={signOut} variant="ghost" size="md" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 28 },
  intro: { gap: 8 },
  rules: { gap: 6 },
});
