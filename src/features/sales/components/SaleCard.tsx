import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency, formatDisplayTime } from '@/shared/utils';
import type { Order } from '@/api';

export interface SaleCardProps {
  order: Order;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank',
};

/** Color-coded per payment method, matched against `src/shared/theme/colors.ts` tokens. */
export function paymentMethodColor(theme: ReturnType<typeof useAppTheme>, method: string): string {
  switch (method) {
    case 'cash':
      return theme.colors.success;
    case 'easypaisa':
      return theme.colors.info;
    case 'foodpanda':
      return theme.colors.danger;
    case 'bank_account':
      return theme.colors.violet;
    default:
      return theme.colors.textSecondary;
  }
}

/**
 * Design `09 Sales` lines 457-461 — the `{{ slList }}` sale card: customer
 * name, `{{s.id}} · {{s.time}}` subline, amount + color-coded payment pill
 * top-right, then a `products · N units` summary line below.
 */
export function SaleCard({ order }: SaleCardProps) {
  const theme = useAppTheme();
  const payColor = paymentMethodColor(theme, order.paymentMethod);
  const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);
  const productsLine = order.items.map((item) => item.productName).join(', ');

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {order.customerName || 'Walking Customer'}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {order.orderNumber} · {formatDisplayTime(order.createdAt)}
          </Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(order.grandTotal)}</Text>
          <View style={[styles.payPill, { backgroundColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
            <Text style={[styles.payPillText, { color: payColor }]}>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</Text>
          </View>
        </View>
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]} numberOfLines={1}>
        {productsLine} <Text style={{ color: theme.colors.textFaint }}>· {totalQty} units</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  leftCol: { flex: 1, minWidth: 0 },
  rightCol: { alignItems: 'flex-end', gap: 5 },
  payPill: { paddingHorizontal: 9, paddingVertical: 3 },
  payPillText: { fontSize: 10, fontWeight: '700' },
});
