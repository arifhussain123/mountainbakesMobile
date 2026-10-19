import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { LedgerEntry, LedgerEntryStatus } from '@/api';

const STATUS_VARIANT: Record<LedgerEntryStatus, StatusVariant> = {
  posted: 'success',
  locked: 'neutral',
  reversed: 'danger',
};

function Row({ label, value }: { label: string; value: string | null }) {
  const theme = useAppTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6 }}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

export function LedgerEntryDetailSheet({ entry }: { entry: LedgerEntry }) {
  const theme = useAppTheme();
  const isDebit = entry.debit > 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[theme.typography.screenTitle, { color: isDebit ? theme.colors.success : theme.colors.danger }]}>
          {isDebit ? '+' : '−'}
          {formatCurrency(isDebit ? entry.debit : entry.credit)}
        </Text>
        <StatusBadge label={entry.status} variant={STATUS_VARIANT[entry.status]} />
      </View>
      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{entry.description}</Text>

      <View style={{ marginTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }}>
        <Row label="Voucher No" value={entry.voucherNo} />
        <Row label="Date" value={formatDisplayDate(entry.entryDate)} />
        <Row label="Ledger Head" value={entry.ledgerHeadName} />
        <Row label="Branch" value={entry.branchName} />
        <Row label="Account" value={entry.account === 'bank' ? 'Bank' : 'Cash in Hand'} />
        <Row label="Payment Method" value={entry.paymentMethod} />
        <Row label="Source" value={entry.sourceType} />
        <Row label="Running Balance" value={formatCurrency(entry.balance)} />
        <Row label="Posted By" value={entry.createdByName} />
        <Row label="Approved By" value={entry.approvedByName} />
      </View>
    </View>
  );
}
