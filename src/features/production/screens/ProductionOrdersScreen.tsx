import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  MBAccountButton,
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBInput,
  MBPressable,
  MBSkeletonList,
  MBSyncStatus,
  MBModal,
  MBOrderCard,
} from '@/common/ui';
import { OrderPrintPreview } from './OrderPrintPreview';
import {
  getProductionOrders,
  markPrinted,
  reviewProductionOrder,
} from '@/api/services/productionService';
import type {
  BranchProductionOrder,
  BranchProductionOrderStatus,
} from '@/shared/types/production-order.types';
import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { formatQty } from '@/common/utils/money';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { contentColumn, layout, space } from '@/common/theme/spacing';
import { radius } from '@/common/theme/radius';
import { qk } from '@/api/queryKeys';

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

const FILTERS: ReadonlyArray<{
  key: BranchProductionOrderStatus | 'all';
  label: string;
}> = [
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

  /**
   * One handler for the whole queue, not one per card.
   *
   * `setReviewing` and `setPrinting` are already stable, so `renderOrder`
   * depends on nothing that changes and `MBOrderCard`'s `memo` can finally do
   * its job: a status-chip tap re-renders the chips, not thirty demands.
   */
  const renderOrder = useCallback(
    ({ item }: { item: BranchProductionOrder }) => (
      <MBOrderCard order={item} onReview={setReviewing} onPrint={setPrinting} />
    ),
    [],
  );

  const orders = useQuery({
    // `qk.productionOrders`, not `['production', ...]`: this is the same
    // `GET /api/production-orders` a branch's Demands list and the admin
    // dashboard's pending count read, and one resource gets one key.
    queryKey: qk.productionOrders.list({ status: status === 'all' ? undefined : status }),
    queryFn: () => getProductionOrders(status === 'all' ? {} : { status }),
    /**
     * The previous answer stays on screen while the new one loads.
     *
     * Without it, changing the filter unmounts the whole result and puts a
     * skeleton in its place — the screen empties, the layout collapses, and it
     * refills a moment later. The user did not ask for a new screen, they asked
     * the same screen a different question, so the old answer is the honest
     * thing to show until the new one arrives.
     */
    placeholderData: previous => previous,
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Orders"
        subtitle="Branch demands"
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(orders.dataUpdatedAt)}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm }}>
          {FILTERS.map(filter => {
            const selected = filter.key === status;
            return (
              <MBPressable
                key={filter.key}
                onPress={() => setStatus(filter.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.sm, // a chip is chosen, not read — v4 keeps the pill for status
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    {
                      color: selected ? theme.colors.onPrimary : theme.colors.text,
                    },
                  ]}>
                  {filter.label}
                </Text>
              </MBPressable>
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
          illustration="empty-orders"
        />
      ) : (
        /*
         * The production queue, virtualised.
         *
         * This was a mapped `ScrollView`: every demand from every branch mounted
         * before the first one was on screen, and the counter's busiest morning
         * is exactly when the list is longest. `MBOrderCard` is already
         * `React.memo`, but it could never bail out — `onReview` and `onPrint`
         * were rebuilt for every card on every render, so a single filter tap
         * or refetch re-rendered the whole queue.
         */
        <FlashList
          data={orders.data ?? []}
          renderItem={renderOrder}
          keyExtractor={keyOfOrder}
          contentContainerStyle={{ ...contentColumn, padding: theme.layout.screenPad }}
          ItemSeparatorComponent={CardSeparator}
          refreshControl={
            <RefreshControl
              refreshing={orders.isFetching && !orders.isPending}
              onRefresh={() => orders.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      <MBModal visible={reviewing !== null} onRequestClose={() => setReviewing(null)}>
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
      </MBModal>

      <MBModal visible={printing !== null} onRequestClose={() => setPrinting(null)}>
        {printing ? <OrderPrintPreview order={printing} onClose={() => setPrinting(null)} /> : null}
      </MBModal>
    </View>
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
      // Both namespaces. Reviewing a demand changes the demand list
      // (`productionOrders`) AND the counter's own overview and queue stats
      // (`production`) — they are different resources and a single prefix
      // cannot reach both.
      queryClient.invalidateQueries({ queryKey: qk.productionOrders.all() });
      queryClient.invalidateQueries({ queryKey: qk.production.all() });
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
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Approving sends this to the branch to verify. Stock moves when the branch confirms what
          actually arrived — not now.
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
            You're offline. Reviewing a demand needs a connection — the demand may have changed
            since you last synced.
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

/** Module scope: a separator defined during render remounts the list each pass. */
function CardSeparator(): React.ReactElement {
  return <View style={styles.cardGap} />;
}

const keyOfOrder = (order: BranchProductionOrder): string => order.id;

const styles = StyleSheet.create({
  cardGap: { height: 8 },
  flex: { flex: 1 },
  chip: {
    height: layout.chipH,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTop: { flexDirection: 'row', gap: space.md, marginBottom: space.tight },
  cardMain: { flex: 1, gap: space.hair },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  dot: { width: layout.dotSize, height: layout.dotSize, borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
});
