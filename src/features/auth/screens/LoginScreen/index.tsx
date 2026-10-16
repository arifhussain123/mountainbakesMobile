import { useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { images } from '@/assets';
import { Routes, type AuthStackParamList } from '@/navigation';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { Checkbox, Icon, PasswordField, PillButton, Screen, TextField } from '@/shared/ui';
import { useAuthStore } from '@/state';
import { loginSchema, type LoginFormValues } from '../../loginSchema';
import { mapLoginError } from '../../mapLoginError';
import { useLogin } from '../../useLogin';
import { styles } from './styles';

export function LoginScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const rememberedEmail = useAuthStore((state) => state.rememberedEmail);
  const { isOffline } = useNetworkStatus();
  const loginMutation = useLogin();

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
          <ScrollView contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.xl }]} keyboardShouldPersistTaps="handled">
            <Image source={images.logo} style={styles.logo} />

            <Text
              accessibilityRole="header"
              style={[theme.typography.screenTitle, styles.headline, { color: theme.colors.text, fontSize: 32, lineHeight: 36 }]}>
              WELCOME{'\n'}
              <Text style={{ color: theme.colors.primary }}>BACK</Text>
            </Text>
            <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
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
              <PillButton label="Sign In" onPress={() => void onSubmit()} loading={busy} disabled={busy} showArrow testID="login-submit" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </Screen>
  );
}
