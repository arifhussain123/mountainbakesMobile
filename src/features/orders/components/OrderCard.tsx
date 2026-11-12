import { StyleSheet, Text, View } from 'react-native';
import { tintFill, useAppTheme } from '@/shared/theme';
import { Card, InfoBanner, MiniStat, SmallButton, StatusBadge, type StatusVariant } from '@/shared/ui';
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

/**
 * 2026 redesign B04 "New Orders" — one branch production demand card: the
 * demand number over its date · required date with the status pill on the
 * right, then a lavender strip of Products / Qty / Packing ("verified /
 * requested" once the branch has verified the delivery), the reason banner,
 * and the View / Demand / Delete actions.
 */
export function OrderCard({ order, pendingSync, onView, onDemand, onDelete }: OrderCardProps) {
  const theme = useAppTheme();
  const requested = requestedTotals(order);
  const verified = isVerified(order);
  const fulfilled = verified ? fulfilledTotals(order) : null;
  const packingCount = livePackingItems(order.packingItems).length;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.titleCol}>
          <Text style={[styles.h3, { color: theme.colors.text }]} numberOfLines={1}>
            {order.demandNumber}
          </Text>
          <Text style={[styles.xs, { color: theme.colors.textFaint }]} numberOfLines={2}>
            {formatDisplayDate(order.date)} · {order.time}
            {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
          </Text>
        </View>
        {pendingSync ? (
          <StatusBadge label="Waiting to sync" variant="neutral" />
        ) : (
          <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
        )}
      </View>

      <View
        accessible
        accessibilityLabel={
          fulfilled
            ? `${fulfilled.products} of ${requested.products} products verified, ${fulfilled.qty} of ${requested.qty} units verified, ${packingCount} packing materials`
            : `${requested.products} products, ${requested.qty} units, ${packingCount} packing materials`
        }
        style={[styles.tint, { backgroundColor: tintFill(theme) }]}>
        <MiniStat label="Products" value={fulfilled ? `${fulfilled.products} / ${requested.products}` : String(requested.products)} />
        <MiniStat
          label="Qty"
          value={fulfilled ? `${fulfilled.qty} / ${requested.qty}` : String(requested.qty)}
          valueColor={fulfilled && fulfilled.qty !== requested.qty ? theme.colors.primary : undefined}
        />
        <MiniStat label="Packing" value={String(packingCount)} />
      </View>

      {order.status === 'cancelled' && order.cancelReason ? (
        <InfoBanner kind="warn" style={styles.banner}>
          {`Reason · ${order.cancelReason}`}
        </InfoBanner>
      ) : null}

      <View style={styles.actionsRow}>
        <SmallButton label="View" icon="chevron-right" onPress={onView} />
        <SmallButton label="Demand" icon="box" onPress={onDemand} />
        {order.status === 'pending' && onDelete ? <SmallButton label="Delete" icon="trash" kind="danger" onPress={onDelete} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  titleCol: { flex: 1, minWidth: 0, gap: 2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  tint: { flexDirection: 'row', gap: 8, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  banner: { paddingVertical: 8, paddingHorizontal: 12 },
  actionsRow: { flexDirection: 'row', gap: 8 },
});
