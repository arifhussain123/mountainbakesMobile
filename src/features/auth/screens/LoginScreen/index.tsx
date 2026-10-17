import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import Animated, { Extrapolation, interpolate, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { images } from '@/assets';
import { Routes, type AuthStackParamList } from '@/navigation';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { Checkbox, Icon, PasswordField, PillButton, Screen, TextField } from '@/shared/ui';
import { useAuthStore } from '@/state';
import { loginSchema, type LoginFormValues } from '../../loginSchema';
import { mapLoginError } from '../../mapLoginError';
import { useLogin } from '../../useLogin';
import { styles } from './styles';

// Below this, the logo/headline are fully shrunk — a rough "keyboard is
// substantially open" threshold, not tied to any one device's exact
// keyboard height (which this doesn't need to match pixel-for-pixel, only
// read as "shrinking as the keyboard rises").
const KEYBOARD_SHRINK_RANGE = 150;
const LOGIN_LOGO_SHRUNK = 56;

export function LoginScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const rememberedEmail = useAuthStore((state) => state.rememberedEmail);
  const { isOffline } = useNetworkStatus();
  const loginMutation = useLogin();
  const { width, size, clamp, contentWidth } = useResponsive();
  const logoSize = clamp(80, width * 0.24, 120);
  const fieldHeight = size(52, 48, 56);
  const inputFontSize = size(15, 14, 17);
  const labelFontSize = size(13, 12, 15);
  const buttonHeight = size(54, 48, 58);
  const buttonLabelSize = size(16, 15, 18);
  const maxWidth = contentWidth(420);
  const headlineSize = size(34, 28, 40);
  const headlineSizeShrunk = size(26, 22, 30);

  // `useAnimatedKeyboard()` tracks the native keyboard's own show/hide
  // animation on the UI thread, so this stays perfectly in sync with it
  // instead of guessing a duration — "smooth animation" per the brief,
  // without hand-tuning a timing curve to match each platform's keyboard.
  const keyboard = useAnimatedKeyboard();
  const keyboardOpenFraction = useDerivedValue(() => interpolate(keyboard.height.value, [0, KEYBOARD_SHRINK_RANGE], [0, 1], Extrapolation.CLAMP));
  const logoAnimatedStyle = useAnimatedStyle(() => {
    const shrunkSize = interpolate(keyboardOpenFraction.value, [0, 1], [logoSize, LOGIN_LOGO_SHRUNK]);
    return { width: shrunkSize, height: shrunkSize, borderRadius: shrunkSize / 2 };
  });
  const headlineAnimatedStyle = useAnimatedStyle(() => {
    const shrunkSize = interpolate(keyboardOpenFraction.value, [0, 1], [headlineSize, headlineSizeShrunk]);
    return { fontSize: shrunkSize, lineHeight: shrunkSize * 1.125 };
  });

  const [rememberMe, setRememberMe] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const passwordRef = useRef<any>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: rememberedEmail ?? '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (isSubmitting || loginMutation.isPending) return;
    setBannerError(null);

    if (isOffline) {
      setBannerError("You're offline. Connect to sign in for the first time.");
      return;
    }

    try {
      await loginMutation.mutateAsync({ ...values, rememberMe });
      // RootNavigator swaps to the signed-in shell the moment authStore.status
      // flips to 'signedIn' — no imperative navigation needed here.
    } catch (error) {
      setBannerError(mapLoginError(error));
    }
  });

  const busy = isSubmitting || loginMutation.isPending;

  return (
    <Screen glow="warm">
      <Pressable style={styles.flex} onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.xl }]}
            keyboardShouldPersistTaps="handled">
            <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>
              <Animated.Image source={images.logo} style={[styles.logo, logoAnimatedStyle]} />

              <Animated.Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.2}
                style={[theme.typography.screenTitle, styles.headline, { color: theme.colors.text }, headlineAnimatedStyle]}>
                WELCOME{'\n'}
                <Text style={{ color: theme.colors.primary }}>BACK</Text>
              </Animated.Text>
              <Text
                maxFontSizeMultiplier={1.2}
                style={[theme.typography.body, styles.subtitle, { color: theme.colors.textSecondary, fontSize: size(14, 13, 16) }]}>
                Sign in to open your branch.
              </Text>

              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <TextField
                    label="Email"
                    required
                    error={errors.email?.message}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="you@mountainbakes.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    height={fieldHeight}
                    labelFontSize={labelFontSize}
                    inputFontSize={inputFontSize}
                    testID="login-email"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <PasswordField
                    label="Password"
                    required
                    error={errors.password?.message}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={passwordRef}
                    placeholder="••••••••"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={() => void onSubmit()}
                    height={fieldHeight}
                    labelFontSize={labelFontSize}
                    inputFontSize={inputFontSize}
                    testID="login-password"
                  />
                )}
              />

              <View style={styles.rememberRow}>
                <Checkbox checked={rememberMe} onChange={setRememberMe} accessibilityLabel="Remember me" testID="login-remember-me" />
                <View style={styles.rememberTextCol}>
                  <View style={styles.rememberHeaderRow}>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>Remember me</Text>
                    <Pressable accessibilityRole="link" onPress={() => navigation.navigate(Routes.FORGOT_PASSWORD)}>
                      <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Forgot password?</Text>
                    </Pressable>
                  </View>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>
                    Fills in your email next time. Your password is never saved.
                  </Text>
                </View>
              </View>

              {bannerError ? (
                <View style={[styles.banner, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.danger }]}>
                  <Text accessibilityLiveRegion="assertive" style={[theme.typography.bodySmall, styles.bannerText, { color: theme.colors.danger }]}>
                    {bannerError}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={() => setBannerError(null)}>
                    <Icon name="close" size={16} color={theme.colors.danger} />
                  </Pressable>
                </View>
              ) : null}

              <View style={{ marginTop: theme.spacing.xl }}>
                <PillButton
                  label="Sign In"
                  onPress={() => void onSubmit()}
                  loading={busy}
                  disabled={busy}
                  showArrow
                  height={buttonHeight}
                  labelFontSize={buttonLabelSize}
                  testID="login-submit"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </Screen>
  );
}
