import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayTime } from '@/shared/utils';
import type { Order } from '@/api';
import { FLAT_CARD, TYPE } from './RedesignBits';

export interface SaleCardProps {
  order: Order;
  onPress?: () => void;
  /** Set by the offline sync queue (Phase 2) — absent for an already-synced sale fetched from the server. */
  syncState?: 'pending' | 'failed';
}

export const PAYMENT_LABEL: Record<string, string> = {
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
 * Redesign `09 Sales` — one sale as a flat card: "products · N units" as the
 * title, "id · time · customer" under it, the amount and a colour-coded
 * payment pill on the right.
 */
export function SaleCard({ order, onPress, syncState }: SaleCardProps) {
  const theme = useAppTheme();
  const payColor = paymentMethodColor(theme, order.paymentMethod);
  const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);
  const productsLine = order.items.map((item) => `${item.productName} ×${item.qty}`).join(', ');
  // Walk-in sales have no customer name — the mockup leaves it off the line then.
  const subline = [order.orderNumber, formatDisplayTime(order.createdAt), order.customerName].filter(Boolean).join(' · ');

  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress} style={styles.wrap}>
      <Card style={[FLAT_CARD, styles.card]}>
        {syncState ? (
          <View style={styles.sync}>
            <StatusBadge label={syncState === 'pending' ? 'Waiting to sync' : 'Sync failed · Fix'} variant={syncState === 'pending' ? 'warning' : 'danger'} />
          </View>
        ) : null}
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={[TYPE.h3s, { color: theme.colors.text }]} numberOfLines={2}>
              {productsLine || '—'} <Text style={{ color: theme.colors.textSecondary }}>· {totalQty} units</Text>
            </Text>
            <Text style={[TYPE.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
              {subline}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={[TYPE.amt, { color: theme.colors.text }]}>{formatCurrency(order.grandTotal)}</Text>
            <View style={[styles.payPill, { backgroundColor: `${payColor}1A` }]}>
              <Text style={[styles.payPillText, { color: payColor }]}>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: { paddingVertical: 14 },
  sync: { marginBottom: 8, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  left: { flex: 1, minWidth: 0, gap: 4 },
  right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  payPill: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payPillText: { fontSize: 11, fontWeight: '600' },
});
