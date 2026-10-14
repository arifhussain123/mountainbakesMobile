import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { CashTransfer } from '@/api';

export interface CashTransferCardProps {
  item: CashTransfer;
}

const STATUS_LABEL: Record<CashTransfer['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_VARIANT: Record<CashTransfer['status'], StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

/** branchApp.md screen 15 — one branch cash transfer. No edit/withdraw exists for this resource. */
export function CashTransferCard({ item }: CashTransferCardProps) {
  const theme = useAppTheme();
  const channels = [
    item.cashAmount > 0 ? `Cash ${formatCurrency(item.cashAmount)}` : null,
    item.easypaisaAmount > 0 ? `Easypaisa ${formatCurrency(item.easypaisaAmount)}` : null,
    item.bankAmount > 0 ? `Bank ${formatCurrency(item.bankAmount)}` : null,
  ].filter(Boolean);

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{item.transferNo}</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(item.amount)}</Text>
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
      </Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 6 }]}>
        {channels.length > 0 ? channels.join(' · ') : 'Fuel only'}
        {item.fuelCharges > 0 ? ` · Fuel ${formatCurrency(item.fuelCharges)}` : ''}
      </Text>
      {item.note ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]} numberOfLines={2}>
          {item.note}
        </Text>
      ) : null}
      {item.status === 'rejected' && item.rejectionReason ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 6 }]} numberOfLines={2}>
          {item.rejectionReason}
        </Text>
      ) : null}
      <View style={[styles.footerRow, { marginTop: 10 }]}>
        <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
        {item.voucherNo ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginLeft: 8 }]}>{item.voucherNo}</Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
});
