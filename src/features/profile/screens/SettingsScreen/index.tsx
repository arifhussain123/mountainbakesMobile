import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/state';
import { useAppTheme, type ThemeModeSetting } from '@/shared/theme';
import { AppHeader, Card, Icon, ListThumb, Screen, SectionHeader, SegmentedControl, type SegmentedOption } from '@/shared/ui';

const THEME_OPTIONS: SegmentedOption<ThemeModeSetting>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/**
 * branchApp.md screen 26 (Account section) — Settings. Only real, working
 * items are shown: no Notifications/Language toggles that would do nothing.
 * Theme is the same persisted Light/Dark/System choice the Appearance sheet
 * sets (`useThemeStore`, local only — there is no server-side setting).
 */
export function SettingsScreen() {
  const theme = useAppTheme();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <SectionHeader title="Appearance" />
        <Card style={styles.card}>
          <View style={styles.li}>
            <ListThumb icon={theme.isDark ? 'moon' : 'sun'} index={1} />
            <View style={styles.grow}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Theme</Text>
              <Text style={[styles.xs, { color: theme.colors.textSecondary }]}>
                {theme.mode === 'system' ? `Follows your phone (${theme.isDark ? 'dark' : 'light'} now)` : 'Saved on this device'}
              </Text>
            </View>
          </View>
          <SegmentedControl options={THEME_OPTIONS} value={theme.mode} onChange={theme.setMode} />
        </Card>

        <SectionHeader title="Account" />
        <Card style={styles.signOutCard}>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={handleLogout} style={styles.li}>
            <View style={[styles.dangerThumb, { backgroundColor: `${theme.colors.danger}1A` }]}>
              <Icon name="logout" size={20} color={theme.colors.danger} />
            </View>
            <Text style={[styles.title, styles.grow, { color: theme.colors.danger }]}>Sign out</Text>
            <Icon name="chevron-right" size={18} color={theme.colors.textFaint} />
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 16 },
  card: { gap: 14 },
  signOutCard: { paddingVertical: 4 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  dangerThumb: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
