import { ActivityIndicator, StyleSheet, Text, Image as RNImage } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Screen } from '@/shared/ui';
import { images } from '@/assets';

/**
 * Shown while `authStore.bootstrap()` checks the keychain for a session —
 * mountainbakesBranch.html screen 01: warm top-right glow (not the app's usual
 * violet/teal pair), logo, tagline, "Loading…".
 */
export function SplashView() {
  const theme = useAppTheme();
  return (
    <Screen glow="warm" contentStyle={styles.container}>
      <RNImage source={images.logo} style={styles.logo} resizeMode="contain" />
      <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: 20 }]}>Mountain Bakes</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted, marginTop: 6 }]}>Fresh • Quality • Every Day</Text>
      <ActivityIndicator style={styles.spinner} color={theme.colors.primary} />
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 10 }]}>Loading…</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, borderRadius: 60 },
  spinner: { marginTop: 24 },
});
