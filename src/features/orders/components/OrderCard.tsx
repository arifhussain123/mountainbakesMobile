import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ProductionOrder } from '@/api';
import { fulfilledTotals, isVerified, livePackingItems, requestedTotals } from '../utils/demandLines';

export interface OrderCardProps {
  order: ProductionOrder;
  /** True for a demand still sitting in the local sync queue, not yet on the server. */
  pendingSync?: boolean;
  onView: () => void;
  onDemand: () => void;
  onDelete?: () => void;
}

// Matches mountainbakesBranch.html / BranchNewOrders.tsx exactly — 'pending' is
// NOT relabeled "Awaiting Production" here (that label belongs to Return Stock's
// own status pill); a production order's pending state is plainly "Pending".
const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  pending: 'Pending',
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified — Awaiting Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  // Called "Deleted" on screen — this is the outcome of the branch's own
  // Delete action, and 'cancelled' is only what the API happens to call it.
  cancelled: 'Deleted',
};

const STATUS_VARIANT: Record<ProductionOrder['status'], StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'violet',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.statCell}>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[theme.typography.body, { color: accent ? theme.colors.primary : theme.colors.text, marginTop: 2, fontWeight: '700' }]}>
        {value}
      </Text>
    </View>
  );
}

/** branchApp.md screen 04 "New Orders" — one branch production demand card. */
export function OrderCard({ order, pendingSync, onView, onDemand, onDelete }: OrderCardProps) {
  const theme = useAppTheme();
  const requested = requestedTotals(order);
  const verified = isVerified(order);
  const fulfilled = verified ? fulfilledTotals(order) : null;
  const packingCount = livePackingItems(order.packingItems).length;

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{order.demandNumber}</Text>
        {pendingSync ? (
          <StatusBadge label="Waiting to sync" variant="neutral" />
        ) : (
          <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
        )}
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {formatDisplayDate(order.date)} · {order.time}
        {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
      </Text>

      <View style={styles.statsRow}>
        <StatCell label="PRODUCTS" value={String(requested.products)} />
        <StatCell label="DEMAND QTY" value={String(requested.qty)} />
        <StatCell label="VERIFIED PRODUCTS" value={fulfilled ? String(fulfilled.products) : '—'} />
        <StatCell label="VERIFIED QTY" value={fulfilled ? String(fulfilled.qty) : '—'} accent={!!fulfilled} />
      </View>

      {packingCount > 0 ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          {packingCount} packing material{packingCount === 1 ? '' : 's'}
        </Text>
      ) : null}

      {order.status === 'cancelled' && order.cancelReason ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]} numberOfLines={2}>
          Reason · {order.cancelReason}
        </Text>
      ) : null}

      <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
        <Pressable accessibilityRole="button" onPress={onView} style={styles.actionButton}>
          <Icon name="chevron-right" size={14} color={theme.colors.text} />
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>View</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDemand} style={styles.actionButton}>
          <Icon name="box" size={14} color={theme.colors.text} />
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Demand</Text>
        </Pressable>
        {order.status === 'pending' && onDelete ? (
          <Pressable accessibilityRole="button" onPress={onDelete} style={styles.actionButton}>
            <Icon name="trash" size={14} color={theme.colors.danger} />
            <Text style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '700' }]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 4, marginTop: 10 },
  statCell: { flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32 },
});
