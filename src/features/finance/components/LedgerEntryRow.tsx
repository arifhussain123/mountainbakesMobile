import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { LedgerEntry } from '@/api';

export interface LedgerEntryRowProps {
  entry: LedgerEntry;
}

/** One row of the Daily Ledger / recent-entries list — debit (receipt, adds to the cash book) in green with `+`, credit (payment, subtracts) in red with `−`. */
export function LedgerEntryRow({ entry }: LedgerEntryRowProps) {
  const theme = useAppTheme();
  const isDebit = entry.debit > 0;
  const amount = isDebit ? entry.debit : entry.credit;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
          {entry.ledgerHeadName}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {entry.voucherNo} · {formatDisplayDate(entry.entryDate)}
          {entry.branchName ? ` · ${entry.branchName}` : ''}
        </Text>
      </View>
      <Text style={[theme.typography.body, { color: isDebit ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
        {isDebit ? '+' : '−'}
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
});
