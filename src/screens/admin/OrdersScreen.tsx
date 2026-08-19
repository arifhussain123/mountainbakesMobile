import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBSearchBar,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getOrders } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import type { Order } from '@/shared/types/order.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/money';

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
    queryKey: ['orders', 'list'],
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
        subtitle={orders.data ? `${orders.data.length} orders` : undefined}
        right={<MBSyncStatus />}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <MBSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search order, customer or branch"
          testID="orders-search"
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
      ) : rows.length === 0 ? (
        <MBEmptyState
          title={search ? 'No orders match' : 'No orders found'}
          message={search ? `Nothing found for "${search}".` : undefined}
          actionLabel={search ? 'Clear search' : undefined}
          onAction={search ? () => setSearch('') : undefined}
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

function OrderRow({
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
        <Text style={[theme.type.money, { color: theme.colors.text }]}>
          {formatCurrency(order.grandTotal, currencySymbol)}
        </Text>
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
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowMain: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
