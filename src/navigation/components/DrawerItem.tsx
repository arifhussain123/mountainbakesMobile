import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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

/** Violet ink for the active row on its lavender pill (light mode, 2026 redesign). */
const ACTIVE_INK = '#5B48D8';

/**
 * One drawer row: icon, label, optional badge.
 *
 * Light (2026 redesign `.navi`): rows are rounded 14pt pills inset from the
 * drawer edge, the active one a lavender gradient with violet ink; no
 * dividers or chevrons. Dark keeps the earlier look: edge-to-edge
 * `colors.primary` active row, hairline dividers and a trailing chevron.
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
  const light = !theme.isDark;
  const activeInk = light ? ACTIVE_INK : theme.colors.primaryText;
  const iconColor = active ? activeInk : light ? theme.colors.text : theme.colors.textMuted;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}${badgeLabel}`}
        onPress={onPress}
        style={[styles.row, { height: rowHeight, paddingHorizontal: light ? 12 : ROW_HORIZONTAL_PADDING, gap: ROW_ICON_LABEL_GAP }, light ? styles.lightRow : null]}>
        {({ pressed }) => (
          <>
            {active && light ? (
              <LinearGradient colors={['#EFEBFF', '#E2DBFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.pill]} />
            ) : pressed && light ? (
              <View style={[StyleSheet.absoluteFill, styles.pill, { backgroundColor: '#F3F0FF' }]} />
            ) : active ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary }]} />
            ) : pressed ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface, opacity: 0.6 }]} />
            ) : null}
            <Icon name={icon} size={iconSize} color={iconColor} />
            <Text
              style={[
                styles.label,
                { color: active ? activeInk : theme.colors.text, fontSize, lineHeight, fontWeight: active || light ? '600' : '400' },
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
                <NavBadge count={badgeCount} tone={badgeTone === 'muted' ? 'muted' : active && !light ? 'onAccent' : 'accent'} />
              )
            ) : null}
            {light ? null : <Icon name="chevron-right" size={ROW_CHEVRON_SIZE} color={iconColor} />}
          </>
        )}
      </Pressable>
      {showDividerBelow && !light ? (
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  lightRow: { marginHorizontal: 10 },
  pill: { borderRadius: 14 },
  label: { flex: 1, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth },
});
