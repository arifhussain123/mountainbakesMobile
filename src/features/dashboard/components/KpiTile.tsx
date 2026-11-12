import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme, type PastelTone } from '@/shared/theme';
import { PASTEL_INK, PastelTile } from '@/shared/ui';
import { dashType } from './dashType';

export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  /** Position in its grid — picks the pastel like the mockup's `.kpi:nth-child(5n+k)`. */
  index: number;
  valueColor?: string;
  /** Dark mode only: a small colour dot before the label (the pastel carries the colour in light mode). */
  dot?: string;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's `kpi()` tile: a pastel gradient with a label, a 22pt value and an optional sub-line. */
export function KpiTile({ label, value, sub, index, valueColor, dot, style }: KpiTileProps) {
  const theme = useAppTheme();
  const muted = theme.isDark ? theme.colors.textSecondary : PASTEL_INK.muted;

  return (
    <PastelTile tone={(index % 5) as PastelTone} style={[styles.tile, theme.isDark ? null : styles.lift, style]}>
      <View style={styles.labelRow}>
        {theme.isDark && dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <Text style={[dashType.kpiK, { color: muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text
        style={[dashType.kpiV, { color: valueColor ?? (theme.isDark ? theme.colors.text : PASTEL_INK.text) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {value}
      </Text>
      {sub ? (
        <Text style={[dashType.xs, { color: theme.isDark ? theme.colors.textFaint : muted }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </PastelTile>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, borderRadius: 24, padding: 14, gap: 4 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 2 },
});
