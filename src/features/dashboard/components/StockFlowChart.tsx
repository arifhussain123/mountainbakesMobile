import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCount } from '@/shared/utils';
import type { BranchStockHistoryRow } from '@/api';
import { barScalePct } from '../calculations';
import { dashType } from './dashType';

export interface StockFlowChartProps {
  row: BranchStockHistoryRow;
}

/** "Stock flow · qty" — Previous / New / Sold / Remaining as four rounded bars. */
export function StockFlowChart({ row }: StockFlowChartProps) {
  const theme = useAppTheme();

  const bars = [
    { id: 'previous', label: 'Previous', value: row.openingQty, color: theme.colors.lavender },
    { id: 'new', label: 'New', value: row.newQty, color: theme.colors.success },
    { id: 'sold', label: 'Sold', value: row.soldQty, color: theme.colors.danger },
    { id: 'remaining', label: 'Remaining', value: row.balanceQty, color: theme.colors.primary },
  ];
  const max = Math.max(1, ...bars.map((bar) => (Number.isFinite(bar.value) ? bar.value : 0)));

  return (
    <Card style={styles.card}>
      <Text style={[dashType.h3, { color: theme.colors.text }]}>Stock flow · qty</Text>
      <View style={styles.chart}>
        {bars.map((bar) => (
          <View key={bar.id} style={styles.column}>
            <Text style={[dashType.amt, { color: theme.colors.text, fontSize: 14 }]}>{formatCount(bar.value, `stockFlow.${bar.id}`)}</Text>
            <View style={[styles.bar, { height: `${Math.max(3, barScalePct(bar.value, max))}%`, backgroundColor: bar.color }]} />
          </View>
        ))}
      </View>
      <View style={styles.labelsRow}>
        {bars.map((bar) => (
          <Text key={bar.id} style={[styles.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {bar.label}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  chart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  column: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  bar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  labelsRow: { flexDirection: 'row', gap: 14, marginTop: -6 },
  label: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
});
