import { useRef } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { images } from '@/assets';
import { Routes } from '@/navigation/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/shared/theme';
import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineBanner } from '@/shared/ui/InlineBanner';
import { PasswordField } from '@/shared/ui/PasswordField';
import { PillButton } from '@/shared/ui/PillButton';
import { Screen } from '@/shared/ui/Screen';
import { TextField, type TextFieldHandle } from '@/shared/ui/TextField';
import { useLoginForm } from '../../hooks';
import { styles } from './styles';

/** mountainbakesBranch.html screen 02c on the Charcoal/Orange tokens. */
export function LoginScreen() {
  const { colors, typography } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { form, onSubmit, isPending, errorMessage, clearError } =
    useLoginForm();
  const {
    control,
    formState: { errors },
  } = form;
  const passwordRef = useRef<TextFieldHandle>(null);

  return (
    <Screen glow="warm">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          testID="login-scroll"
        >
          {/* A tap anywhere outside a control dismisses the keyboard. */}
          <Pressable
            style={styles.flex}
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <Image
              source={images.logo}
              style={styles.logo}
              resizeMode="contain"
              accessible
              accessibilityLabel="Mountain Bakes"
            />
            <Text
              accessibilityRole="header"
              accessibilityLabel="Welcome back"
              style={[
                typography.brandHeadline,
                styles.headline,
                { color: colors.textPrimary },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Welcome{'\n'}
              <Text style={{ color: colors.accent }}>Back</Text>
            </Text>
            <Text
              style={[
                typography.brandBody,
                styles.subtitle,
                { color: colors.textMuted },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Sign in to open your branch.
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  label="Email"
                  required
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  placeholder="you@mountainbakes.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  importantForAutofill="yes"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!isPending}
                  containerStyle={styles.field}
                  testID="login-email"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <PasswordField
                  ref={passwordRef}
                  label="Password"
                  required
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  placeholder="Your password"
                  autoComplete="password"
                  textContentType="password"
                  importantForAutofill="yes"
                  returnKeyType="go"
                  onSubmitEditing={() => void onSubmit()}
                  editable={!isPending}
                  containerStyle={styles.field}
                  testID="login-password"
                />
              )}
            />

            <Controller
              control={control}
              name="rememberMe"
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  checked={value}
                  onChange={onChange}
                  label="Remember me"
                  helper="Fills in your email next time. Your password is never saved."
                  testID="login-remember"
                  trailing={
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel="Forgot password?"
                      onPress={() =>
                        navigation.navigate(Routes.FORGOT_PASSWORD)
                      }
                      hitSlop={8}
                      style={styles.link}
                      testID="login-forgot"
                    >
                      <Text
                        style={[typography.brandLink, { color: colors.accent }]}
                        maxFontSizeMultiplier={1.3}
                      >
                        Forgot password?
                      </Text>
                    </Pressable>
                  }
                />
              )}
            />

            {errorMessage ? (
              <InlineBanner
                message={errorMessage}
                onDismiss={clearError}
                style={styles.banner}
                testID="login-error"
              />
            ) : null}

            <PillButton
              label="Sign in"
              onPress={() => void onSubmit()}
              loading={isPending}
              accessibilityHint="Signs in and opens your branch"
              style={styles.button}
              testID="login-submit"
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
