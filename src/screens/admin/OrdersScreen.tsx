import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBAccountButton,
  MBCard,
  MBEmptyState,
  MBFilterChips,
  MBMoney,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
  type FilterChip,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getOrders } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { Order, OrderStatus } from '@/shared/types/order.types';
import { useTheme } from '@/theme/ThemeProvider';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';

/**
 * The status filters, in lifecycle order.
 *
 * `cancelled` is last and is not folded into any other bucket: an order that
 * was called off is not an order that finished, and a filter that says
 * otherwise is how a cancelled sale gets counted as takings.
 */
const STATUS_FILTERS: readonly FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

/**
 * Customer orders across all branches.
 *
 * Distinct from Production's Orders tab, which shows branch demands on central
 * production — a different resource with a different lifecycle.
 *
 * Filtering is client-side: this endpoint offers no search parameter and no
 * pagination, so it already returns the full filtered set.
 */
export function OrdersScreen(): React.ReactElement {
  const theme = useTheme();
  const { currencySymbol } = useCatalogSettings();
  const [search, setSearch] = useState('');
  /**
   * v4 draws four filters — All / Pending / In Production / Done. Those last
   * two are not statuses this backend has: `OrderStatus` is
   * pending · preparing · ready · delivered · cancelled, and collapsing five
   * into three would make "Done" mean something no query can express and hide
   * cancellations inside it. The real five are offered instead.
   */
  const [status, setStatus] = useState<'all' | OrderStatus>('all');

  const orders = useQuery({
    // Through `qk`, so this shares an entry with the sales list rather than
    // sitting beside it as a second unfiltered copy of `GET /api/orders`.
    queryKey: qk.orders.list({}),
    queryFn: () => getOrders(),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo(() => {
    const all = orders.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      order =>
        order.orderNumber?.toLowerCase().includes(term) ||
        order.customerName?.toLowerCase().includes(term) ||
        order.branchName?.toLowerCase().includes(term),
    );
  }, [orders.data, search]);

  /**
   * Filtered on the client, over the list already fetched.
   *
   * The endpoint takes no status parameter, so this narrows what is on the
   * device rather than asking for less — which also means the counts in the
   * subtitle describe the filtered view and not the day.
   */
  const visible = useMemo(
    () => (status === 'all' ? rows : rows.filter(o => o.status === status)),
    [rows, status],
  );

  const renderItem = useCallback(
    ({ item }: { item: Order }) => <OrderRow order={item} currencySymbol={currencySymbol} />,
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Orders"
        dataAsOf={dataAsOfFrom(orders.dataUpdatedAt)}
        subtitle={orders.data ? `${orders.data.length} orders` : undefined}
        search={{
          value: search,
          onChangeText: setSearch,
          placeholder: 'Search order, customer or branch',
          testID: 'orders-search',
        }}
        right={<MBSyncStatus />}
      />

      <View style={{ paddingHorizontal: theme.layout.screenPad, paddingBottom: theme.space.md }}>
        <MBFilterChips
          options={STATUS_FILTERS}
          selectedKey={status}
          onSelect={key => setStatus(key as 'all' | OrderStatus)}
          scroll
          testIDPrefix="orders-status"
        />
      </View>

      {orders.isPending ? (
        <MBSkeletonList rows={8} />
      ) : orders.isError ? (
        <MBErrorState
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : visible.length === 0 ? (
        <MBEmptyState
          title={search || status !== 'all' ? 'No orders match' : 'No orders found'}
          message={
            search
              ? `Nothing found for "${search}".`
              : status !== 'all'
                ? 'No orders in this state right now.'
                : 'Orders placed today will appear here.'
          }
          actionLabel={search ? 'Clear search' : status !== 'all' ? 'Show all' : undefined}
          onAction={
            search ? () => setSearch('') : status !== 'all' ? () => setStatus('all') : undefined
          }
          illustration={search || status !== 'all' ? undefined : 'empty-orders'}
        />
      ) : (
        <FlashList
          data={visible}
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
    </View>
  );
}

/**
 * Memoised. This list re-renders whenever the screen does — a filter chip, a
 * refetch, a keystroke — and with props that do not change, none of the visible
 * rows re-render with it. Theme changes still reach it: context bypasses `memo`.
 */
const OrderRow = React.memo(function OrderRowView({
  order,
  currencySymbol,
}: {
  order: Order;
  currencySymbol?: string;
}): React.ReactElement {
  const theme = useTheme();
  const statusColor =
    theme.statusColors[order.status as keyof typeof theme.statusColors] ?? theme.colors.textMuted;

  return (
    <MBCard>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text numberOfLines={1} style={[theme.type.cardTitle, { color: theme.colors.text }]}>
            {order.customerName || 'Walk-in'}
          </Text>
          <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>
            {order.orderNumber}
          </Text>
        </View>
        <MBMoney value={order.grandTotal} symbol={currencySymbol} />
      </View>

      <View style={styles.meta}>
        {/* Filled pill, hue on the dot — see the note on `MBOrderCard` for why
            the fill is `surfaceSunken` and not a per-status tint. */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: theme.colors.surfaceSunken,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.space.snug,
              paddingVertical: theme.space.xs,
            },
          ]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[theme.type.caption, { color: theme.colors.text }]}>{order.status}</Text>
        </View>
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {order.branchName} · {order.paymentMethod}
        </Text>
      </View>
    </MBCard>
  );
});

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet. A list row is a label at
  // one edge and a value at the other; unconstrained on a 10" screen the two
  // end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: layout.screenPad, paddingBottom: space.xxl },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowMain: { flex: 1, gap: space.hair },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.sm,
  },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  dot: { width: layout.dotSize, height: layout.dotSize, borderRadius: radius.pill },
});
