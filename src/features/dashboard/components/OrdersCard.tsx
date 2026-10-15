import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge } from '@/shared/ui';

export interface OrdersCardProps {
  total: number;
  pending: number;
  cancelled: number;
}

/** CLAUDE.md Section 9 — Total/Pending/Completed/Cancelled with consistent status colors. */
export function OrdersCard({ total, pending, cancelled }: OrdersCardProps) {
  const theme = useAppTheme();
  const completed = Math.max(0, total - pending - cancelled);

  const rows = [
    { label: 'Total', value: total, variant: 'neutral' as const },
    { label: 'Pending', value: pending, variant: 'warning' as const },
    { label: 'Completed', value: completed, variant: 'success' as const },
    { label: 'Cancelled', value: cancelled, variant: 'danger' as const },
  ];

  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Orders</Text>
      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{row.label}</Text>
            <View style={styles.right}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{row.value}</Text>
              <StatusBadge label={row.label} variant={row.variant} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
