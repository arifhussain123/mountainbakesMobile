import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { designType, tileInk, useAppTheme, type PastelTone } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';
import { PastelTile } from '../PastelTile';

export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  /** A small icon at the top-right of the tile. */
  icon?: IconName;
  /** The pastel to use. Or pass `index` (the tile's position in its grid) to cycle like `.kpi:nth-child(5n+k)`. */
  tone?: PastelTone;
  index?: number;
  /** Dark mode only: a colour dot before the label (in light mode the pastel carries the colour). */
  dot?: string;
  /** Makes the tile a button (e.g. a payment-method filter), with an accent ring when `selected`. */
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's `kpi()` tile: a pastel gradient with a label, a 22pt tabular value and an optional sub-line. */
export function KpiTile({ label, value, sub, valueColor, icon, tone, index = 0, dot, onPress, selected, accessibilityLabel, style }: KpiTileProps) {
  const theme = useAppTheme();
  const { muted, text: ink } = tileInk(theme.isDark);
  const a11yLabel = accessibilityLabel ?? `${label} ${value}${sub ? `, ${sub}` : ''}`;

  const tile = (tileStyle: StyleProp<ViewStyle>) => (
    <PastelTile tone={tone ?? ((Math.abs(index) % 5) as PastelTone)} style={[styles.tile, theme.isDark ? styles.liftDark : styles.lift, tileStyle]}>
      <View style={styles.head}>
        {theme.isDark && dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <Text style={[designType.kpiK, styles.label, { color: muted }]} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <Icon name={icon} size={18} color={muted} /> : null}
      </View>
      <Text style={[designType.kpiV, { color: valueColor ?? ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: muted }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </PastelTile>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={a11yLabel} style={[styles.cell, style]}>
        {tile(null)}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={a11yLabel}
      style={[styles.cell, styles.ring, { borderColor: selected ? theme.colors.primary : 'transparent' }, style]}>
      {tile(null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, minWidth: 0 },
  ring: { borderWidth: 2, borderRadius: 26 },
  tile: { flexGrow: 1, borderRadius: 24, padding: 14, gap: 4 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 3 },
  liftDark: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, minWidth: 0 },
  dot: { width: 7, height: 7, borderRadius: 2 },
  sub: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
});
