import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { BranchStockHistoryRow } from '@/api';

export interface StockDetailTableProps {
  row: BranchStockHistoryRow;
  date: string;
  agrees: boolean;
  unexplained: number;
}

/** Design lines 183-187 — the "Stock Detail" label/qty/amount table + reconciliation line. */
export function StockDetailTable({ row, date, agrees, unexplained }: StockDetailTableProps) {
  const theme = useAppTheme();
  const displayDate = formatDisplayDate(date);

  const rows = [
    { id: 'previous', label: 'Previous Balance', q: row.openingQty, a: row.openingAmount, color: theme.colors.text },
    { id: 'new', label: 'New Stock', q: row.newQty, a: row.newAmount, color: theme.colors.success },
    { id: 'sold', label: 'Sold', q: -row.soldQty, a: -row.soldAmount, color: theme.colors.danger },
    { id: 'returned', label: 'Returned', q: row.returnedQty, a: row.returnedAmount, color: theme.colors.violet },
    { id: 'adjustment', label: 'Adjustment', q: row.adjustmentQty, a: row.adjustmentAmount, color: theme.colors.textSecondary },
    { id: 'remaining', label: 'Remaining', q: row.balanceQty, a: row.balanceAmount, color: theme.colors.primary },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.label, styles.headCell, { color: theme.colors.textSecondary }]}>STOCK DETAIL</Text>
        <Text style={[theme.typography.label, styles.qtyCell, { color: theme.colors.textSecondary }]}>QTY</Text>
        <Text style={[theme.typography.label, styles.amtCell, { color: theme.colors.textSecondary }]}>AMOUNT</Text>
      </View>
      {rows.map((item, index) => (
        <View key={item.id} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
          <View style={styles.headCell}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{item.label}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{displayDate}</Text>
          </View>
          <Text style={[theme.typography.body, styles.qtyCell, { color: item.color, fontWeight: '700' }]}>{formatCount(item.q, `stockDetail.${item.id}Qty`)}</Text>
          <Text style={[theme.typography.bodySmall, styles.amtCell, { color: item.color, fontWeight: '700' }]}>{formatCurrency(item.a, `stockDetail.${item.id}Amount`)}</Text>
        </View>
      ))}
      <View style={styles.footer}>
        {agrees ? (
          <>
            <Icon name="check" size={12} color={theme.colors.success} />
            <Text style={[theme.typography.label, { color: theme.colors.success, fontWeight: '700' }]}>Agrees with the Stock page</Text>
          </>
        ) : (
          <Text style={[theme.typography.label, { color: theme.colors.warning, fontWeight: '700' }]}>
            ⚠ Stock Difference Detected — {formatCount(unexplained, 'reconciliation.unexplained')} unexplained
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  headCell: { flex: 1 },
  qtyCell: { width: 44, textAlign: 'right' },
  amtCell: { width: 84, textAlign: 'right' },
  footer: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
