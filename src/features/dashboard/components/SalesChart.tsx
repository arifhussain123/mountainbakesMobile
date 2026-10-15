import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SalesAnalyticsDailyPoint } from '@/api';

export interface SalesChartProps {
  data: SalesAnalyticsDailyPoint[];
}

/** CLAUDE.md Section 14 — touch-interactive bars, tap shows the exact value. */
export function SalesChart({ data }: SalesChartProps) {
  const theme = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1);
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const selected = data[selectedIndex];

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Daily Sales</Text>
      </View>
      {selected ? (
        <View style={[styles.selectedRow, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, marginTop: theme.spacing.sm }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatDisplayDate(selected.date)}</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
            {formatCurrency(selected.revenue)} <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>· {selected.orders} orders</Text>
          </Text>
        </View>
      ) : null}
      <View style={[styles.chart, { marginTop: theme.spacing.lg, borderBottomColor: theme.colors.border }]}>
        {data.map((point, index) => {
          const heightPct = (point.revenue / maxRevenue) * 100;
          const active = index === selectedIndex;
          return (
            <Pressable key={point.date} onPress={() => setSelectedIndex(index)} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(2, heightPct)}%`,
                    backgroundColor: theme.colors.primary,
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
          <Text key={point.date} style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {formatDisplayDate(point.date).slice(0, 2)}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  chart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 3 },
  bar: { width: '100%' },
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },
});
