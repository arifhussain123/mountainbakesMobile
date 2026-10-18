import { Text, View } from 'react-native';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, Screen } from '@/shared/ui';
import { branchScopeLabel, roleLabel } from '@/shared/utils';

/** branchApp.md screen 26 (Account section) — Profile. */
export function ProfileScreen() {
  const theme = useAppTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <Screen>
      <AppHeader title="Profile" />
      <View style={{ padding: theme.spacing.lg }}>
        <Card>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NAME</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4, fontWeight: '700' }]}>
            {user?.displayName ?? user?.username ?? '—'}
          </Text>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>EMAIL</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{user?.email ?? '—'}</Text>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>ROLE</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>
            {user ? roleLabel(user.role) : '—'}
          </Text>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>BRANCH</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{user ? branchScopeLabel(user) : '—'}</Text>
        </Card>
      </View>
    </Screen>
  );
}
