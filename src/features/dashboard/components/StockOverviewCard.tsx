import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatCard } from '@/shared/ui';
import type { BranchStockHistoryRow } from '@/api';

export interface StockOverviewCardProps {
  row: BranchStockHistoryRow;
}

/** CLAUDE.md Section 10 — Opening / New / Sold / Adjustment / Remaining, from the real ledger. */
export function StockOverviewCard({ row }: StockOverviewCardProps) {
  const theme = useAppTheme();

  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Branch Stock</Text>
      <View style={[styles.grid, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
        <View style={styles.cell}>
          <StatCard label="Opening" value={String(row.openingQty)} />
        </View>
        <View style={styles.cell}>
          <StatCard label="New" value={`+${row.newQty}`} valueColor={theme.colors.success} />
        </View>
        <View style={styles.cell}>
          <StatCard label="Sold" value={`-${row.soldQty}`} valueColor={theme.colors.danger} />
        </View>
        <View style={styles.cell}>
          <StatCard label="Returned" value={String(row.returnedQty)} />
        </View>
        <View style={styles.cell}>
          <StatCard label="Adjustment" value={`${row.adjustmentQty >= 0 ? '+' : ''}${row.adjustmentQty}`} />
        </View>
        <View style={styles.cell}>
          <StatCard label="Remaining" value={String(row.balanceQty)} valueColor={theme.colors.primary} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '30%' },
});
