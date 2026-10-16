import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useOrder } from '@/api';
import type { SalesStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, Icon, LoadingSkeleton, Screen, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { PAYMENT_LABEL, paymentMethodColor } from '../../components/SaleCard';
import { buildSaleReceiptText } from '../../receipt';
import { styles } from './styles';

/**
 * No Sale Detail screen exists in `mountainbakesBranch.html` — modeled after
 * `ProductionOrderDetailScreen`'s layout convention instead (AppHeader with
 * id/branch, a status badge, an itemized table, a Share-based "print").
 *
 * Branch roles can only view + reprint a sale — there is no edit/void
 * endpoint for a branch role (only a `super_admin`-only Help Desk ticket can
 * correct line items; see `backend/src/routes/support.routes.ts`).
 */
export function SaleDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<SalesStackParamList, 'SaleDetail'>>();
  const { orderId } = route.params;
  const { data: order, isLoading, error, refetch } = useOrder(orderId);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Sale" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error || !order) {
    return (
      <Screen>
        <AppHeader title="Sale" />
        <ErrorState message={error ? mapErrorToMessage(error) : 'This sale could not be found.'} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const payColor = paymentMethodColor(theme, order.paymentMethod);
  const handleReprint = () => {
    void Share.share({ message: buildSaleReceiptText(order), title: `${order.orderNumber} — Receipt` });
  };

  return (
    <Screen>
      <AppHeader title={order.orderNumber} subtitle={order.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusBadge label="Synced" variant="success" />
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {formatDisplayDate(order.businessDate)} · {formatDisplayTime(order.createdAt)}
          </Text>
        </View>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>CUSTOMER</Text>
        <Card style={{ marginTop: theme.spacing.sm }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{order.customerName || 'Walking Customer'}</Text>
          {order.customerPhone ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{order.customerPhone}</Text>
          ) : null}
        </Card>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>ITEMS</Text>
        <Card style={{ marginTop: theme.spacing.sm }}>
          {order.items.map((item, index) => (
            <View
              key={item.productId || item.productName}
              style={[styles.itemRow, { borderBottomColor: theme.colors.border, borderBottomWidth: index < order.items.length - 1 ? 1 : 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
                  {item.qty} × {formatCurrency(item.unitPrice)}
                  {item.discount > 0 ? ` · -${formatCurrency(item.discount)} disc.` : ''}
                </Text>
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={styles.totalsRow}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Subtotal</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.discountTotal > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Discount</Text>
              <Text style={[theme.typography.body, { color: theme.colors.danger }]}>-{formatCurrency(order.discountTotal)}</Text>
            </View>
          ) : null}
          {order.taxAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Government Tax</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{formatCurrency(order.taxAmount)}</Text>
            </View>
          ) : null}
          <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 4, paddingTop: 10 }]}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Grand Total</Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(order.grandTotal)}</Text>
          </View>
          <View style={[styles.totalsRow, { marginTop: 6 }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Payment</Text>
            <Text style={[theme.typography.body, { color: payColor, fontWeight: '700' }]}>
              {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </Text>
          </View>
          {order.receivedCash != null ? (
            <View style={styles.totalsRow}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Received Cash</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{formatCurrency(order.receivedCash)}</Text>
            </View>
          ) : null}
          {order.cashReturned != null ? (
            <View style={styles.totalsRow}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Cash Returned</Text>
              <Text style={[theme.typography.body, { color: theme.colors.success }]}>{formatCurrency(order.cashReturned)}</Text>
            </View>
          ) : null}
        </Card>

        {order.notes ? (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>NOTES</Text>
            <Card style={{ marginTop: theme.spacing.sm }}>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{order.notes}</Text>
            </Card>
          </>
        ) : null}

        <View style={styles.printRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reprint receipt"
            onPress={handleReprint}
            style={[styles.printButton, { backgroundColor: theme.colors.primary }]}>
            <Icon name="printer" size={16} color={theme.colors.primaryText} />
            <Text style={[theme.typography.body, { color: theme.colors.primaryText, fontWeight: '700' }]}>Reprint Receipt</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
