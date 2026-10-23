import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { NavBadge } from './NavBadge';
import {
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
  /** `muted` greys a count; `danger` turns a dot red. */
  badgeTone?: 'muted' | 'danger';
  onPress: () => void;
  /** From `computeDrawerRowMetrics` — every row in the list shares the same computed size. */
  rowHeight: number;
  iconSize: number;
  fontSize: number;
  lineHeight: number;
  /** Full-width hairline under the row. Off for the last row and before a section label. */
  showDividerBelow: boolean;
}

/**
 * One drawer row: icon, label, optional badge, trailing chevron. The active row
 * is filled edge to edge with `colors.primary`, its icon, label and chevron in
 * `primaryText` — the same look as the web app's phone drawer. Pressed rows
 * show `colors.surface` at reduced opacity.
 */
export function DrawerItem({
  label,
  icon,
  active,
  badgeCount,
  failedSync,
  badgeDot,
  badgeTone,
  onPress,
  rowHeight,
  iconSize,
  fontSize,
  lineHeight,
  showDividerBelow,
}: DrawerItemProps) {
  const theme = useAppTheme();
  const badgeLabel = badgeCount ? (badgeDot ? ', needs attention' : `, ${badgeCount} need action`) : '';
  const iconColor = active ? theme.colors.primaryText : theme.colors.textMuted;

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
            {active ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary }]} />
            ) : pressed ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface, opacity: 0.6 }]} />
            ) : null}
            <Icon name={icon} size={iconSize} color={iconColor} />
            <Text
              style={[
                styles.label,
                { color: active ? theme.colors.primaryText : theme.colors.text, fontSize, lineHeight, fontWeight: active ? '600' : '400' },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={ROW_LABEL_MAX_FONT_SCALE}>
              {label}
            </Text>
            {failedSync ? (
              <NavBadge count={0} dot />
            ) : badgeCount ? (
              badgeDot ? (
                <NavBadge count={0} dot dotTone={badgeTone === 'danger' ? 'danger' : 'warning'} />
              ) : (
                <NavBadge count={badgeCount} tone={badgeTone === 'muted' ? 'muted' : active ? 'onAccent' : 'accent'} />
              )
            ) : null}
            <Icon name="chevron-right" size={ROW_CHEVRON_SIZE} color={iconColor} />
          </>
        )}
      </Pressable>
      {showDividerBelow ? (
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth },
});
