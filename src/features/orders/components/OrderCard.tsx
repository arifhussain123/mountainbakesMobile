import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ProductionOrder } from '@/api';

export interface OrderCardProps {
  order: ProductionOrder;
}

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  pending: 'Pending',
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<ProductionOrder['status'], StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** branchApp.md screen 04 "New Orders" — one branch production demand card. */
export function OrderCard({ order }: OrderCardProps) {
  const theme = useAppTheme();
  const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);
  const approvedQty = order.items.reduce((sum, item) => sum + (item.approvedQty ?? item.qty), 0);
  const hasApproval = order.status === 'approved' || order.status === 'verified';

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{order.demandNumber}</Text>
        <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {formatDisplayDate(order.date)} · {order.time}
        {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
      </Text>
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PRODUCTS</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2, fontWeight: '700' }]}>{order.items.length}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>QTY</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2, fontWeight: '700' }]}>
            {hasApproval ? `${approvedQty} / ${totalQty}` : totalQty}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PACKING</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2, fontWeight: '700' }]}>{order.packingItems?.length ?? 0}</Text>
        </View>
      </View>
      {order.status === 'cancelled' && order.cancelReason ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          <Text style={{ color: theme.colors.textSecondary }}>Reason · </Text>
          {order.cancelReason}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  statBox: { flex: 1, padding: 8 },
});
