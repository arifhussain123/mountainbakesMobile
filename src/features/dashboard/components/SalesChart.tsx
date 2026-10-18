import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SalesAnalyticsDailyPoint } from '@/api';
import { barScalePct } from '../calculations';

export interface SalesChartProps {
  data: SalesAnalyticsDailyPoint[];
  /** The reference line drawn across the chart — `averageDailySales` from `/sales-analytics` (design line 139's "Avg Rs. X"). */
  average?: number;
}

/** CLAUDE.md Section 14 — touch-interactive bars, tap shows the exact value. */
export function SalesChart({ data, average = 0 }: SalesChartProps) {
  const theme = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1);
  // Non-finite values are left out of the scale (never `Math.max(…, NaN)` = NaN for every bar).
  const highestSales = Math.max(1, ...data.map((d) => (Number.isFinite(d.sales) ? d.sales : 0)));
  const maxSales = Number.isFinite(average) ? Math.max(highestSales, average) : highestSales;
  const selected = data[selectedIndex];
  const averageLineBottomPct = average > 0 ? Math.min(96, barScalePct(average, maxSales)) : null;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Daily Sales</Text>
        {average > 0 ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Avg {formatCurrency(average, 'averageDailySales')}</Text>
        ) : null}
      </View>
      {selected ? (
        <View style={[styles.selectedRow, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, marginTop: theme.spacing.sm }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatDisplayDate(selected.date)}</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
            {formatCurrency(selected.sales, 'daily.sales')}{' '}
            <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>· {formatCount(selected.transactions, 'daily.transactions')} orders</Text>
          </Text>
        </View>
      ) : null}
      <View style={[styles.chart, { marginTop: theme.spacing.lg, borderBottomColor: theme.colors.border }]}>
        {averageLineBottomPct !== null ? (
          <View pointerEvents="none" style={[styles.averageLine, { bottom: `${averageLineBottomPct}%`, borderColor: theme.colors.textFaint }]} />
        ) : null}
        {data.map((point, index) => {
          const heightPct = barScalePct(point.sales, maxSales);
          const active = index === selectedIndex;
          return (
            <Pressable
              key={point.date}
              onPress={() => setSelectedIndex(index)}
              style={styles.barColumn}
              accessibilityRole="button"
              accessibilityLabel={`${formatDisplayDate(point.date)}, ${formatCurrency(point.sales, 'daily.sales')}, ${formatCount(point.transactions, 'daily.transactions')} orders${
                point.sales === highestSales ? ', highest' : ''
              }`}>
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
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: theme.spacing.sm }]}>
        Tap a bar for the exact amount.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  chart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  averageLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 3 },
  bar: { width: '100%' },
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },
});
