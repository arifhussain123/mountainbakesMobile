import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { useForgotPassword } from '@/api/hooks/useAuthApi';
import { images } from '@/assets';
import type { AuthStackParamList } from '@/navigation/types';
import { zodResolver } from '@/shared/forms';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui/Icon';
import { InlineBanner } from '@/shared/ui/InlineBanner';
import { PillButton } from '@/shared/ui/PillButton';
import { Screen } from '@/shared/ui/Screen';
import { TextField } from '@/shared/ui/TextField';
import { useAuthStore } from '@/state';
import {
  FORGOT_PASSWORD_MESSAGES,
  mapForgotPasswordError,
} from '../../loginErrors';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email.')
    .pipe(z.email('Enter a valid email address.')),
});
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Not in the design files — a minimal screen over the server's existing
 * POST /auth/forgot-password. The server's recovery policy is Administrator
 * accounts only (branchApp.md: "Implement Forgot Password only according to
 * the existing policy"), so a branch user sees the server's own 403 message
 * telling them to contact an administrator — the screen does not pretend
 * otherwise.
 */
export function ForgotPasswordScreen() {
  const { colors, typography } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const rememberedEmail = useAuthStore(state => state.rememberedEmail);
  const { isOffline } = useNetworkStatus();
  const mutation = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: rememberedEmail ?? '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(values => {
    if (mutation.isPending) return;
    Keyboard.dismiss();
    mutation.mutate(values.email);
  });

  const banner = mutation.isSuccess
    ? { tone: 'info' as const, message: FORGOT_PASSWORD_MESSAGES.sent }
    : mutation.error
    ? {
        tone: 'error' as const,
        message: mapForgotPasswordError(mutation.error, { isOffline }),
      }
    : null;

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
        >
          <Pressable
            style={styles.flex}
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.topRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to sign in"
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={styles.back}
                testID="forgot-back"
              >
                <Icon name="chevron-left" size={22} color={colors.accent} />
              </Pressable>
            </View>
            <Image
              source={images.logo}
              style={styles.logo}
              resizeMode="contain"
              accessible
              accessibilityLabel="Mountain Bakes"
            />
            <Text
              accessibilityRole="header"
              accessibilityLabel="Forgot password"
              style={[
                typography.brandHeadline,
                styles.headline,
                { color: colors.textPrimary },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Forgot{'\n'}
              <Text style={{ color: colors.accent }}>password</Text>
            </Text>
            <Text
              style={[
                typography.brandBody,
                styles.subtitle,
                { color: colors.textMuted },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Enter your email and we'll send a reset link. Password recovery is
              available for Administrator accounts; branch staff should ask an
              administrator to reset their password.
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
                  returnKeyType="send"
                  onSubmitEditing={() => void onSubmit()}
                  editable={!mutation.isPending}
                  containerStyle={styles.field}
                  testID="forgot-email"
                />
              )}
            />

            {banner ? (
              <InlineBanner
                tone={banner.tone}
                message={banner.message}
                onDismiss={mutation.reset}
                style={styles.banner}
                testID="forgot-status"
              />
            ) : null}

            <PillButton
              label="Send reset link"
              onPress={() => void onSubmit()}
              loading={mutation.isPending}
              style={styles.button}
              testID="forgot-submit"
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 26,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginLeft: -12,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    marginTop: 4,
  },
  headline: { marginTop: 22, textAlign: 'center' },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 320,
  },
  field: { marginTop: 24 },
  banner: { marginTop: 18 },
  button: { marginTop: 20 },
});
