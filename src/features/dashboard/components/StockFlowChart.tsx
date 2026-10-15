import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import type { BranchStockHistoryRow } from '@/api';

export interface StockFlowChartProps {
  row: BranchStockHistoryRow;
}

/** Design lines 176-182 — "Stock Flow · Qty" 4-bar chart (Previous/New/Sold/Remaining). */
export function StockFlowChart({ row }: StockFlowChartProps) {
  const theme = useAppTheme();

  const bars = [
    { id: 'previous', label: 'PREVIOUS', value: row.openingQty, color: theme.colors.secondary },
    { id: 'new', label: 'NEW', value: row.newQty, color: theme.colors.success },
    { id: 'sold', label: 'SOLD', value: row.soldQty, color: theme.colors.danger },
    { id: 'remaining', label: 'REMAINING', value: row.balanceQty, color: theme.colors.primary },
  ];
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <Card>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
        Stock Flow · Qty
      </Text>
      <View style={[styles.chart, { marginTop: theme.spacing.md, borderBottomColor: theme.colors.border }]}>
        {bars.map((bar) => (
          <View key={bar.id} style={styles.column}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{bar.value}</Text>
            <View
              style={[
                styles.bar,
                { height: `${Math.max(2, (bar.value / max) * 100)}%`, backgroundColor: bar.color, borderRadius: theme.radii.sm },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labelsRow}>
        {bars.map((bar) => (
          <Text key={bar.id} style={[theme.typography.label, { color: theme.colors.textFaint, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {bar.label}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, gap: 18 },
  column: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  bar: { width: '100%' },
  labelsRow: { flexDirection: 'row', marginTop: 6, gap: 18 },
});
