import { StyleSheet, Text, View } from 'react-native';
import { designType, useAppTheme } from '@/shared/theme';
import { Card, MiniStat } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate, formatSigned } from '@/shared/utils';
import { computeStockHistoryRetAdj } from '../calculations';
import type { BranchStockHistoryRow } from '@/api';

export interface StockHistoryListProps {
  rows: BranchStockHistoryRow[];
}

/** "Stock history · 7 days" — one card per day with a Prev / New / Sold / Ret-Adj mini-stat strip. */
export function StockHistoryList({ rows }: StockHistoryListProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const retAdj = computeStockHistoryRetAdj(row);
        const cells = [
          { id: 'prev', label: 'Prev', value: formatCount(row.openingQty, 'stockHistory.openingQty'), color: theme.colors.text },
          { id: 'new', label: 'New', value: formatCount(row.newQty, 'stockHistory.newQty'), color: theme.colors.success },
          { id: 'sold', label: 'Sold', value: formatCount(row.soldQty, 'stockHistory.soldQty'), color: theme.colors.danger },
          { id: 'adj', label: 'Ret/Adj', value: Number.isFinite(retAdj) ? formatSigned(retAdj) : formatCount(retAdj, 'stockHistory.retAdj'), color: theme.colors.violet },
        ];
        return (
          <Card key={row.date} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={[designType.h3, { color: theme.colors.text, fontSize: 15 }]}>{formatDisplayDate(row.date)}</Text>
              <Text style={[designType.amt, { color: theme.colors.text, fontSize: 15 }]} numberOfLines={1}>
                {formatCount(row.balanceQty, 'stockHistory.balanceQty')}{' '}
                <Text style={[designType.xs, { color: theme.colors.textFaint }]}>left · {formatCurrency(row.balanceAmount, 'stockHistory.balanceAmount')}</Text>
              </Text>
            </View>
            <View style={[styles.strip, { backgroundColor: theme.colors.background }]}>
              {cells.map((cell) => (
                <MiniStat key={cell.id} label={cell.label} value={cell.value} valueColor={cell.color} style={styles.cell} />
              ))}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { padding: 14, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  strip: { flexDirection: 'row', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  cell: { alignItems: 'center' },
});
