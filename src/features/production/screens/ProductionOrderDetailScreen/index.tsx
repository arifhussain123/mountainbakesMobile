import { useMemo } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useFinalApproveProductionOrder, useProductionOrders, useReviewProductionOrder } from '@/api';
import type { ProductionOrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PrimaryButton, Screen, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ProductionOrder } from '@/api';
import { styles } from './styles';

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  pending: 'Pending',
  awaiting_verification: 'Sent — Awaiting Verify',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/** mountainbakesProduction.html screen 03 — Order Detail: review one branch demand. */
export function ProductionOrderDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProductionOrdersStackParamList, 'ProductionOrderDetail'>>();
  const { orderId } = route.params;

  const { data } = useProductionOrders();
  const order = useMemo(() => data?.orders.find((o) => o.id === orderId), [data, orderId]);

  const review = useReviewProductionOrder();
  const finalApprove = useFinalApproveProductionOrder();

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
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.qty}</Text>
          </View>
        ))}

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
