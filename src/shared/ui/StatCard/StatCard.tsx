import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { pastelTiles, tileInk, toneFor, useAppTheme, type PastelTone } from '@/shared/theme';

export interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  /** Tile colour. Defaults to a stable colour picked from `label`. */
  tone?: PastelTone;
}

/** A compact stat tile — used inside the Orders card, Stock Overview, etc. */
export function StatCard({ label, value, valueColor, tone }: StatCardProps) {
  const theme = useAppTheme();

  // 2026 redesign: a gradient tile (mint / aqua / amber / lilac / pink) — pastel with navy text
  // in light, the deep versions with white text in dark.
  const t = pastelTiles(theme.isDark)[tone ?? toneFor(label)];
  const ink = tileInk(theme.isDark);
  return (
    <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.tile]}>
      <Text style={[theme.typography.label, { color: ink.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[theme.typography.cardTitle, { color: valueColor ?? ink.text, marginTop: 2 }]} numberOfLines={1}>
        {value}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0 },
  tile: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
});
