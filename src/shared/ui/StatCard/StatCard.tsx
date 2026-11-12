import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PASTEL_TILES, toneFor, useAppTheme, type PastelTone } from '@/shared/theme';

export interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  /** Pastel colour (light mode). Defaults to a stable colour picked from `label`. */
  tone?: PastelTone;
}

/** A compact stat tile — used inside the Orders card, Stock Overview, etc. */
export function StatCard({ label, value, valueColor, tone }: StatCardProps) {
  const theme = useAppTheme();

  if (!theme.isDark) {
    // 2026 redesign: a pastel gradient tile (mint / aqua / amber / lilac / pink) with navy text.
    const t = PASTEL_TILES[tone ?? toneFor(label)];
    return (
      <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.tile]}>
        <Text style={[theme.typography.label, { color: 'rgba(23, 26, 53, 0.62)' }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[theme.typography.cardTitle, { color: valueColor ?? theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
          {value}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[theme.typography.cardTitle, { color: valueColor ?? theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0 },
  tile: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
});
