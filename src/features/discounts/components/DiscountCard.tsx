import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchDiscount } from '@/api';

export interface DiscountCardProps {
  item: BranchDiscount;
  onChange: () => void;
  onWithdraw: () => void;
}

const STATUS_LABEL: Record<BranchDiscount['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

const STATUS_VARIANT: Record<BranchDiscount['status'], StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  returned: 'info',
};

const OPEN_STATUSES: BranchDiscount['status'][] = ['pending', 'returned'];

/** branchApp.md screens 07/14 — one branch discount claim. */
export function DiscountCard({ item, onChange, onWithdraw }: DiscountCardProps) {
  const theme = useAppTheme();
  const canEdit = OPEN_STATUSES.includes(item.status);

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{item.demandNumber}</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(item.amount)}</Text>
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
      </Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }]} numberOfLines={2}>
        {item.reason}
      </Text>
      {item.reviewNote ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.warning, marginTop: 6 }]} numberOfLines={2}>
          Production: {item.reviewNote}
        </Text>
      ) : null}
      <View style={[styles.footerRow, { marginTop: 10 }]}>
        <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
        {!canEdit ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginLeft: 8 }]}>Final</Text> : null}
      </View>
      {canEdit ? (
        <View style={styles.actionsRow}>
          <Pressable accessibilityRole="button" onPress={onChange} style={[styles.actionButton, { backgroundColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Change</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onWithdraw} style={[styles.actionButton, { backgroundColor: `${theme.colors.danger}1A` }]}>
            <Text style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '700' }]}>Withdraw</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: { height: 30, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
