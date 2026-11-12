import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Extrapolation, interpolate, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { images } from '@/assets';
import { Routes, type AuthStackParamList } from '@/navigation';
import { useNetworkStatus } from '@/shared/hooks';
import { HERO_GRADIENT, useAppTheme, useResponsive } from '@/shared/theme';
import { Checkbox, Icon, InfoBanner, PasswordField, PillButton, Screen, Sphere3D, TextField } from '@/shared/ui';
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
const LOGIN_LOGO_SHRUNK = 48;
/** Redesign B02c: the violet header is 220pt tall including the status bar (rounded 36 at the bottom, in styles). */
const HERO_HEIGHT = 220;

export function LoginScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const rememberedEmail = useAuthStore((state) => state.rememberedEmail);
  const { isOffline } = useNetworkStatus();
  const loginMutation = useLogin();
  const insets = useSafeAreaInsets();
  const { size, contentWidth } = useResponsive();
  const logoSize = size(64, 56, 76);
  const fieldHeight = size(52, 48, 56);
  const inputFontSize = size(15, 14, 17);
  const labelFontSize = size(13, 12, 15);
  const buttonHeight = size(54, 48, 58);
  const buttonLabelSize = size(16, 15, 18);
  const maxWidth = contentWidth(420);
  const headlineSize = size(32, 28, 38);
  const headlineSizeShrunk = size(26, 22, 30);
  const heroHeight = Math.max(HERO_HEIGHT, insets.top + 160);

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
    return { fontSize: shrunkSize, lineHeight: shrunkSize * 1.19 };
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

  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const heroContent = (
    <>
      {theme.isDark ? null : (
        <>
          <Sphere3D size={150} tone="saffron" style={{ right: -30, top: 18 }} />
          <Sphere3D size={70} ring style={{ right: 10, bottom: -34 }} />
        </>
      )}
      <View style={[styles.heroInner, { maxWidth, paddingTop: insets.top }]}>
        <Animated.Image source={images.logo} style={[styles.logo, logoAnimatedStyle]} />
        <Animated.Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.2}
          style={[styles.headline, { color: onHero }, headlineAnimatedStyle]}>
          Welcome back
        </Animated.Text>
      </View>
    </>
  );

  return (
    <Screen glow="none" edges={['bottom', 'left', 'right']}>
      {/* Light status-bar icons over the violet header; unmounting restores the theme's own style. */}
      <StatusBar barStyle="light-content" />
      <Pressable style={styles.flex} onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
            {/* ── Violet hero header (behind the status bar) ── */}
            {theme.isDark ? (
              <View style={[styles.hero, { minHeight: heroHeight, backgroundColor: theme.colors.primary }]}>{heroContent}</View>
            ) : (
              <LinearGradient
                colors={[...HERO_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={[styles.hero, styles.heroLift, { minHeight: heroHeight }]}>
                {heroContent}
              </LinearGradient>
            )}

            <View style={[styles.body, { maxWidth, padding: theme.spacing.xl }]}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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

              {/* ── Remember me · Forgot password ── */}
              <View style={styles.rememberRow}>
                <View style={styles.rememberLeft}>
                  <Checkbox checked={rememberMe} onChange={setRememberMe} accessibilityLabel="Remember me" testID="login-remember-me" />
                  <View style={styles.rememberTextCol}>
                    <Text style={[styles.rememberTitle, { color: theme.colors.text }]}>Remember me</Text>
                    <Text style={[styles.xs, { color: theme.colors.textFaint }]}>Fills in your email next time.</Text>
                  </View>
                </View>
                <Pressable accessibilityRole="link" onPress={() => navigation.navigate(Routes.FORGOT_PASSWORD)} hitSlop={10}>
                  <Text style={[styles.link, { color: theme.colors.primary }]}>Forgot password?</Text>
                </Pressable>
              </View>

              {bannerError ? (
                <InfoBanner kind="bad" style={styles.banner}>
                  <View style={styles.bannerRow}>
                    <Text accessibilityLiveRegion="assertive" style={[styles.bannerText, { color: theme.colors.danger }]}>
                      {bannerError}
                    </Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={() => setBannerError(null)} hitSlop={10}>
                      <Icon name="close" size={16} color={theme.colors.danger} />
                    </Pressable>
                  </View>
                </InfoBanner>
              ) : null}

              <View style={styles.spacer} />

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
              <View style={styles.lockNote}>
                <Icon name="lock" size={14} color={theme.colors.textFaint} />
                <Text style={[styles.xs, { color: theme.colors.textFaint }]}>Your password is never saved on this phone.</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </Screen>
  );
}
