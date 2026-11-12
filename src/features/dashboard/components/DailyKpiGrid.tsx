import { StyleSheet, View } from 'react-native';
import { KpiTile } from '@/shared/ui';

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

/** The Sales-analytics KPI grid — pastel `kpi()` tiles, two per row (redesign `grid2`). */
export function DailyKpiGrid({ kpis }: DailyKpiGridProps) {
  return (
    <View style={styles.grid}>
      {kpis.map((kpi, i) => (
        <KpiTile key={kpi.id} index={i} label={kpi.label} value={kpi.value} sub={kpi.sub} dot={kpi.dot} style={styles.cell} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Two per row with the 10pt gap: (100% − 10) / 2.
  cell: { flexBasis: '46%', flexGrow: 1 },
});
