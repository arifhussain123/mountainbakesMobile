import { StyleSheet, Text, View } from 'react-native';
import { designType, useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCount } from '@/shared/utils';
import { completedOrders, orderCompletionPct } from '../calculations';
import { DonutRing } from './DonutRing';

export interface OrdersCardProps {
  total: number;
  pending: number;
  cancelled: number;
}

/**
 * The Orders summary (CLAUDE.md §9): a completion donut ("N% completed") beside
 * Total / Pending / Completed / Cancelled, each status as a dot badge.
 */
export function OrdersCard({ total, pending, cancelled }: OrdersCardProps) {
  const theme = useAppTheme();
  const completed = completedOrders(total, pending, cancelled);
  const pct = Math.round(orderCompletionPct(total, pending, cancelled) ?? 0);

  const rows: { label: string; value: number; variant?: StatusVariant }[] = [
    { label: 'Total', value: total },
    { label: 'Pending', value: pending, variant: 'warning' },
    { label: 'Completed', value: completed, variant: 'success' },
    { label: 'Cancelled', value: cancelled, variant: 'danger' },
  ];

  return (
    <Card style={styles.card}>
      <DonutRing size={112} stroke={16} parts={[{ pct, color: theme.colors.primary }]}>
        <Text style={[designType.h3, { color: theme.colors.text }]}>{pct}%</Text>
        <Text style={[designType.xs, { color: theme.colors.textFaint }]}>completed</Text>
      </DonutRing>
      <View style={styles.list}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            {row.variant ? (
              <StatusBadge label={row.label} variant={row.variant} />
            ) : (
              <Text style={[designType.sm, { color: theme.colors.textSecondary, fontWeight: '600' }]}>{row.label}</Text>
            )}
            <Text style={[designType.amt, { color: theme.colors.text }]}>{formatCount(row.value, `orders.${row.label}`)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  list: { flex: 1, minWidth: 0, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
