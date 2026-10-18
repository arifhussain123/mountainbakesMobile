import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCount, formatCurrency } from '@/shared/utils';
import type { BranchStockHistoryRow } from '@/api';

export interface StockGridProps {
  row: BranchStockHistoryRow;
  difference: number;
}

/** Design lines 170-175 — Previous / New Stock / Sold / Remaining (orange) 4-card grid. */
export function StockGrid({ row, difference }: StockGridProps) {
  const theme = useAppTheme();

  const tiles = [
    { id: 'previous', label: 'PREVIOUS', dot: theme.colors.lavender, amount: row.openingAmount, sub: `${formatCount(row.openingQty, 'stock.openingQty')} items carried in` },
    { id: 'new', label: 'NEW STOCK', dot: theme.colors.success, amount: row.newAmount, sub: `${formatCount(row.newQty, 'stock.newQty')} items` },
    { id: 'sold', label: 'SOLD', dot: theme.colors.danger, amount: row.soldAmount, sub: `${formatCount(row.soldQty, 'stock.soldQty')} items` },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View
          key={tile.id}
          style={[styles.cell, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderWidth: 1, borderRadius: theme.radii.lg, padding: theme.spacing.md }]}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: tile.dot }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, letterSpacing: 1 }]}>{tile.label}</Text>
          </View>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 6 }]}>{formatCurrency(tile.amount, `stock.${tile.id}Amount`)}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>{tile.sub}</Text>
        </View>
      ))}
      <View style={[styles.cell, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, padding: theme.spacing.md }]}>
        <Text style={[theme.typography.label, { color: theme.colors.primaryText, letterSpacing: 1 }]}>REMAINING</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.primaryText, marginTop: 6 }]}>{formatCurrency(row.balanceAmount, 'stock.balanceAmount')}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.primaryText, opacity: 0.75, marginTop: 2 }]}>
          {formatCount(row.balanceQty, 'stock.balanceQty')} items · {formatCount(difference, 'stock.difference')} difference
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 2 },
});
