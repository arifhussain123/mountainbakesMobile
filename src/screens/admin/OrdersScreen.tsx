import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBMoney,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getOrders } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { Order } from '@/shared/types/order.types';
import { useTheme } from '@/theme/ThemeProvider';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';

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

  const renderItem = useCallback(
    ({ item }: { item: Order }) => <OrderRow order={item} currencySymbol={currencySymbol} />,
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
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

      {orders.isPending ? (
        <MBSkeletonList rows={8} />
      ) : orders.isError ? (
        <MBErrorState
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title={search ? 'No orders match' : 'No orders found'}
          message={
            search ? `Nothing found for "${search}".` : 'Orders placed today will appear here.'
          }
          actionLabel={search ? 'Clear search' : undefined}
          onAction={search ? () => setSearch('') : undefined}
          illustration={search ? undefined : 'empty-orders'}
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
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {order.customerName || 'Walk-in'}
          </Text>
          <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>
            {order.orderNumber}
          </Text>
        </View>
        <MBMoney value={order.grandTotal} symbol={currencySymbol} />
      </View>

      <View style={styles.meta}>
        <View style={styles.statusPill}>
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
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
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
