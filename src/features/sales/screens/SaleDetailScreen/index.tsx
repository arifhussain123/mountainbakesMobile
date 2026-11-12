import { ScrollView, Share, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useOrder } from '@/api';
import type { SalesStackParamList } from '@/navigation';
import { designType, FLAT_CARD, heroType, useAppTheme } from '@/shared/theme';
import { BackBar, Card, ErrorState, Eyebrow, HeroSurface, ListThumb, LoadingSkeleton, MiniStat, PrimaryButton, Screen, StatusBadge, useHeroInk } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ReportIssueAction } from '@/features/support';
import { PAYMENT_LABEL, paymentMethodColor } from '../../components';
import { buildSaleReceiptText } from '../../receipt';
import { styles } from './styles';

/**
 * No Sale Detail screen exists in the mockups — laid out in the 2026 redesign's
 * language instead: back + id/branch, a violet total hero, the customer, an
 * itemized list, the totals summary and a Share-based "print".
 *
 * Branch roles can only view + reprint a sale — there is no edit/void
 * endpoint for a branch role (only a `super_admin`-only Help Desk ticket can
 * correct line items; see `backend/src/routes/support.routes.ts`).
 */
export function SaleDetailScreen() {
  const navigation = useNavigation();
  const theme = useAppTheme();
  const route = useRoute<RouteProp<SalesStackParamList, 'SaleDetail'>>();
  const { orderId } = route.params;
  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  const { ink: heroInk, muted: heroMuted } = useHeroInk();

  if (isLoading) {
    return (
      <Screen>
        <BackBar onBack={() => navigation.goBack()} title="Sale" />
        <View style={{ padding: 20 }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error || !order) {
    return (
      <Screen>
        <BackBar onBack={() => navigation.goBack()} title="Sale" />
        <ErrorState message={error ? mapErrorToMessage(error) : 'This sale could not be found.'} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const payColor = paymentMethodColor(theme, order.paymentMethod);
  const payLabel = PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod;
  const handleReprint = () => {
    void Share.share({ message: buildSaleReceiptText(order), title: `${order.orderNumber} — Receipt` });
  };

  return (
    <Screen>
      <BackBar onBack={() => navigation.goBack()} title={order.orderNumber} subtitle={order.branchName} />
      <ScrollView contentContainerStyle={styles.body}>
        <HeroSurface style={styles.hero}>
          <View style={styles.heroHead}>
            <Text style={[heroType.eyebrow, { color: heroMuted }]}>Grand total</Text>
          </View>
          <Text style={[heroType.amount, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrency(order.grandTotal)}
          </Text>
          <View style={styles.miniRow}>
            <MiniStat onHero label="Date" value={formatDisplayDate(order.businessDate)} />
            <MiniStat onHero label="Time" value={formatDisplayTime(order.createdAt)} />
            <MiniStat onHero label="Payment" value={payLabel} />
          </View>
        </HeroSurface>
        <View style={styles.statusRow}>
          <StatusBadge label="Synced" variant="success" />
        </View>

        <Eyebrow>Customer</Eyebrow>
        <Card style={[FLAT_CARD, styles.customer]}>
          <ListThumb icon="user" index={1} />
          <View style={styles.grow}>
            <Text style={[designType.h3s, { color: theme.colors.text }]}>{order.customerName || 'Walking Customer'}</Text>
            {order.customerPhone ? <Text style={[designType.xs, { color: theme.colors.textFaint, marginTop: 2 }]}>{order.customerPhone}</Text> : null}
          </View>
        </Card>

        <Eyebrow>Items</Eyebrow>
        <Card style={[FLAT_CARD, styles.list]}>
          {order.items.map((item, index) => (
            <View
              key={item.productId || item.productName}
              style={[styles.itemRow, { borderTopColor: theme.colors.border, borderTopWidth: index === 0 ? 0 : 1 }]}>
              <ListThumb text={initials(item.productName)} index={index} />
              <View style={styles.grow}>
                <Text style={[designType.h3s, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={[designType.xs, { color: theme.colors.textFaint, marginTop: 2 }]}>
                  {item.qty} × {formatCurrency(item.unitPrice)}
                  {item.discount > 0 ? ` · −${formatCurrency(item.discount)} disc.` : ''}
                </Text>
              </View>
              <Text style={[designType.amt, { color: theme.colors.text }]}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </Card>

        <Card style={[FLAT_CARD, styles.sum]}>
          <SumRow label="Subtotal" value={formatCurrency(order.subtotal)} />
          {order.discountTotal > 0 ? <SumRow label="Discount" value={`− ${formatCurrency(order.discountTotal)}`} valueColor={theme.colors.danger} /> : null}
          {order.taxAmount > 0 ? <SumRow label="Government tax" value={formatCurrency(order.taxAmount)} /> : null}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.between}>
            <Text style={[styles.grandLabel, { color: theme.colors.text }]}>Grand total</Text>
            <Text style={[styles.grandValue, { color: theme.colors.text }]}>{formatCurrency(order.grandTotal)}</Text>
          </View>
          <SumRow label="Payment" value={payLabel} valueColor={payColor} />
          {order.receivedCash != null ? <SumRow label="Received cash" value={formatCurrency(order.receivedCash)} /> : null}
          {order.cashReturned != null ? <SumRow label="Cash returned" value={formatCurrency(order.cashReturned)} valueColor={theme.colors.success} /> : null}
        </Card>

        {order.notes ? (
          <>
            <Eyebrow>Notes</Eyebrow>
            <Card style={FLAT_CARD}>
              <Text style={[designType.p, { color: theme.colors.text }]}>{order.notes}</Text>
            </Card>
          </>
        ) : null}

        <PrimaryButton label="Reprint Receipt" onPress={handleReprint} />

        <ReportIssueAction referenceId={order.orderNumber} />
      </ScrollView>
    </Screen>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');



function SumRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.between}>
      <Text style={[styles.sumLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.sumValue, { color: valueColor ?? theme.colors.text }]}>{value}</Text>
    </View>
  );
}
