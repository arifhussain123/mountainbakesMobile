import { Alert, Pressable, Text, View } from 'react-native';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, Screen } from '@/shared/ui';

/**
 * branchApp.md screen 26 (Account section) — Settings. Only real, working
 * items are shown: no Notifications/Language toggles that would do nothing.
 * Theme is fixed dark app-wide (see `mobile-setup.md`) — no switch to show.
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
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Card>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>THEME</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>Dark (fixed)</Text>
        </Card>
        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={{ height: 52, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>Sign Out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
