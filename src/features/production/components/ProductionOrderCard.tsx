import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ProductionOrder } from '@/api';

export interface ProductionOrderCardProps {
  order: ProductionOrder;
  onPress: () => void;
}

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  pending: 'Pending',
  awaiting_verification: 'Sent — Awaiting Verify',
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

/** mountainbakesProduction.html screen 02 — one branch demand, Production's review queue. */
export function ProductionOrderCard({ order, onPress }: ProductionOrderCardProps) {
  const theme = useAppTheme();
  const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={{ marginBottom: 10 }}>
        <View style={styles.row}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{order.demandNumber}</Text>
          <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          {order.branchName} · {formatDisplayDate(order.date)}
          {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 8 }]}>
          {order.items.length} product{order.items.length === 1 ? '' : 's'} · {totalQty} units
          {order.packingItems && order.packingItems.length > 0 ? ` · ${order.packingItems.length} packing` : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
