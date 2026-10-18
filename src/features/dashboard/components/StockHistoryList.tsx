import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCount, formatCurrency, formatDisplayDate, formatSigned } from '@/shared/utils';
import { computeStockHistoryRetAdj } from '../calculations';
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
        const retAdj = computeStockHistoryRetAdj(row);
        const cells = [
          { id: 'prev', label: 'PREV', value: formatCount(row.openingQty, 'stockHistory.openingQty'), color: theme.colors.text },
          { id: 'new', label: 'NEW', value: formatCount(row.newQty, 'stockHistory.newQty'), color: theme.colors.success },
          { id: 'sold', label: 'SOLD', value: formatCount(row.soldQty, 'stockHistory.soldQty'), color: theme.colors.danger },
          { id: 'adj', label: 'RET/ADJ', value: Number.isFinite(retAdj) ? formatSigned(retAdj) : formatCount(retAdj, 'stockHistory.retAdj'), color: theme.colors.violet },
        ];
        return (
          <View
            key={row.date}
            style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg + 2, padding: theme.spacing.md }]}>
            <View style={styles.headerRow}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(row.date)}</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', textAlign: 'right' }]}>
                {formatCount(row.balanceQty, 'stockHistory.balanceQty')}{' '}
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, fontWeight: '400' }]}>
                  left · {formatCurrency(row.balanceAmount, 'stockHistory.balanceAmount')}
                </Text>
              </Text>
            </View>
            <View style={[styles.grid, { marginTop: theme.spacing.sm, gap: 8 }]}>
              {cells.map((cell) => (
                <View key={cell.id} style={[styles.cell, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, padding: 7 }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, fontSize: 8, letterSpacing: 0.8, textAlign: 'center' }]}>
                    {cell.label}
                  </Text>
                  <Text
                    style={[
                      theme.typography.body,
                      styles.value,
                      { color: cell.color, fontWeight: '700', marginTop: 4 },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}>
                    {cell.value}
                  </Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  value: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
