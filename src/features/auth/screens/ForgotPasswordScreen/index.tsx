import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { IconButton, InfoBanner, Screen } from '@/shared/ui';
import { styles } from './styles';

/**
 * STUB — `mountain-bakes-server` has no password-reset endpoint yet (checked
 * alongside `authService`/`businessDate.ts`: only `/auth/login`, `/auth/refresh`,
 * `/auth/me`, `/auth/logout` exist). This screen exists so the Login screen's
 * "Forgot password?" link has somewhere to go; wire it to a real request flow
 * once the server adds one.
 */
export function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  return (
    <Screen glow="warm">
      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => navigation.goBack()} />
      </View>
      <View style={[styles.content, { paddingHorizontal: theme.spacing.xl }]}>
        <Text accessibilityRole="header" style={[styles.h1, { color: theme.colors.text }]}>
          Forgot password
        </Text>
        <InfoBanner kind="brand" icon="lock" style={styles.body}>
          Self-serve password reset isn't available yet. Ask your branch admin to reset your password from the admin dashboard, then sign in
          again with the new one.
        </InfoBanner>
      </View>
    </Screen>
  );
}
