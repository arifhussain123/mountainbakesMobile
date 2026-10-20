import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChangeOwnPassword } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { Icon, PasswordField, PillButton, Screen } from '@/shared/ui';
import { useAuthStore } from '@/state';
import {
  PASSWORD_STRENGTH_LABELS,
  canSubmitPasswordChange,
  changePasswordProblem,
  passwordChecks,
  passwordScore,
  passwordStrengthTone,
} from '../../passwordPolicy';

/**
 * The forced password change — the web's `/change-password`. RootNavigator
 * shows this in place of every role's app while the signed-in user has
 * `mustChangePassword` (an admin reset them to a temporary password), exactly
 * as the web's RouteGuard sends such a user here from every route; the API
 * refuses everything else with `password_change_required` meanwhile.
 *
 * Same validation as the web (`ChangePasswordSchema`: the strong policy plus a
 * matching confirmation), same call (`POST /api/auth/change-password` with
 * `{ newPassword }`). On success the session is refreshed so the cleared flag
 * comes back from the server, and the gate lifts by itself — no navigation here.
 */
export function ChangePasswordScreen() {
  const theme = useAppTheme();
  const { contentWidth } = useResponsive();
  const logout = useAuthStore((s) => s.logout);
  const completePasswordChange = useAuthStore((s) => s.completePasswordChange);
  const change = useChangeOwnPassword();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);

  const submitting = change.isPending || finishing;
  const canSubmit = canSubmitPasswordChange(newPassword, confirmPassword, submitting);

  const submit = async () => {
    setError('');
    const problem = changePasswordProblem(newPassword, confirmPassword);
    if (problem) {
      setError(problem);
      return;
    }
    Keyboard.dismiss();
    try {
      await change.mutateAsync(newPassword);
    } catch (e) {
      const msg = mapErrorToMessage(e);
      setError(msg);
      return;
    }
    setFinishing(true);
    try {
      await completePasswordChange();
      Alert.alert('Password Updated', 'Password updated. Welcome!');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen glow="warm">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { padding: theme.spacing.xl }]} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: contentWidth(420), alignSelf: 'center', gap: 14 }}>
            <View style={styles.head}>
              <View style={[styles.badge, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
                <Icon name="lock" size={22} color={theme.colors.primary} />
              </View>
              <Text accessibilityRole="header" style={[theme.typography.screenTitle, styles.center, { color: theme.colors.text }]}>
                Set a new password
              </Text>
              <Text style={[theme.typography.body, styles.center, { color: theme.colors.textSecondary }]}>
                For your security you must set a new password before continuing.
              </Text>
            </View>

            <PasswordField
              label="New password"
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                setError('');
              }}
              placeholder="••••••••"
              autoFocus
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!submitting}
              testID="change-password-new"
            />

            <StrengthMeter password={newPassword} />

            <View style={{ gap: 4 }}>
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setError('');
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!submitting}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                testID="change-password-confirm"
              />
              {confirmPassword && newPassword !== confirmPassword ? (
                <Text style={[theme.typography.label, { color: theme.colors.danger }]}>Passwords do not match</Text>
              ) : null}
            </View>

            {error ? (
              <View style={[styles.banner, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.danger }]}>
                <Icon name="warning" size={16} color={theme.colors.danger} />
                <Text accessibilityLiveRegion="assertive" style={[theme.typography.bodySmall, { color: theme.colors.danger, flex: 1 }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <PillButton
              label={submitting ? 'Updating…' : 'Update Password'}
              onPress={() => void submit()}
              loading={submitting}
              disabled={!canSubmit}
              testID="change-password-submit"
            />

            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
              <Pressable accessibilityRole="button" onPress={() => void logout()} hitSlop={8} disabled={submitting}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Not you? Sign out</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** The web's PasswordStrengthMeter: five bars, the strength word and every rule ticked or crossed. */
function StrengthMeter({ password }: { password: string }) {
  const theme = useAppTheme();
  if (!password) return null;
  const score = passwordScore(password);
  const toneColor = theme.colors[passwordStrengthTone(score)];
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < score ? toneColor : theme.colors.border }]} />
        ))}
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        Strength: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{PASSWORD_STRENGTH_LABELS[score]}</Text>
      </Text>
      {passwordChecks(password).map((c) => (
        <View key={c.label} style={styles.check}>
          <Icon name={c.passed ? 'check' : 'close'} size={13} color={c.passed ? theme.colors.success : theme.colors.textSecondary} />
          <Text style={[theme.typography.label, { color: c.passed ? theme.colors.success : theme.colors.textSecondary }]}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  head: { alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1, borderRadius: 14 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, alignItems: 'center' },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
