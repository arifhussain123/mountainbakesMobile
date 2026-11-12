import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, InfoBanner } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { BranchStockHistoryRow } from '@/api';
import { dashType } from './dashType';

export interface StockDetailTableProps {
  row: BranchStockHistoryRow;
  date: string;
  agrees: boolean;
  unexplained: number;
}

/** "Stock detail" — label / qty / amount per movement, with the reconciliation result as a banner. */
export function StockDetailTable({ row, date, agrees, unexplained }: StockDetailTableProps) {
  const theme = useAppTheme();
  const displayDate = formatDisplayDate(date);

  const rows = [
    { id: 'previous', label: 'Previous balance', q: row.openingQty, a: row.openingAmount, color: theme.colors.text },
    { id: 'new', label: 'New stock', q: row.newQty, a: row.newAmount, color: theme.colors.success },
    { id: 'sold', label: 'Sold', q: -row.soldQty, a: -row.soldAmount, color: theme.colors.danger },
    { id: 'returned', label: 'Returned', q: row.returnedQty, a: row.returnedAmount, color: theme.colors.violet },
    { id: 'adjustment', label: 'Adjustment', q: row.adjustmentQty, a: row.adjustmentAmount, color: theme.colors.textSecondary },
    { id: 'remaining', label: 'Remaining', q: row.balanceQty, a: row.balanceAmount, color: theme.colors.primary },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[dashType.xs, styles.headCell, { color: theme.colors.textFaint }]}>{displayDate}</Text>
        <Text style={[dashType.xs, styles.qtyCell, { color: theme.colors.textFaint }]}>Qty</Text>
        <Text style={[dashType.xs, styles.amtCell, { color: theme.colors.textFaint }]}>Amount</Text>
      </View>
      {rows.map((item) => (
        <View key={item.id} style={[styles.row, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.label, styles.headCell, { color: theme.colors.text }]} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[dashType.amt, styles.qtyCell, { color: item.color, fontSize: 15 }]}>{formatCount(item.q, `stockDetail.${item.id}Qty`)}</Text>
          <Text style={[dashType.amt, styles.amtCell, { color: item.color, fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatCurrency(item.a, `stockDetail.${item.id}Amount`)}
          </Text>
        </View>
      ))}
      <InfoBanner kind={agrees ? 'ok' : 'warn'} style={styles.banner}>
        {agrees
          ? 'Agrees with the Stock page'
          : `Stock Difference Detected — ${formatCount(unexplained, 'reconciliation.unexplained')} unexplained`}
      </InfoBanner>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 10 },
  headerRow: { flexDirection: 'row', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  headCell: { flex: 1, minWidth: 0 },
  qtyCell: { width: 48, textAlign: 'right' },
  amtCell: { width: 96, textAlign: 'right' },
  banner: { marginTop: 10 },
});
