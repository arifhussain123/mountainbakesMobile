import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  useFinalApproveProductionOrder,
  usePreviousOrderBalance,
  useProductionOrders,
  useReviewProductionOrder,
} from '@/api';
import type { ProductionOrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, Icon, PrimaryButton, Screen, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ProductionOrder } from '@/api';
import { styles } from './styles';
import { useHideTabBarOnFocus } from '@/navigation/tabBar/useTabBarVisibility';

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  pending: 'Pending',
  awaiting_verification: 'Sent — Awaiting Verify',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/**
 * Share-based "printing" (screen 03's POP Print / A4 Challan buttons).
 *
 * There is no native thermal-printer SDK anywhere in this app's dependencies
 * (confirmed — adding Bluetooth/USB printer integration is real native-module
 * work, out of scope here; see the `pop-printer-setup` memory for why). Both
 * buttons instead hand a plain-text rendition of the order to React Native's
 * built-in `Share` sheet, so the user can route it to any app that accepts a
 * share — including, on most Android devices, a system "Print" service. This
 * is NOT the till's POP printer; it is the closest honest equivalent without
 * a new native dependency.
 */
function buildPopPrintText(order: ProductionOrder): string {
  const lines = order.items.map(
    (i) => `${i.productName}${i.isSpecial ? ' (Special)' : ''} x${i.qty}  ${formatCurrency((i.unitPrice ?? 0) * i.qty)}`,
  );
  const total = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  return [
    'Mountain Bakes — Production Department',
    `Demand ${order.demandNumber}`,
    order.branchName,
    `Raised ${formatDisplayDate(order.date)}${order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}`,
    '',
    ...lines,
    '',
    `Total  ${formatCurrency(total)}`,
  ].join('\n');
}

function buildA4ChallanText(order: ProductionOrder, balance: ReturnType<typeof usePreviousOrderBalance>['data']): string {
  const itemLines = order.items.map(
    (i) => `${i.productName}  Demand ${i.qty}  Appr. ${i.approvedQty ?? i.qty}  ${formatCurrency((i.unitPrice ?? 0) * i.qty)}`,
  );
  const total = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const copy = (label: string) =>
    [
      `--- ${label} ---`,
      'Mountain Bakes — Production Department',
      `Demand ${order.demandNumber}  ·  ${order.branchName}`,
      `Raised ${formatDisplayDate(order.date)}${order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}`,
      '',
      ...itemLines,
      `Totals  ${formatCurrency(total)}`,
      ...(label === 'Company Copy' && balance?.previous
        ? [
            '',
            `Previous order ${balance.previous.demandNumber} (${formatDisplayDate(balance.previous.date)})`,
            `Amount to collect  ${formatCurrency(balance.amountToCollect)}`,
            `Payments received  ${formatCurrency(balance.paymentsReceivedValue)}`,
            `Remaining balance  ${formatCurrency(balance.remainingBalance)}`,
          ]
        : []),
    ].join('\n');
  return [copy('Customer Copy'), '\n'.repeat(1) + '— — — — — — cut here — — — — — —\n', copy('Company Copy')].join('\n');
}

/** mountainbakesProduction.html screen 03 — Order Detail: review one branch demand. */
export function ProductionOrderDetailScreen() {
  const theme = useAppTheme();
  useHideTabBarOnFocus();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProductionOrdersStackParamList, 'ProductionOrderDetail'>>();
  const { orderId } = route.params;

  const { data } = useProductionOrders();
  const order = useMemo(() => data?.orders.find((o) => o.id === orderId), [data, orderId]);

  const review = useReviewProductionOrder();
  const finalApprove = useFinalApproveProductionOrder();
  const { data: previousBalance } = usePreviousOrderBalance(order?.id);

  if (!order) {
    return (
      <Screen>
        <AppHeader title="Order Detail" />
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, padding: theme.spacing.lg }]}>
          This demand is no longer in the list — pull to refresh the Production Orders screen and reopen it.
        </Text>
      </Screen>
    );
  }

  const handleSend = () => {
    review.mutate(
      { id: order.id, input: { status: 'awaiting_verification', approvedItems: order.items.filter((i) => i.productId).map((i) => ({ productId: i.productId!, approvedQty: i.qty })) } },
      {
        onSuccess: () => navigation.goBack(),
        onError: (e) => Alert.alert('Could Not Send', mapErrorToMessage(e)),
      },
    );
  };

  const handleReject = () => {
    Alert.alert('Reject Demand', `Reject ${order.demandNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          review.mutate(
            { id: order.id, input: { status: 'rejected' } },
            { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  const handleFinalApprove = () => {
    finalApprove.mutate(order.id, {
      onSuccess: () => navigation.goBack(),
      onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)),
    });
  };

  const handlePopPrint = () => {
    void Share.share({ message: buildPopPrintText(order), title: `${order.demandNumber} — POP Print` });
  };

  const handleA4Challan = () => {
    void Share.share({ message: buildA4ChallanText(order, previousBalance), title: `${order.demandNumber} — A4 Challan` });
  };

  const itemsTotal = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const demandTotal = order.items.reduce((sum, i) => sum + i.qty, 0);
  const approvedTotal = order.items.reduce((sum, i) => sum + (i.approvedQty ?? i.qty), 0);

  return (
    <Screen>
      <AppHeader title={order.demandNumber} subtitle={order.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant="info" />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          Raised {formatDisplayDate(order.date)}
          {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
        </Text>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PRODUCTS</Text>
        {order.items.map((item) => (
          <View key={item.productId ?? item.productName} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
              {item.productName}
              {item.isSpecial ? ' (Special)' : ''}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, width: 40, textAlign: 'right' }]}>{item.qty}</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, width: 40, textAlign: 'right' }]}>
              {item.approvedQty ?? item.qty}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', width: 70, textAlign: 'right' }]}>
              {formatCurrency((item.unitPrice ?? 0) * item.qty)}
            </Text>
          </View>
        ))}
        <View style={styles.itemRow}>
          <Text style={[theme.typography.label, { color: theme.colors.primary, flex: 1 }]}>Totals</Text>
          <Text style={[theme.typography.label, { color: theme.colors.primary, width: 40, textAlign: 'right' }]}>{demandTotal}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.primary, width: 40, textAlign: 'right' }]}>{approvedTotal}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.primary, width: 70, textAlign: 'right' }]}>
            {formatCurrency(itemsTotal)}
          </Text>
        </View>

        {order.packingItems && order.packingItems.length > 0 ? (
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PACKING MATERIALS</Text>
            {order.packingItems.map((item) => (
              <View key={item.packingMaterialId} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                  {item.materialName}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.qty}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
          PREVIOUS ORDER BALANCE
        </Text>
        <Card style={{ marginTop: theme.spacing.sm }}>
          {previousBalance?.previous ? (
            <View style={styles.balanceGrid}>
              {[
                { k: 'PREVIOUS ORDER', v: previousBalance.previous.demandNumber },
                { k: 'DATE', v: formatDisplayDate(previousBalance.previous.date) },
                { k: 'ORDERED', v: formatCurrency(previousBalance.orderedValue) },
                { k: 'DELIVERED', v: formatCurrency(previousBalance.deliveredValue) },
                { k: `COMPANY SHARE (${previousBalance.companySharePct}%)`, v: formatCurrency(previousBalance.companyShareValue) },
                { k: 'LESS RETURNS', v: formatCurrency(previousBalance.returnsValue) },
                { k: 'LESS DISCOUNTS', v: formatCurrency(previousBalance.discountsValue) },
                { k: 'AMOUNT TO COLLECT', v: formatCurrency(previousBalance.amountToCollect) },
                { k: 'PAYMENTS RECEIVED', v: formatCurrency(previousBalance.paymentsReceivedValue) },
                {
                  k: 'REMAINING BALANCE',
                  v: formatCurrency(previousBalance.remainingBalance),
                  color: previousBalance.remainingBalance > 0 ? theme.colors.danger : theme.colors.success,
                },
              ].map((m) => (
                <View key={m.k} style={styles.balanceCell}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {m.k}
                  </Text>
                  <Text style={[theme.typography.body, { color: m.color ?? theme.colors.text, fontWeight: '700', marginTop: 2 }]}>
                    {m.v}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              No previous delivery to this branch yet — nothing is owed.
            </Text>
          )}
        </Card>

        <Card style={{ marginTop: theme.spacing.md }}>
          <View style={styles.returnedHeaderRow}>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Returned (since last order)</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Qty · Value</Text>
          </View>
          {previousBalance && previousBalance.returnItems.length > 0 ? (
            previousBalance.returnItems.map((r, idx) => (
              <View key={`${r.productName}-${idx}`} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                  {r.productName}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
                  {r.qty} · {formatCurrency(r.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              No returns since the last order.
            </Text>
          )}
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
            POP Print sends the receipt to this device's share sheet (route it to any app that can print). A4 Challan
            shares one page — Customer Copy on top, Company Copy below the cut line.
          </Text>
        </Card>

        <View style={styles.printRow}>
          <Pressable
            onPress={handlePopPrint}
            style={[styles.printButton, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="button">
            <Icon name="printer" size={14} color={theme.colors.text} />
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>POP Print</Text>
          </Pressable>
          <Pressable
            onPress={handleA4Challan}
            style={[styles.printButton, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="button">
            <Icon name="file-spreadsheet" size={14} color={theme.colors.text} />
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>A4 Challan</Text>
          </Pressable>
        </View>

        {order.status === 'pending' ? (
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Reject" onPress={handleReject} loading={review.isPending} />
            </View>
            <View style={{ flex: 1.4 }}>
              <PrimaryButton label="Send to Branch" onPress={handleSend} loading={review.isPending} />
            </View>
          </View>
        ) : null}

        {order.status === 'verified' ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <PrimaryButton label="Final Approve" onPress={handleFinalApprove} loading={finalApprove.isPending} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
