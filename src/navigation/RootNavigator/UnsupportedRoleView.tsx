import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PrimaryButton, Screen } from '@/shared/ui';
import { useAuthStore } from '@/state';

/** Shown for a role this app doesn't build a screen set for (e.g. super_admin). */
export function UnsupportedRoleView() {
  const theme = useAppTheme();
  const role = useAuthStore((state) => state.user?.role);
  const logout = useAuthStore((state) => state.logout);

  return (
    <Screen>
      <AppHeader title="Not Available" />
      <View style={{ flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, textAlign: 'center' }]}>
          This app doesn't have a screen set built for the "{role}" role yet.
        </Text>
        <PrimaryButton label="Sign Out" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}
