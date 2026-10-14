import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, Screen } from '@/shared/ui';
import { images } from '@/assets';
import { useLoginForm } from '../../hooks';
import { styles } from './styles';

export function LoginScreen() {
  const theme = useAppTheme();
  const { identifier, setIdentifier, password, setPassword, rememberMe, setRememberMe, isSubmitting, errorMessage, canSubmit, submit } =
    useLoginForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Screen glow="warm">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.xl }]} keyboardShouldPersistTaps="handled">
          <Image source={images.logo} style={styles.logo} />
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text, textAlign: 'center', marginTop: theme.spacing.lg }]}>
            Welcome Back
          </Text>
          <Text
            style={[theme.typography.body, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs }]}>
            Sign in to open your branch.
          </Text>

          <View style={styles.field}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Email</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@mountainbakes.com"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Password</Text>
            <View style={[styles.passwordRow, { marginTop: 6, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                style={[styles.passwordInput, { color: theme.colors.text }]}
              />
              <Pressable accessibilityRole="button" onPress={() => setShowPassword((v) => !v)} style={{ paddingHorizontal: theme.spacing.md }}>
                <Text style={[theme.typography.label, { color: theme.colors.primary }]}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
            onPress={() => setRememberMe((v) => !v)}
            style={styles.rememberRow}>
            <View style={[styles.checkbox, { borderColor: theme.colors.border, backgroundColor: rememberMe ? theme.colors.primary : 'transparent' }]}>
              {rememberMe ? <Icon name="check" size={12} color={theme.colors.primaryText} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>Remember me</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                Fills in your email next time. Your password is never saved.
              </Text>
            </View>
          </Pressable>

          {errorMessage ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.lg, textAlign: 'center' }]}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={{ marginTop: theme.spacing.xl }}>
            <PrimaryButton label="Sign In" onPress={() => void submit()} loading={isSubmitting} disabled={!canSubmit} testID="login-submit" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
