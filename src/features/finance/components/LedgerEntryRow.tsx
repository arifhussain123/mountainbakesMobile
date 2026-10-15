import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { LedgerEntry } from '@/api';

export interface LedgerEntryRowProps {
  entry: LedgerEntry;
}

/** One row of the Daily Ledger / recent-entries list — credit in green, debit in red, same convention as a bank statement. */
export function LedgerEntryRow({ entry }: LedgerEntryRowProps) {
  const theme = useAppTheme();
  const isCredit = entry.credit > 0;
  const amount = isCredit ? entry.credit : entry.debit;

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
      <Text style={[theme.typography.body, { color: isCredit ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
        {isCredit ? '+' : '-'}
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
});
