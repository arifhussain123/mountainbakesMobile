import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

const appVersion = (require('../../../package.json') as { version: string }).version;

export interface DrawerFooterProps {
  name: string;
  email: string;
  pendingSyncCount: number;
  onSignOut: () => void;
}

/** User identity + Sign Out, pinned above the safe-area bottom inset. */
export function DrawerFooter({ name, email, pendingSyncCount, onSignOut }: DrawerFooterProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.drawer.divider }]}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Text style={[theme.typography.body, { color: theme.colors.drawer.text, fontWeight: '700' }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.drawer.textMuted, marginTop: 2 }]} numberOfLines={1}>
          {email}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={onSignOut}
        style={[styles.signOutRow, { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm }]}>
        <Icon name="logout" size={18} color={theme.colors.drawer.text} />
        <Text style={[theme.typography.body, { color: theme.colors.drawer.text, fontWeight: '700' }]}>Sign Out</Text>
      </Pressable>

      <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm }}>
        <Text style={[theme.typography.label, { color: theme.colors.drawer.textMuted }]}>
          {pendingSyncCount > 0 ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync` : 'All changes synced'}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.drawer.textMuted, marginTop: 2 }]}>v{appVersion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, paddingTop: 14, paddingBottom: 4 },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36 },
});
