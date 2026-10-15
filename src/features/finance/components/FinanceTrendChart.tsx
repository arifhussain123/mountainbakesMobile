import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { FinanceDashboard } from '@/api';

export interface FinanceTrendChartProps {
  data: FinanceDashboard['trend'];
}

/** The dashboard's trailing-days trend — touch-interactive bars, same pattern as Branch's SalesChart, colored by net sign rather than a second series. */
export function FinanceTrendChart({ data }: FinanceTrendChartProps) {
  const theme = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1);
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.net)));
  const selected = data[selectedIndex];

  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Net Cash Trend</Text>
      {selected ? (
        <View style={[styles.selectedRow, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, marginTop: theme.spacing.sm }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatDisplayDate(selected.businessDate)}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[theme.typography.body, { color: selected.net >= 0 ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
              {formatCurrency(selected.net)}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {formatCurrency(selected.income)} in · {formatCurrency(selected.expenses)} out
            </Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.chart, { marginTop: theme.spacing.lg, borderBottomColor: theme.colors.border }]}>
        {data.map((point, index) => {
          const heightPct = (Math.abs(point.net) / maxAbs) * 100;
          const active = index === selectedIndex;
          return (
            <Pressable key={point.businessDate} onPress={() => setSelectedIndex(index)} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(2, heightPct)}%`,
                    backgroundColor: point.net >= 0 ? theme.colors.success : theme.colors.danger,
                    opacity: active ? 1 : 0.45,
                    borderRadius: theme.radii.sm,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {data.map((point) => (
          <Text key={point.businessDate} style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {formatDisplayDate(point.businessDate).slice(0, 2)}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 3 },
  bar: { width: '100%' },
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },
});
