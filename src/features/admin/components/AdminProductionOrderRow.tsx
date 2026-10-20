import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProductionOrder } from '@/api';
import { fulfilledTotals, requestedTotals } from '@/features/orders/utils/demandLines';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCount, formatDisplayDate } from '@/shared/utils';
import { PRODUCTION_ORDER_STATUS_VARIANT, productionOrderStatusLabel, shortBranch, slipReference } from '../utils/productionOrders';

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.cell}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: strong ? '700' : '500' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * One row of the web Orders table as a phone card — ID, Order #, Date, Time,
 * Required Date, Branch, Demand Qty, Status and the branch's Reason when it
 * deleted the demand. Tap opens the read-only slip.
 */
export const AdminProductionOrderRow = memo(function AdminProductionOrderRow({
  order,
  onPress,
}: {
  order: ProductionOrder;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  // What the branch asked for; what is actually going out shown beside it only when review moved it.
  const asked = requestedTotals(order).qty;
  const moving = fulfilledTotals(order).qty;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${order.demandNumber}`} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
              {shortBranch(order.branchName)}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {order.demandNumber} · {slipReference(order)}
            </Text>
          </View>
          <StatusBadge
            label={productionOrderStatusLabel(order.status)}
            variant={PRODUCTION_ORDER_STATUS_VARIANT[order.status] ?? 'neutral'}
          />
        </View>

        <View style={styles.grid}>
          <Cell label="Date" value={order.date ? formatDisplayDate(order.date) : '—'} />
          <Cell label="Time" value={order.time || '—'} />
          <Cell label="Required Date" value={order.requiredDate ? formatDisplayDate(order.requiredDate) : '—'} strong={!!order.requiredDate} />
          <Cell label="Demand Qty" value={moving !== asked ? `${formatCount(asked)} → ${formatCount(moving)}` : formatCount(asked)} strong />
        </View>

        {order.cancelReason ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]} numberOfLines={3}>
            Reason: {order.cancelReason}
          </Text>
        ) : null}

        <View style={styles.viewRow}>
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '600' }]}>View</Text>
          <Icon name="chevron-right" size={14} color={theme.colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { padding: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10 },
  cell: { width: '50%', paddingRight: 8 },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 6 },
});
