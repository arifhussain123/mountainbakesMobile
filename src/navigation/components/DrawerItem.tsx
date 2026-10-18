import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { NavBadge } from './NavBadge';
import {
  ROW_ACTIVE_BAR_WIDTH,
  ROW_CHEVRON_SIZE,
  ROW_HORIZONTAL_PADDING,
  ROW_ICON_LABEL_GAP,
  ROW_LABEL_MAX_FONT_SCALE,
} from './drawerLayout';

export interface DrawerItemProps {
  label: string;
  icon: IconName;
  active: boolean;
  badgeCount?: number;
  failedSync?: boolean;
  /** Show `badgeCount` as an amber dot (a state, e.g. "day still open") instead of a number. */
  badgeDot?: boolean;
  onPress: () => void;
  /** From `computeDrawerRowMetrics` — every row in the list shares the same computed size. */
  rowHeight: number;
  iconSize: number;
  fontSize: number;
  lineHeight: number;
  /** Hairline under the row, inset to start at the label. Off for the last row and before a section label. */
  showDividerBelow: boolean;
}

/**
 * One drawer row: icon, label, optional badge, trailing chevron. Active rows
 * sit on `colors.surface` with a 3dp accent bar on the left edge and the icon
 * and chevron in the accent; pressed rows show the surface at reduced opacity.
 */
export function DrawerItem({
  label,
  icon,
  active,
  badgeCount,
  failedSync,
  badgeDot,
  onPress,
  rowHeight,
  iconSize,
  fontSize,
  lineHeight,
  showDividerBelow,
}: DrawerItemProps) {
  const theme = useAppTheme();
  const badgeLabel = badgeCount ? (badgeDot ? ', needs attention' : `, ${badgeCount} need action`) : '';
  const accentOrMuted = active ? theme.colors.primary : theme.colors.textMuted;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}${badgeLabel}`}
        onPress={onPress}
        style={[styles.row, { height: rowHeight, paddingHorizontal: ROW_HORIZONTAL_PADDING, gap: ROW_ICON_LABEL_GAP }]}>
        {({ pressed }) => (
          <>
            {active || pressed ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface, opacity: active ? 1 : 0.6 }]} />
            ) : null}
            {active ? <View style={[styles.activeBar, { width: ROW_ACTIVE_BAR_WIDTH, backgroundColor: theme.colors.primary }]} /> : null}
            <Icon name={icon} size={iconSize} color={accentOrMuted} />
            <Text
              style={[styles.label, { color: theme.colors.text, fontSize, lineHeight, fontWeight: active ? '600' : '400' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={ROW_LABEL_MAX_FONT_SCALE}>
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
            <Icon name="chevron-right" size={ROW_CHEVRON_SIZE} color={accentOrMuted} />
          </>
        )}
      </Pressable>
      {showDividerBelow ? (
        <View
          style={[
            styles.divider,
            { marginLeft: ROW_HORIZONTAL_PADDING + iconSize + ROW_ICON_LABEL_GAP, marginRight: ROW_HORIZONTAL_PADDING, backgroundColor: theme.colors.border },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  activeBar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { flex: 1, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth },
});
