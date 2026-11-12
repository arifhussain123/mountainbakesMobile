import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCount, formatCurrency } from '@/shared/utils';
import type { BranchStockHistoryRow } from '@/api';
import { KpiTile } from './KpiTile';

export interface StockGridProps {
  row: BranchStockHistoryRow;
  difference: number;
}

/** Redesign B03 "Branch stock" — Previous / New stock / Sold / Remaining as pastel tiles, two per row. */
export function StockGrid({ row, difference }: StockGridProps) {
  const theme = useAppTheme();

  const tiles = [
    { id: 'previous', label: 'Previous', dot: theme.colors.lavender, amount: row.openingAmount, sub: `${formatCount(row.openingQty, 'stock.openingQty')} items carried in` },
    { id: 'new', label: 'New stock', dot: theme.colors.success, amount: row.newAmount, sub: `${formatCount(row.newQty, 'stock.newQty')} items` },
    { id: 'sold', label: 'Sold', dot: theme.colors.danger, amount: row.soldAmount, sub: `${formatCount(row.soldQty, 'stock.soldQty')} items` },
    {
      id: 'balance',
      label: 'Remaining',
      dot: theme.colors.primary,
      amount: row.balanceAmount,
      sub: `${formatCount(row.balanceQty, 'stock.balanceQty')} items · ${formatCount(difference, 'stock.difference')} diff`,
      color: difference === 0 ? theme.colors.success : theme.colors.warning,
    },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((tile, i) => (
        <KpiTile
          key={tile.id}
          index={i}
          label={tile.label}
          value={formatCurrency(tile.amount, `stock.${tile.id}Amount`)}
          sub={tile.sub}
          dot={tile.dot}
          valueColor={tile.color}
          style={styles.cell}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '46%', flexGrow: 1 },
});
