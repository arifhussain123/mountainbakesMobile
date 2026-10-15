import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface DailyKpiItem {
  id: string;
  label: string;
  value: string;
  sub: string;
  dot: string;
}

export interface DailyKpiGridProps {
  kpis: DailyKpiItem[];
}

/** Design lines 135-137 — the 2-column Daily Sales KPI grid (6 small cards). */
export function DailyKpiGrid({ kpis }: DailyKpiGridProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => (
        <View
          key={kpi.id}
          style={[styles.cell, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderWidth: 1, borderRadius: theme.radii.lg, padding: theme.spacing.md }]}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: kpi.dot }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' }]} numberOfLines={1}>
              {kpi.label}
            </Text>
          </View>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 6 }]} numberOfLines={1}>
            {kpi.value}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]} numberOfLines={1}>
            {kpi.sub}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%', borderWidth: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 2 },
});
