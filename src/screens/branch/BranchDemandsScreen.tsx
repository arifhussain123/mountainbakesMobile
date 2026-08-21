import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBAccountButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBInput,
  MBPressable,
  MBSkeletonList,
  MBSyncStatus,
  MBConfirmDialog,
} from '@/components';
import { cancelProductionOrder, getProductionOrders } from '@/services/api/productionApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type {
  BranchProductionOrder,
  BranchProductionOrderStatus,
} from '@/shared/types/production-order.types';
import { useTheme } from '@/theme/ThemeProvider';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { formatQty } from '@/utils/money';

/**
 * The branch's own demands on central production, and where each one has got to.
 *
 * ---------------------------------------------------------------------------
 * This is one side of the existing workflow, not a second workflow
 * ---------------------------------------------------------------------------
 * The production counter already has `ProductionOrdersScreen` for reviewing and
 * printing. This is the *other actor's* view of the same orders: the branch
 * raised them and, until now, could not see what happened next. The branch half
 * of the Orders tab was a placeholder with a create button.
 *
 * ---------------------------------------------------------------------------
 * The statuses are the backend's, not a friendlier invention
 * ---------------------------------------------------------------------------
 * Six values, and the labels below are only labels — the value is what the
 * server stores and what every filter sends:
 *
 *   pending                branch submitted, Production has not reviewed
 *   awaiting_verification  Production sent it out — NO stock has moved yet
 *   verified               branch counted what arrived — STOCK MOVED HERE
 *   approved               Production's final sign-off
 *   rejected               Production refused it
 *   cancelled              the branch withdrew it before review
 *
 * `rejected` and `cancelled` are both terminal and are kept apart deliberately:
 * only one of them is a fulfilment failure.
 *
 * The list covers the **last seven business days** because that is what the
 * endpoint returns — an indexed cutoff, not a client filter.
 */

/**
 * Display only — the KEY is what the API speaks, the value is what a person
 * reads. Exported so `branchDemandStatuses.test.ts` can pin the set against the
 * backend's own enum rather than against a friendlier one somebody proposed.
 */
export const BRANCH_PRODUCTION_ORDER_STATUSES: Record<BranchProductionOrderStatus, string> = {
  pending: 'Waiting for production',
  awaiting_verification: 'Sent — count it in',
  verified: 'Counted in',
  approved: 'Approved',
  rejected: 'Refused',
  cancelled: 'Withdrawn',
};

const FILTERS: ReadonlyArray<{ key: string; label: string; status?: BranchProductionOrderStatus }> =
  [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Waiting', status: 'pending' },
    { key: 'awaiting_verification', label: 'To count in', status: 'awaiting_verification' },
    { key: 'verified', label: 'Counted in', status: 'verified' },
    { key: 'approved', label: 'Approved', status: 'approved' },
  ];

export function BranchDemandsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');
  const status = FILTERS.find(f => f.key === filter)?.status;

  const orders = useQuery({
    // The server scopes to the caller's own branch, so no branchId is sent.
    queryKey: qk.productionOrders.list({ status }),
    queryFn: () => getProductionOrders(status ? { status } : {}),
    staleTime: LIVE_STALE_TIME_MS,
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

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelProductionOrder(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.productionOrders.all() }),
  });

  /**
   * Withdrawing needs a typed reason, so it is a small modal rather than an
   * alert: `Alert.prompt` is **iOS-only** and this app runs on Android, where it
   * would silently do nothing. The server requires at least three characters —
   * Production plans against these demands, so one that disappears without a
   * reason is worse than one that stays visible as withdrawn.
   */
  const [withdrawing, setWithdrawing] = useState<BranchProductionOrder | null>(null);
  const [reason, setReason] = useState('');

  const onConfirmWithdraw = useCallback(() => {
    if (!withdrawing || reason.trim().length < 3) return;
    cancel.mutate(
      { id: withdrawing.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setWithdrawing(null);
          setReason('');
        },
        onError: () => Alert.alert('Not withdrawn', 'The demand was not withdrawn. Try again.'),
      },
    );
  }, [cancel, reason, withdrawing]);

  const rows = orders.data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: BranchProductionOrder }) => (
      <DemandCard order={item} onWithdraw={setWithdrawing} />
    ),
    [],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Orders"
        subtitle="Demands on production"
        dataAsOf={dataAsOfFrom(orders.dataUpdatedAt)}
        right={<MBSyncStatus />}
      />

      <View style={{ paddingHorizontal: theme.layout.screenPad, paddingTop: theme.space.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm }}>
          {FILTERS.map(option => {
            const selected = option.key === filter;
            return (
              <MBPressable
                key={option.key}
                onPress={() => setFilter(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`demand-filter-${option.key}`}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.sm, // a chip is chosen, not read — v4 keeps the pill for status
                    paddingHorizontal: theme.space.lg,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    { color: selected ? theme.colors.onPrimary : theme.colors.text },
                  ]}>
                  {option.label}
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
      ) : rows.length === 0 ? (
        <MBEmptyState
          title="No demands"
          message="Demands raised in the last seven business days appear here."
          icon="orders"
          /* The empty state is the one place a call to action still lives now
             that the corner FAB is gone: with nothing in the list there is
             nothing for the centre button to compete with, and a bare "No
             demands" leaves a new shift with no visible way forward. */
          actionLabel="New order"
          onAction={() => navigation.navigate('CreateOrder')}
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={orders.isFetching && !orders.isPending}
              onRefresh={() => orders.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/* No corner FAB. New Order is the branch bar's **centre action** now —
          the ember circle sitting proud of the floating pill — and a screen
          with a FAB *and* a second control for the same thing has two things
          competing to be its one obvious action. The empty state below still
          carries its own call to action, which is on screen only while the list
          is empty. See `CENTRE_ACTIONS` in `navigation/roleConfig.ts`. */}

      <MBConfirmDialog
        visible={withdrawing !== null}
        title={`Withdraw ${withdrawing?.demandNumber}?`}
        message="Production is planning against this demand. Say why, so they can see what changed."
        confirmLabel="Withdraw"
        cancelLabel="Keep it"
        onCancel={() => {
          setWithdrawing(null);
          setReason('');
        }}
        onConfirm={onConfirmWithdraw}
        confirmDisabled={reason.trim().length < 3}
        loading={cancel.isPending}
        testID="withdraw">
        <MBInput
          label="Reason"
          value={reason}
          onChangeText={setReason}
          multiline
          autoFocus
          error={
            reason.length > 0 && reason.trim().length < 3
              ? 'Please give a reason for deleting this demand'
              : undefined
          }
          testID="withdraw-reason"
        />
      </MBConfirmDialog>
    </View>
  );
}

/**
 * Memoised. `onWithdraw` is the raw state setter rather than a per-row closure,
 * so a re-render of the list — a status chip, a refetch — re-renders no rows
 * whose demand has not changed. Theme changes still reach it: context bypasses
 * `memo`.
 */
const DemandCard = React.memo(function DemandCardView({
  order,
  onWithdraw,
}: {
  order: BranchProductionOrder;
  onWithdraw: (order: BranchProductionOrder) => void;
}): React.ReactElement {
  const theme = useTheme();
  // Only a demand Production has not touched can be withdrawn. Once it is out
  // for delivery, units are in motion and the way back is a return.
  const canWithdraw = order.status === 'pending';
  const withdraw = useCallback(() => onWithdraw(order), [onWithdraw, order]);

  const tone: Record<BranchProductionOrderStatus, string> = {
    pending: theme.colors.warning,
    awaiting_verification: theme.colors.accent,
    verified: theme.colors.success,
    approved: theme.colors.success,
    rejected: theme.colors.danger,
    cancelled: theme.colors.textMuted,
  };

  const items = order.items ?? [];

  return (
    <MBCard accessibilityLabel={`${order.demandNumber}, ${BRANCH_PRODUCTION_ORDER_STATUSES[order.status]}`}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {order.demandNumber}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {order.date} · {order.time}
            {/* Absent on demands raised before migration 81 — shown as a dash
                rather than falling back to the raise date, which would display a
                delivery commitment nobody made. */}
            {' · needed '}
            {order.requiredDate ?? '—'}
          </Text>
        </View>
        {/* A word, not a colour alone. */}
        <Text style={[theme.type.label, { color: tone[order.status] }]}>
          {BRANCH_PRODUCTION_ORDER_STATUSES[order.status]}
        </Text>
      </View>

      <View style={[styles.items, { borderTopColor: theme.colors.border }]}>
        {items.map(item => {
          // `approvedQty` is what Production actually sent, and it defaults to
          // the demand. Only show both when they differ — a changed line is the
          // thing worth noticing on this screen.
          const changed = item.approvedQty !== undefined && item.approvedQty !== item.qty;
          return (
            <View key={item.productId} style={styles.itemRow}>
              <Text
                numberOfLines={1}
                style={[theme.type.body, styles.flex, { color: theme.colors.text }]}>
                {item.productName}
              </Text>
              <Text style={[theme.type.number, { color: theme.colors.text }]}>
                {changed
                  ? `${formatQty(item.qty)} → ${formatQty(item.approvedQty ?? 0)}`
                  : formatQty(item.qty)}
              </Text>
            </View>
          );
        })}
      </View>

      {order.wasChanged && order.changeReason ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Production changed this: {order.changeReason}
        </Text>
      ) : null}

      {order.status === 'cancelled' && order.cancelReason ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Withdrawn: {order.cancelReason}
        </Text>
      ) : null}

      {order.status === 'awaiting_verification' ? (
        // The next step is the branch's, and this app cannot take it yet — see
        // docs/screen-patterns.md. Saying so beats a button that 400s.
        <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
          Count this in on the web app to receive the stock.
        </Text>
      ) : null}

      {canWithdraw ? (
        <MBPressable
          onPress={withdraw}
          accessibilityRole="button"
          accessibilityLabel={`Withdraw ${order.demandNumber}`}
          style={styles.cancel}>
          <Text style={[theme.type.label, { color: theme.colors.danger }]}>Withdraw demand</Text>
        </MBPressable>
      ) : null}
    </MBCard>
  );
});

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 16 },
  separator: { height: 8 },
  chip: { height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowMain: { flex: 1, gap: 2 },
  items: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancel: { paddingTop: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});
