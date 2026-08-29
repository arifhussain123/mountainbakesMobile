import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBAccountButton,
  MBCard,
  MBEmptyState,
  MBFab,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBInput,
  MBPressable,
  MBSkeletonList,
  MBStatusTag,
  MBSyncStatus,
  MBConfirmDialog,
  type FilterChip,
} from '@/common/ui';
import { cancelProductionOrder, getProductionOrders } from '@/api/services/productionService';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import type {
  BranchProductionOrder,
  BranchProductionOrderStatus,
} from '@/shared/types/production-order.types';
import { useTheme } from '@/common/theme/ThemeProvider';
import { businessDateLabel, formatBusinessDate } from '@/common/helpers/businessDay';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { formatQty } from '@/common/utils/money';

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
 *
 * ---------------------------------------------------------------------------
 * v6's screen 05: the chips filter what is already here
 * ---------------------------------------------------------------------------
 * The screen used to send `status` to the server and hold one cache entry per
 * filter, which meant every chip tap was a round trip and the counts v6 draws on
 * the chips could not be honest — a count beside a filter that refetches is
 * either the previous answer's figure or a second request that goes stale the
 * moment the list does.
 *
 * So it fetches the window **once** and narrows in memory. The endpoint's own
 * bound is seven business days rather than a page size, so "everything" is a
 * known, small set and this is not an unbounded list being pulled to the device
 * to be filtered. What it buys, beyond the counts: an instant chip, one cache
 * entry to invalidate, and no `placeholderData` dance holding the previous
 * answer on screen while the next one loads — there is no next one.
 *
 * `api.getProductionOrders` still takes `status`, and the day the window grows
 * past one page this moves back to the server. The counts are what would have to
 * move with it.
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

/**
 * Every status gets a chip, which it did not before.
 *
 * `rejected` and `cancelled` were left off while the chips refetched, and All
 * still included them — so they were reachable only by scrolling past
 * everything else. Counts make that inconsistency visible rather than merely
 * present: five chips summing to less than All, with nowhere to find the
 * difference. A refused demand is also the one on this screen most likely to
 * need somebody, so it is the last thing that should be the hardest to find.
 */
const FILTERS: ReadonlyArray<{ key: string; label: string; status?: BranchProductionOrderStatus }> =
  [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Waiting', status: 'pending' },
    { key: 'awaiting_verification', label: 'To count in', status: 'awaiting_verification' },
    { key: 'verified', label: 'Counted in', status: 'verified' },
    { key: 'approved', label: 'Approved', status: 'approved' },
    { key: 'rejected', label: 'Refused', status: 'rejected' },
    { key: 'cancelled', label: 'Withdrawn', status: 'cancelled' },
  ];

export function BranchDemandsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');

  const orders = useQuery({
    // The server scopes to the caller's own branch, so no branchId is sent —
    // and no status either: the whole window comes down once and the chips
    // narrow it here. See the note at the top of the file.
    queryKey: qk.productionOrders.list({}),
    queryFn: () => getProductionOrders(),
    staleTime: LIVE_STALE_TIME_MS,
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

  const all = useMemo(() => orders.data ?? [], [orders.data]);

  /**
   * Counted over the whole window, not over what is on screen — the point of a
   * count on a chip is to say what tapping it would show, which a count of the
   * current filter's own result cannot do.
   */
  const chips: FilterChip[] = useMemo(
    () =>
      FILTERS.map(option => ({
        key: option.key,
        label: option.label,
        count: option.status
          ? all.filter(order => order.status === option.status).length
          : all.length,
      })),
    [all],
  );

  const selected = FILTERS.find(f => f.key === filter)?.status;
  const rows = useMemo(
    () => (selected ? all.filter(order => order.status === selected) : all),
    [all, selected],
  );

  /* Which of the two "New order" controls is on screen. Only ever one: the
     empty state while there is nothing to scroll, the FAB once there is.

     Keyed on the WHOLE window rather than on `rows`. A filter that matches
     nothing is not an empty screen — there are demands, they are just not these
     — so the FAB stays and that empty state carries no call to action. */
  const noDemandsAtAll = !orders.isPending && !orders.isError && all.length === 0;
  const filterLabel = FILTERS.find(f => f.key === filter)?.label ?? '';

  const renderItem = useCallback(
    ({ item }: { item: BranchProductionOrder }) => (
      <DemandCard order={item} onWithdraw={setWithdrawing} />
    ),
    [],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton tone="brand" />}
        tone="brand"
        title="Orders"
        subtitle="Demands on production"
        dataAsOf={dataAsOfFrom(orders.dataUpdatedAt)}
        right={<MBSyncStatus />}
      />

      {/* Full-bleed, with the gutter inside the scroller — a row padded by its
          parent stops at the gutter, so the last chip can never be dragged
          clear of the edge and always looks clipped. */}
      <View style={{ paddingTop: theme.space.sm }}>
        <MBFilterChips
          options={chips}
          selectedKey={filter}
          onSelect={setFilter}
          scroll
          gutter={theme.layout.screenPad}
          testIDPrefix="demand-filter"
        />
      </View>

      {orders.isPending ? (
        <MBSkeletonList rows={6} />
      ) : orders.isError ? (
        <MBErrorState
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : all.length === 0 ? (
        <MBEmptyState
          title="No demands"
          message="Demands raised in the last seven business days appear here."
          icon="orders"
          /* The empty state carries the call to action while there is nothing
             to scroll; the FAB below takes over once there is. One control on
             screen at a time — the Expenses rule. */
          actionLabel="New order"
          onAction={() => navigation.navigate('CreateOrder')}
        />
      ) : rows.length === 0 ? (
        /* A different sentence from the one above, because it is a different
           situation: there IS work here and this filter is not where it is.
           Offering "New order" would answer a question nobody asked — the
           filter row above is what this state is telling you to change. */
        <MBEmptyState
          title={`Nothing ${filterLabel.toLowerCase()}`}
          message="No demand in the last seven business days has this status. Try another filter."
          icon="orders"
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

      {/* The corner FAB is back.

          It was removed while the navigation bar carried New Order in its
          centre — two controls competing to be one obvious action. v5 removes
          that button, so this screen is once again the only place the demand
          form is one tap away from the list it belongs to.

          One control at a time, as on Expenses: the empty state above holds the
          instruction while there is nothing at all, and this takes over once
          there is something to scroll — including when the current filter is
          the empty one. */}
      {!noDemandsAtAll ? (
        <MBFab
          label="New order"
          testID="new-demand"
          onPress={() => navigation.navigate('CreateOrder')}
        />
      ) : null}

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

  const items = order.items ?? [];
  const status = BRANCH_PRODUCTION_ORDER_STATUSES[order.status];

  return (
    <MBCard accessibilityLabel={`${order.demandNumber}, ${status}`}>
      {/* v6 heads an order card with the number and the status pill on one
          line and drops the meta under it, rather than running all three across
          a single row. The status is the thing being scanned for down a column
          of these, and it cannot hold a column when the line above it is a
          variable-length date. */}
      <View style={styles.row}>
        <Text style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
          {order.demandNumber}
        </Text>
        {/* The one map from a status to a hue, rather than a colour written
            here. Two screens drawing `verified` in two different colours is
            what `MBStatusTag` and `theme.statusColors` exist to prevent — and
            this file used to keep its own copy. */}
        <MBStatusTag label={status} status={order.status} />
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {/* Through the app's own funnel, never the raw `YYYY-MM-DD`: a business
            date is neither the device's locale nor its timezone, and this list
            is read against the day it is being read on. */}
        {businessDateLabel(order.date)} · {order.time}
        {/* Absent on demands raised before migration 81 — shown as a dash
            rather than falling back to the raise date, which would display a
            delivery commitment nobody made. */}
        {' · needed '}
        {order.requiredDate ? formatBusinessDate(order.requiredDate, { weekday: true }) : '—'}
      </Text>

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
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  items: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancel: { paddingTop: 8 },
});
