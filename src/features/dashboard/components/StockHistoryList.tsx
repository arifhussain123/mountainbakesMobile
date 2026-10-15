import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { BranchStockHistoryRow } from '@/api';

export interface StockHistoryListProps {
  rows: BranchStockHistoryRow[];
}

/** Design lines 192-200 — "Stock History 7 Days" cards, each with a PREV/NEW/SOLD/RET-ADJ mini-grid. */
export function StockHistoryList({ rows }: StockHistoryListProps) {
  const theme = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {rows.map((row) => {
        const retAdj = row.returnedQty + row.adjustmentQty;
        const cells = [
          { id: 'prev', label: 'PREV', value: row.openingQty, color: theme.colors.text },
          { id: 'new', label: 'NEW', value: row.newQty, color: theme.colors.success },
          { id: 'sold', label: 'SOLD', value: row.soldQty, color: theme.colors.danger },
          { id: 'adj', label: 'RET/ADJ', value: retAdj, color: theme.colors.violet },
        ];
        return (
          <View
            key={row.date}
            style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg + 2, padding: theme.spacing.md }]}>
            <View style={styles.headerRow}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(row.date)}</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
                {row.balanceQty}{' '}
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, fontWeight: '400' }]}>
                  left · {formatCurrency(row.balanceAmount)}
                </Text>
              </Text>
            </View>
            <View style={[styles.grid, { marginTop: theme.spacing.sm, gap: 6 }]}>
              {cells.map((cell) => (
                <View key={cell.id} style={[styles.cell, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, padding: 7 }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, fontSize: 8, letterSpacing: 0.8 }]}>{cell.label}</Text>
                  <Text style={[theme.typography.body, { color: cell.color, fontWeight: '700', marginTop: 2 }]}>{cell.value}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  grid: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0 },
});
