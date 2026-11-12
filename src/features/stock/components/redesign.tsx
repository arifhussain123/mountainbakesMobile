/**
 * Small 2026-redesign building blocks the Orders and Stock screens share
 * (mockup `design UIandUX/redesign-2026/common.py`): the lavender "tint" inner
 * box, the `.btn.xs/.sm` secondary / danger / soft buttons, the round
 * `.iconbtn`, the gradient `.fab` and the `.pager`. Kept here (not in
 * `@/shared/ui`) because only these two features use them so far; import by
 * this deep path, not the `@/features/stock` barrel, so Orders doesn't pull in
 * the Stock screens.
 */
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme, type Theme } from '@/shared/theme';
import { ACCENT_GLOW, AccentFill, Icon, type IconName } from '@/shared/ui';

/** The mockup's `card tint` / `background:T['tint']` lavender inner box; dark keeps a faint glass layer. */
export function tintFill(theme: Theme): string {
  return theme.isDark ? theme.colors.border : '#EFEBFF';
}

/** The selected-chip / active-page midnight fill (light); dark uses the accent like the chips do. */
export function midnightFill(theme: Theme): string {
  return theme.isDark ? theme.colors.primary : '#1E1B4B';
}

/** The mockup's `.iconbtn`: a 42pt white circle with a soft violet lift (light). */
export function IconCircleButton({
  icon,
  onPress,
  accessibilityLabel,
  dot,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  /** A small accent dot (e.g. a non-default sort is active). */
  dot?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface, opacity: pressed ? 0.8 : 1 },
        theme.isDark ? null : styles.lift,
      ]}>
      <Icon name={icon} size={20} color={theme.colors.text} />
      {dot ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
    </Pressable>
  );
}

export type MiniButtonKind = 'secondary' | 'danger' | 'soft';

/** The mockup's small `btn(…, 'xs' | 'sm')`: secondary (white + hairline), danger (pale red) or soft (pale accent). */
export function MiniButton({
  label,
  onPress,
  kind = 'secondary',
  size = 'xs',
  icon,
  disabled,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: MiniButtonKind;
  size?: 'xs' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const ink = kind === 'danger' ? theme.colors.danger : kind === 'soft' ? theme.colors.primary : theme.colors.text;
  const fill =
    kind === 'danger'
      ? `${theme.colors.danger}${theme.isDark ? '24' : '14'}`
      : kind === 'soft'
        ? `${theme.colors.primary}${theme.isDark ? '24' : '17'}`
        : theme.isDark
          ? 'transparent'
          : theme.colors.surface;
  const border = kind === 'danger' ? `${theme.colors.danger}26` : kind === 'soft' ? `${theme.colors.primary}26` : theme.colors.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        size === 'xs' ? styles.xs : styles.sm,
        { backgroundColor: fill, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={size === 'xs' ? 14 : 16} color={ink} /> : null}
      <Text style={[size === 'xs' ? styles.xsText : styles.smText, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The mockup's `.fab`: a saffron-gradient pill with a plus and a label, floating above the tab bar. */
export function GradientFab({ label, onPress, bottom, accessibilityLabel }: { label: string; onPress: () => void; bottom: number; accessibilityLabel?: string }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom, backgroundColor: theme.colors.primary, opacity: pressed ? 0.88 : 1 },
        theme.isDark ? styles.fabDarkShadow : ACCENT_GLOW,
      ]}>
      <AccentFill borderRadius={20} />
      <Icon name="plus" size={20} color={theme.colors.primaryText} />
      <Text style={[styles.fabText, { color: theme.colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

/** One `.pager` square: 36pt, white with a hairline; the current page is midnight. */
export function PagerButton({
  label,
  icon,
  active,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  label?: string;
  icon?: IconName;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useAppTheme();
  const on = midnightFill(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.page,
        active
          ? { backgroundColor: on, borderColor: on }
          : { backgroundColor: theme.isDark ? 'transparent' : theme.colors.surface, borderColor: theme.colors.border },
        disabled ? styles.disabled : null,
      ]}>
      {icon ? (
        <Icon name={icon} size={16} color={theme.colors.textSecondary} />
      ) : (
        <Text style={[styles.pageText, { color: active ? (theme.isDark ? theme.colors.primaryText : '#FFFFFF') : theme.colors.textSecondary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  dot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4 },
  xs: { height: 32, borderRadius: 11, paddingHorizontal: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  sm: { height: 38, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  xsText: { fontSize: 12, fontWeight: '600' },
  smText: { fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    height: 56,
    borderRadius: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabDarkShadow: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabText: { fontSize: 15, fontWeight: '600' },
  page: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageText: { fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
