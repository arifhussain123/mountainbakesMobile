import React, { useCallback, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBInput,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { OrderPrintPreview } from '@/screens/production/OrderPrintPreview';
import {
  getProductionOrders,
  markPrinted,
  reviewProductionOrder,
} from '@/services/api/productionApi';
import type {
  BranchProductionOrder,
  BranchProductionOrderStatus,
} from '@/shared/types/production-order.types';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatQty } from '@/utils/money';

/**
 * Production orders — the branch demand queue.
 *
 * Lifecycle (migration 20260810000058 is authoritative; several code comments in
 * the server tree still describe the older behaviour and are wrong):
 *
 *   pending                branch submits
 *   awaiting_verification  Production reviews          — NO stock movement
 *   verified               branch confirms receipt     — STOCK MOVES HERE
 *   approved               Production's final sign-off — status only
 *
 * Reviewing is online-only, deliberately. It is a decision about a server record
 * others are acting on, not a transaction originating here: the demand can be
 * cancelled or corrected while this device is offline, and replaying a stale
 * approval would authorise quantities nobody agreed to.
 */

const FILTERS: ReadonlyArray<{ key: BranchProductionOrderStatus | 'all'; label: string }> = [
  { key: 'pending', label: 'Waiting' },
  { key: 'awaiting_verification', label: 'Sent' },
  { key: 'verified', label: 'Verified' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

export function ProductionOrdersScreen(): React.ReactElement {
  const theme = useTheme();
  const [status, setStatus] = useState<BranchProductionOrderStatus | 'all'>('pending');
  const [reviewing, setReviewing] = useState<BranchProductionOrder | null>(null);
  const [printing, setPrinting] = useState<BranchProductionOrder | null>(null);

  const orders = useQuery({
    queryKey: ['production', 'orders', status],
    queryFn: () => getProductionOrders(status === 'all' ? {} : { status }),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Orders" subtitle="Branch demands" right={<MBSyncStatus />} />

      <View style={{ padding: theme.layout.screenPad }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm }}>
          {FILTERS.map(filter => {
            const selected = filter.key === status;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setStatus(filter.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    { color: selected ? theme.colors.onPrimary : theme.colors.text },
                  ]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {orders.isPending ? (
        <MBSkeletonList rows={6} />
      ) : orders.isError ? (
        <MBErrorState
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : (orders.data ?? []).length === 0 ? (
        <MBEmptyState
          title="Nothing here"
          message="No demands with this status right now."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.sm }}
          refreshControl={
            <RefreshControl
              refreshing={orders.isFetching && !orders.isPending}
              onRefresh={() => orders.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          {(orders.data ?? []).map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onReview={() => setReviewing(order)}
              onPrint={() => setPrinting(order)}
            />
          ))}
        </ScrollView>
      )}

      <Modal
        visible={reviewing !== null}
        animationType="slide"
        onRequestClose={() => setReviewing(null)}>
        {reviewing ? (
          <ReviewSheet
            order={reviewing}
            onClose={() => setReviewing(null)}
            onReviewed={() => {
              setReviewing(null);
              orders.refetch();
            }}
          />
        ) : null}
      </Modal>

      <Modal
        visible={printing !== null}
        animationType="slide"
        onRequestClose={() => setPrinting(null)}>
        {printing ? (
          <OrderPrintPreview order={printing} onClose={() => setPrinting(null)} />
        ) : null}
      </Modal>
    </View>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting',
  awaiting_verification: 'Sent to branch',
  verified: 'Verified by branch',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function OrderCard({
  order,
  onReview,
  onPrint,
}: {
  order: BranchProductionOrder;
  onReview: () => void;
  onPrint: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const statusColor =
    theme.statusColors[order.status as keyof typeof theme.statusColors] ?? theme.colors.textMuted;
  const totalQty = (order.items ?? []).reduce((sum, item) => sum + Number(item.qty ?? 0), 0);

  return (
    <MBCard>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {order.branchName}
          </Text>
          <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>
            {order.demandNumber}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[theme.type.caption, { color: theme.colors.text }]}>
            {STATUS_LABEL[order.status] ?? order.status}
          </Text>
        </View>
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {order.date} · {(order.items ?? []).length} products · {formatQty(totalQty)} units
        {order.requiredDate ? ` · needed ${order.requiredDate}` : ''}
      </Text>

      {order.wasChanged ? (
        <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
          Changed{order.changeReason ? `: ${order.changeReason}` : ''}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {order.status === 'pending' ? (
          <MBButton label="Review" onPress={onReview} size="sm" testID={`review-${order.id}`} />
        ) : null}
        <MBButton label="Print" onPress={onPrint} variant="secondary" size="sm" />
      </View>
    </MBCard>
  );
}

function ReviewSheet({
  order,
  onClose,
  onReviewed,
}: {
  order: BranchProductionOrder;
  onClose: () => void;
  onReviewed: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStore(s => s.isOnline);

  const [approved, setApproved] = useState<Record<string, number>>(() =>
    Object.fromEntries((order.items ?? []).map(item => [item.productId, Number(item.qty ?? 0)])),
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof reviewProductionOrder>[1]) =>
      reviewProductionOrder(order.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      onReviewed();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not submit the review.');
    },
  });

  const submit = useCallback(
    (status: 'awaiting_verification' | 'rejected') => {
      setError(null);
      if (status === 'rejected' && !reason.trim()) {
        setError('Give a reason when rejecting a demand.');
        return;
      }
      mutation.mutate({
        status,
        // Omitted items keep their requested quantity, so only send overrides.
        approvedItems: (order.items ?? []).map(item => ({
          productId: item.productId,
          approvedQty: approved[item.productId] ?? Number(item.qty ?? 0),
        })),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
    },
    [approved, mutation, order.items, reason],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Review demand" subtitle={order.branchName} onBack={onClose} />
      <ScrollView
        contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.lg }}
        keyboardShouldPersistTaps="handled">
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Approving sends this to the branch to verify. Stock moves when the branch
          confirms what actually arrived — not now.
        </Text>

        {(order.items ?? []).map(item => (
          <MBCard key={item.productId}>
            <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {item.productName}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Requested {formatQty(item.qty)}
            </Text>
            <MBInput
              label="Approve quantity"
              numeric
              keyboardType="number-pad"
              defaultValue={String(item.qty ?? 0)}
              onChangeText={text => {
                const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
                setApproved(current => ({
                  ...current,
                  [item.productId]: Number.isFinite(parsed) ? parsed : 0,
                }));
              }}
              editable={!mutation.isPending}
            />
          </MBCard>
        ))}

        <MBInput
          label="Reason"
          hint="Required when rejecting"
          value={reason}
          onChangeText={setReason}
          editable={!mutation.isPending}
          maxLength={500}
        />

        {error ? (
          <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}

        {!isOnline ? (
          <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
            You're offline. Reviewing a demand needs a connection — the demand may have
            changed since you last synced.
          </Text>
        ) : null}

        <MBButton
          label="Approve & send to branch"
          onPress={() => submit('awaiting_verification')}
          loading={mutation.isPending}
          disabled={!isOnline}
          fullWidth
          testID="approve-demand"
        />
        <MBButton
          label="Reject"
          onPress={() => submit('rejected')}
          variant="danger"
          size="md"
          disabled={!isOnline || mutation.isPending}
          testID="reject-demand"
        />
      </ScrollView>
    </View>
  );
}

export { markPrinted };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  cardMain: { flex: 1, gap: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
