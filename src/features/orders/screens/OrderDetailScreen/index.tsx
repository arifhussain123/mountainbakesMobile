import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useProductionOrder, useProductionOrders } from '@/api';
import type { OrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, Icon, InfoBanner, LoadingSkeleton, MiniStat, PillButton, QtyStepper, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { MiniButton, tintFill } from '@/features/stock/components/redesign';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ReportIssueAction } from '@/features/support';
import type { ProductionOrder } from '@/api';
import { DemandTotalModal } from '../../components/DemandTotalModal';
import { effectiveQty, fulfilledTotals, isVerified, liveItems, livePackingItems, requestedTotals } from '../../utils/demandLines';
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
      <InfoBanner kind={order.status === 'rejected' ? 'bad' : 'warn'}>
        {order.status === 'rejected' ? 'Rejected by Production.' : 'Deleted by the branch.'}
      </InfoBanner>
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
              { backgroundColor: step.done ? theme.colors.primary : theme.colors.surface, borderColor: step.done ? theme.colors.primary : theme.colors.border },
            ]}
          />
          <Text style={[styles.stepText, { color: step.done ? theme.colors.text : theme.colors.textFaint }]}>
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
    <Card style={styles.section}>
      <Text style={[styles.h3, { color: theme.colors.text }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((photo) => (
          <Image key={photo.id} source={{ uri: photo.url }} style={[styles.photoThumb, { borderColor: theme.colors.border }]} />
        ))}
      </ScrollView>
    </Card>
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
    <Card style={styles.section}>
      <Text style={[styles.h3, { color: theme.colors.text }]}>Verify Delivery</Text>
      <Text style={[theme.typography.bodySmall, styles.pullUp, { color: theme.colors.textSecondary }]}>
        Count what physically arrived. Correct any quantity that doesn't match.
      </Text>

      {lines.map((item) => (
        <View key={item.productId} style={[styles.verifyRow, { borderTopColor: theme.colors.border }]}>
          <View style={styles.flex1}>
            <Text style={[styles.rowName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text style={[styles.xs, { color: theme.colors.textFaint }]}>Sent {effectiveQty(item)}</Text>
          </View>
          <QtyStepper
            value={parseInt(form.verifiedQtyById[item.productId] ?? '', 10) || 0}
            onChange={(v) => form.setVerifiedQty(item.productId, String(v))}
            accessibilityLabel={`Verified quantity for ${item.productName}`}
          />
        </View>
      ))}

      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
        Delivery photo <Text style={{ color: theme.colors.primary }}>*</Text>
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
          <MiniButton
            label="Camera"
            icon="camera"
            kind="soft"
            size="sm"
            disabled={form.isPickingPhoto}
            onPress={() => void form.capturePhoto('camera')}
            style={styles.flex1}
          />
          <MiniButton
            label="Gallery"
            icon="image"
            size="sm"
            disabled={form.isPickingPhoto}
            onPress={() => void form.capturePhoto('gallery')}
            style={styles.flex1}
          />
        </View>
      )}

      {form.submitError ? <InfoBanner kind="bad">{form.submitError}</InfoBanner> : null}

      <View>
        <PillButton
          label="Submit Verification"
          onPress={() => void handleSubmit()}
          loading={form.isSubmitting}
          disabled={!form.canSubmit}
          testID="verify-delivery-submit"
        />
      </View>
    </Card>
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
  const fulfilled = verified ? fulfilledTotals(order) : null;
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
      <ScrollView contentContainerStyle={[styles.body, { padding: theme.spacing.lg }]}>
        <Card style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={[styles.xs, styles.flex1, { color: theme.colors.textFaint }]}>
              {formatDisplayDate(order.date)} · {order.time}
              {order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}
            </Text>
            <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
          </View>
          <View style={[styles.tint, { backgroundColor: tintFill(theme) }]}>
            <MiniStat label="Products" value={fulfilled ? `${fulfilled.products} / ${requested.products}` : String(requested.products)} />
            <MiniStat label="Qty" value={fulfilled ? `${fulfilled.qty} / ${requested.qty}` : String(requested.qty)} />
            <MiniStat label="Packing" value={String(packing.length)} />
          </View>
          <StatusTimeline order={order} />
        </Card>

        {order.cancelReason ? <InfoBanner kind="warn">{`Reason · ${order.cancelReason}`}</InfoBanner> : null}

        <Card style={styles.section}>
          <Text style={[styles.h3, { color: theme.colors.text }]}>Products · {requested.products}</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.flex1, { color: theme.colors.textFaint }]}>Product</Text>
            <Text style={[styles.th, styles.numCol, { color: theme.colors.textFaint }]}>Demand</Text>
            <Text style={[styles.th, styles.numCol, { color: theme.colors.textFaint }]}>Verified</Text>
          </View>
          <View>
            {liveItems(order.items).map((item) => {
              const demandQty = item.qty;
              const countedQty = effectiveQty(item);
              const differs = verified && countedQty !== demandQty;
              return (
                <View key={item.productId} style={[styles.itemRow, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.rowName, styles.flex1, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.productName}
                    {item.isSpecial ? ' (Special)' : ''}
                    {item.addedByProduction ? ' · Added by Production' : ''}
                  </Text>
                  <Text style={[styles.num, styles.numCol, { color: theme.colors.textSecondary }]}>{demandQty}</Text>
                  <Text
                    style={[
                      styles.num,
                      styles.numCol,
                      styles.bold,
                      {
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
          </View>
        </Card>

        {packing.length > 0 ? (
          <Card style={styles.section}>
            <Text style={[styles.h3, { color: theme.colors.text }]}>Packing materials · {packing.length}</Text>
            <View>
              {packing.map((item) => (
                <View key={item.packingMaterialId} style={[styles.itemRow, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.rowName, styles.flex1, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.materialName}
                  </Text>
                  <Text style={[styles.num, styles.numCol, styles.bold, { color: theme.colors.text }]}>{effectiveQty(item)}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <PhotoRow title="Demand photo" photos={order.demandPhotos} />
        <PhotoRow title="Verification photo" photos={order.verificationPhotos} />

        {order.status === 'awaiting_verification' ? <VerifyDeliverySection order={order} /> : null}

        <View>
          <ReportIssueAction referenceId={order.demandNumber} />
        </View>
      </ScrollView>

      {showTotal ? <DemandTotalModal order={order} onClose={() => setShowTotal(false)} /> : null}
    </Screen>
  );
}
