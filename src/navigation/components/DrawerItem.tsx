import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { NavBadge } from './NavBadge';
import { ROW_HORIZONTAL_PADDING, ROW_ICON_LABEL_GAP, ROW_LABEL_MAX_FONT_SCALE } from './drawerLayout';

export interface DrawerItemProps {
  label: string;
  icon: IconName;
  active: boolean;
  badgeCount?: number;
  failedSync?: boolean;
  onPress: () => void;
  /** From `computeDrawerRowMetrics` — every row in the list shares the same computed size. */
  rowHeight: number;
  iconSize: number;
  fontSize: number;
  lineHeight: number;
  /** No divider directly above the active pill — see `DrawerContent`'s render loop. */
  showDividerBelow: boolean;
}

/**
 * One drawer row — orange rounded pill when active (icon/label/chevron flip
 * to the dark background color for contrast, matching `colors.bg`), a
 * hairline divider below every row except the active one, and a trailing
 * chevron.
 */
export function DrawerItem({
  label,
  icon,
  active,
  badgeCount,
  failedSync,
  onPress,
  rowHeight,
  iconSize,
  fontSize,
  lineHeight,
  showDividerBelow,
}: DrawerItemProps) {
  const theme = useAppTheme();
  const badgeLabel = badgeCount ? `, ${badgeCount} need action` : '';
  const iconColor = active ? theme.colors.background : theme.colors.textMuted;
  const textColor = active ? theme.colors.background : theme.colors.text;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}${badgeLabel}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            height: rowHeight,
            paddingHorizontal: ROW_HORIZONTAL_PADDING,
            gap: ROW_ICON_LABEL_GAP,
            marginHorizontal: active ? 8 : 0,
            borderRadius: active ? theme.radii.md : 0,
            backgroundColor: active ? theme.colors.primary : pressed ? theme.colors.cardFill : 'transparent',
          },
        ]}>
        <Icon name={icon} size={iconSize} color={iconColor} />
        <Text
          style={[styles.label, { color: textColor, fontSize, lineHeight, fontWeight: active ? '700' : '500' }]}
          numberOfLines={1}
          allowFontScaling
          maxFontSizeMultiplier={ROW_LABEL_MAX_FONT_SCALE}>
          {label}
        </Text>
        {failedSync ? <NavBadge count={0} dot /> : badgeCount ? <NavBadge count={badgeCount} /> : null}
        <Icon name="chevron-right" size={16} color={active ? theme.colors.background : theme.colors.textMuted} />
      </Pressable>
      {showDividerBelow ? (
        <View
          style={[
            styles.divider,
            {
              marginLeft: ROW_HORIZONTAL_PADDING + iconSize + ROW_ICON_LABEL_GAP,
              marginRight: ROW_HORIZONTAL_PADDING,
              backgroundColor: theme.colors.border,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
});
