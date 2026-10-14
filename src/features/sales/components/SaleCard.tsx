import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { Order } from '@/api';

export interface SaleCardProps {
  order: Order;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

/** CLAUDE.md Section 19 — Sale History cards. */
export function SaleCard({ order }: SaleCardProps) {
  const theme = useAppTheme();
  const itemsSummary = order.items.map((item) => `${item.productName} × ${item.qty}`).join(', ');

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{order.orderNumber}</Text>
        <StatusBadge label={PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} variant="info" />
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {formatDisplayDate(order.businessDate)} · {formatDisplayTime(order.createdAt)}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>CUSTOMER</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text }]}>{order.customerName || 'Walking Customer'}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>ITEMS</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={2}>
        {itemsSummary}
      </Text>
      <View style={[styles.row, { marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Total</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(order.grandTotal)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
