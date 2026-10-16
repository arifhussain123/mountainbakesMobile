import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useProductionOrder, useProductionOrders } from '@/api';
import type { OrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, ErrorState, Icon, LoadingSkeleton, PillButton, QtyStepper, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ReportIssueAction } from '@/features/support';
import type { ProductionOrder } from '@/api';
import { DemandTotalModal } from '../../components/DemandTotalModal';
import { effectiveQty, isVerified, liveItems, livePackingItems, requestedTotals } from '../../utils/demandLines';
import { useVerifyDeliveryForm } from '../../hooks/useVerifyDeliveryForm';
import { styles } from './styles';

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  pending: 'Pending',
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified — Awaiting Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Deleted',
};

const STATUS_VARIANT: Record<ProductionOrder['status'], StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'violet',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** Submitted → Reviewed → Verified → Approved — the demand's own path, with the branch's terminal outcomes (Rejected/Deleted) breaking out of the line instead of appearing as a future step. */
function StatusTimeline({ order }: { order: ProductionOrder }) {
  const theme = useAppTheme();

  if (order.status === 'rejected' || order.status === 'cancelled') {
    return (
      <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.sm }]}>
        {order.status === 'rejected' ? 'Rejected by Production.' : 'Deleted by the branch.'}
      </Text>
    );
  }

  const steps = [
    { label: 'Submitted', done: true },
    { label: 'Reviewed by Production', done: order.status !== 'pending' },
    { label: 'Verified by branch', done: isVerified(order) },
    { label: 'Approved', done: order.status === 'approved' },
  ];

  return (
    <View style={styles.timeline}>
      {steps.map((step, i) => (
        <View key={step.label} style={styles.timelineStep}>
          <View
            style={[
              styles.timelineDot,
              { backgroundColor: step.done ? theme.colors.primary : theme.colors.border, borderColor: theme.colors.primary },
            ]}
          />
          <Text style={[theme.typography.label, { color: step.done ? theme.colors.text : theme.colors.textFaint, marginLeft: 8 }]}>
            {step.label}
          </Text>
          {i < steps.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: theme.colors.border }]} /> : null}
        </View>
      ))}
    </View>
  );
}

function PhotoRow({ title, photos }: { title: string; photos?: { id: string; url: string }[] }) {
  const theme = useAppTheme();
  if (!photos || photos.length === 0) return null;
  return (
    <View style={{ marginTop: theme.spacing.lg }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{title.toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing.sm }}>
        {photos.map((photo) => (
          <Image key={photo.id} source={{ uri: photo.url }} style={[styles.photoThumb, { borderColor: theme.colors.border }]} />
        ))}
      </ScrollView>
    </View>
  );
}

function VerifyDeliverySection({ order }: { order: ProductionOrder }) {
  const theme = useAppTheme();
  const form = useVerifyDeliveryForm(order);
  const lines = liveItems(order.items);

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) Alert.alert('Verified', 'Thanks — Production has been notified and your branch stock has been updated.');
  };

  return (
    <View style={[styles.verifySection, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Verify Delivery</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        Count what physically arrived. Correct any quantity that doesn't match.
      </Text>

      {lines.map((item) => (
        <View key={item.productId} style={styles.verifyRow}>
          <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginRight: 8 }]}>Sent {effectiveQty(item)}</Text>
          <QtyStepper
            value={parseInt(form.verifiedQtyById[item.productId] ?? '', 10) || 0}
            onChange={(v) => form.setVerifiedQty(item.productId, String(v))}
            accessibilityLabel={`Verified quantity for ${item.productName}`}
          />
        </View>
      ))}

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
        DELIVERY PHOTO <Text style={{ color: theme.colors.danger }}>*</Text>
      </Text>
      {form.photo ? (
        <View style={styles.photoPreviewRow}>
          <Image source={{ uri: form.photo.url }} style={[styles.photoThumb, { borderColor: theme.colors.border }]} />
          <Pressable accessibilityRole="button" onPress={form.removePhoto}>
            <Icon name="trash" size={16} color={theme.colors.danger} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoButtonsRow}>
          <Pressable
            accessibilityRole="button"
            disabled={form.isPickingPhoto}
            onPress={() => void form.capturePhoto('camera')}
            style={[styles.photoButton, { borderColor: theme.colors.border }]}>
            <Icon name="camera" size={16} color={theme.colors.text} />
            <Text style={[theme.typography.label, { color: theme.colors.text, marginLeft: 6 }]}>Camera</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={form.isPickingPhoto}
            onPress={() => void form.capturePhoto('gallery')}
            style={[styles.photoButton, { borderColor: theme.colors.border }]}>
            <Icon name="image" size={16} color={theme.colors.text} />
            <Text style={[theme.typography.label, { color: theme.colors.text, marginLeft: 6 }]}>Gallery</Text>
          </Pressable>
        </View>
      )}

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.sm }]}>{form.submitError}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PillButton
          label="Submit Verification"
          onPress={() => void handleSubmit()}
          loading={form.isSubmitting}
          disabled={!form.canSubmit}
          testID="verify-delivery-submit"
        />
      </View>
    </View>
  );
}

export function OrderDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<OrdersStackParamList, 'OrderDetail'>>();
  const { orderId } = route.params;

  // The list query is already in cache for anyone who opened this from "View" —
  // reading it first avoids a second network round trip. The dedicated fetch
  // below only matters for a cold open (e.g. a deep link) where the list was
  // never loaded.
  const listQuery = useProductionOrders();
  const cached = useMemo(() => listQuery.data?.orders.find((o) => o.id === orderId), [listQuery.data, orderId]);
  const detailQuery = useProductionOrder(cached ? undefined : orderId);
  const order = cached ?? detailQuery.data?.order;

  const [showTotal, setShowTotal] = useState(false);

  if (!order) {
    return (
      <Screen>
        <AppHeader title="Demand" actions={[{ icon: 'close', onPress: () => navigation.goBack(), accessibilityLabel: 'Close' }]} />
        {detailQuery.isLoading || listQuery.isLoading ? (
          <LoadingSkeleton height={200} />
        ) : (
          <ErrorState
            message={detailQuery.error ? mapErrorToMessage(detailQuery.error) : 'This demand could not be found.'}
            onRetry={() => void detailQuery.refetch()}
          />
        )}
      </Screen>
    );
  }

  const requested = requestedTotals(order);
  const verified = isVerified(order);
  const packing = livePackingItems(order.packingItems);

  return (
    <Screen>
      <AppHeader
        title={order.demandNumber}
        subtitle={order.branchName}
        actions={[
          { icon: 'box', onPress: () => setShowTotal(true), accessibilityLabel: 'Show demand total' },
          { icon: 'close', onPress: () => navigation.goBack(), accessibilityLabel: 'Close' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={styles.headerRow}>
          <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          {formatDisplayDate(order.date)} · {order.time}
          {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
        </Text>

        <StatusTimeline order={order} />

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
          PRODUCTS · {requested.products}
        </Text>
        {liveItems(order.items).map((item) => {
          const demandQty = item.qty;
          const countedQty = effectiveQty(item);
          const differs = verified && countedQty !== demandQty;
          return (
            <View key={item.productId} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                {item.productName}
                {item.isSpecial ? ' (Special)' : ''}
                {item.addedByProduction ? ' · Added by Production' : ''}
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, width: 50, textAlign: 'right' }]}>
                {demandQty}
              </Text>
              <Text
                style={[
                  theme.typography.bodySmall,
                  {
                    width: 50,
                    textAlign: 'right',
                    fontWeight: '700',
                    color: !verified
                      ? theme.colors.textFaint
                      : differs && countedQty < demandQty
                        ? theme.colors.warning
                        : differs
                          ? theme.colors.success
                          : theme.colors.text,
                  },
                ]}>
                {verified ? countedQty : '—'}
              </Text>
            </View>
          );
        })}

        {packing.length > 0 ? (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
              PACKING MATERIALS · {packing.length}
            </Text>
            {packing.map((item) => (
              <View key={item.packingMaterialId} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                  {item.materialName}
                </Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, width: 50, textAlign: 'right' }]}>
                  {effectiveQty(item)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {order.cancelReason ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>REASON</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{order.cancelReason}</Text>
          </View>
        ) : null}

        <PhotoRow title="Demand photo" photos={order.demandPhotos} />
        <PhotoRow title="Verification photo" photos={order.verificationPhotos} />

        {order.status === 'awaiting_verification' ? (
          <View style={{ marginTop: theme.spacing.xl }}>
            <VerifyDeliverySection order={order} />
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.lg }}>
          <ReportIssueAction referenceId={order.demandNumber} />
        </View>
      </ScrollView>

      {showTotal ? <DemandTotalModal order={order} onClose={() => setShowTotal(false)} /> : null}
    </Screen>
  );
}
