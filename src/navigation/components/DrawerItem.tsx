import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { NavBadge } from './NavBadge';
import { MENU_CONTENT_HORIZONTAL_PADDING, ROW_HEIGHT, ROW_ICON_LABEL_GAP, ROW_ICON_SIZE, ROW_LABEL_FONT_SIZE, ROW_TILE_RADIUS, ROW_TILE_SIZE } from './drawerLayout';

export interface DrawerItemProps {
  label: string;
  icon: IconName;
  active: boolean;
  badgeCount?: number;
  failedSync?: boolean;
  /** Show `badgeCount` as an amber dot (a state, e.g. "day still open") instead of a number. */
  badgeDot?: boolean;
  onPress: () => void;
  /** Red tint tile/icon/label — the Logout row only. */
  destructive?: boolean;
}

/**
 * One drawer row, "3D slide-back" style: a rounded-square icon tile +
 * label, no per-item divider or trailing chevron (removed per this
 * redesign — section hairlines do that job now, see `DrawerContent`).
 */
export function DrawerItem({ label, icon, active, badgeCount, failedSync, badgeDot, onPress, destructive }: DrawerItemProps) {
  const theme = useAppTheme();
  const badgeLabel = badgeCount ? (badgeDot ? ', needs attention' : `, ${badgeCount} need action`) : '';
  const tileBg = destructive ? `${theme.colors.danger}1F` : active ? theme.colors.primary : theme.colors.surface;
  const iconColor = destructive ? theme.colors.danger : active ? theme.colors.background : theme.colors.text;
  const textColor = destructive ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${badgeLabel}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          height: ROW_HEIGHT,
          paddingHorizontal: MENU_CONTENT_HORIZONTAL_PADDING,
          gap: ROW_ICON_LABEL_GAP,
          backgroundColor: pressed ? theme.colors.cardFill : 'transparent',
        },
      ]}>
      <View style={[styles.tile, { width: ROW_TILE_SIZE, height: ROW_TILE_SIZE, borderRadius: ROW_TILE_RADIUS, backgroundColor: tileBg }]}>
        <Icon name={icon} size={ROW_ICON_SIZE} color={iconColor} />
      </View>
      <Text
        style={[styles.label, { color: textColor, fontSize: ROW_LABEL_FONT_SIZE, fontWeight: active ? '700' : '500' }]}
        numberOfLines={1}
        ellipsizeMode="tail">
        {label}
      </Text>
      {failedSync ? (
        <NavBadge count={0} dot />
      ) : badgeCount ? (
        badgeDot ? (
          <NavBadge count={0} dot dotTone="warning" />
        ) : (
          <NavBadge count={badgeCount} />
        )
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
});
