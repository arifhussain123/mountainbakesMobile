import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { DARK_SURFACES, useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { NavBadge } from './NavBadge';
import {
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
  /** Unused since the 2026 redesign (pill rows, no hairlines in either mode); kept so callers needn't change. */
  showDividerBelow: boolean;
}

/** Active-row ink: violet on the lavender pill (light), soft lilac on the deep-violet pill (dark). */
const ACTIVE_INK = '#5B48D8';
const ACTIVE_INK_DARK = DARK_SURFACES.brandInk;

/**
 * One drawer row: icon, label, optional badge.
 *
 * 2026 redesign `.navi`, both modes: rows are rounded 14pt pills inset from
 * the drawer edge, no dividers or chevrons. The active one is a lavender
 * gradient with violet ink (light) or a deep-violet gradient with lilac ink
 * (dark — the mockups' DARK_CSS `.navi.on`).
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
}: DrawerItemProps) {
  const theme = useAppTheme();
  const badgeLabel = badgeCount ? (badgeDot ? ', needs attention' : `, ${badgeCount} need action`) : '';
  const dark = theme.isDark;
  const activeInk = dark ? ACTIVE_INK_DARK : ACTIVE_INK;
  const iconColor = active ? activeInk : dark ? theme.colors.textMuted : theme.colors.text;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}${badgeLabel}`}
        onPress={onPress}
        style={[styles.row, styles.pillRow, { height: rowHeight, gap: ROW_ICON_LABEL_GAP }]}>
        {({ pressed }) => (
          <>
            {active ? (
              <LinearGradient
                colors={dark ? [...DARK_SURFACES.navOn] : ['#EFEBFF', '#E2DBFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.pill]}
              />
            ) : pressed ? (
              <View style={[StyleSheet.absoluteFill, styles.pill, { backgroundColor: dark ? DARK_SURFACES.raised : '#F3F0FF' }]} />
            ) : null}
            <Icon name={icon} size={iconSize} color={iconColor} />
            <Text
              style={[
                styles.label,
                { color: active ? activeInk : theme.colors.text, fontSize, lineHeight, fontWeight: '600' },
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
                <NavBadge count={badgeCount} tone={badgeTone === 'muted' ? 'muted' : 'accent'} />
              )
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  pillRow: { marginHorizontal: 10, paddingHorizontal: 12 },
  pill: { borderRadius: 14 },
  label: { flex: 1, minWidth: 0 },
});
