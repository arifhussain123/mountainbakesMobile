import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { NavBadge } from './NavBadge';

export interface DrawerItemProps {
  label: string;
  icon: IconName;
  active: boolean;
  badgeCount?: number;
  failedSync?: boolean;
  onPress: () => void;
}

/** One drawer row — orange rounded pill when active, subtle lighter-brown press feedback otherwise. */
export function DrawerItem({ label, icon, active, badgeCount, failedSync, onPress }: DrawerItemProps) {
  const theme = useAppTheme();
  const badgeLabel = badgeCount ? `, ${badgeCount} need action` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${badgeLabel}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          marginHorizontal: 12,
          borderRadius: theme.radii.md,
          backgroundColor: active ? theme.colors.drawer.activeBg : pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
        },
      ]}>
      <Icon name={icon} size={20} color={active ? theme.colors.drawer.text : theme.colors.drawer.textMuted} />
      <Text
        style={[
          theme.typography.body,
          styles.label,
          { color: active ? theme.colors.drawer.text : theme.colors.drawer.text, fontWeight: active ? '700' : '500' },
        ]}
        numberOfLines={2}>
        {label}
      </Text>
      {failedSync ? <NavBadge count={0} dot /> : badgeCount ? <NavBadge count={badgeCount} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16, gap: 12 },
  label: { flex: 1 },
});
