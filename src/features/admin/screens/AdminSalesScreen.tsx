import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
  MBSaleItem,
} from '@/common/ui';
import { useBranches, useSettings } from '@/api/hooks/useCatalogApi';
import { getOrders } from '@/api/services/financeService';
import { qk } from '@/api/queryKeys';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import type { Order } from '@/shared/types/order.types';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn, space } from '@/common/theme/spacing';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { formatCurrency, round2, toNumber } from '@/common/utils/money';

/**
 * Sales, across every branch.
 *
 * ---------------------------------------------------------------------------
 * Not a second Orders screen
 * ---------------------------------------------------------------------------
 * Both read `/api/orders`, and that is the same resource by design: a counter
 * sale and a customer order are one table. The difference is the question being
 * asked. Orders is a work queue — what is pending, what needs preparing, in
 * status order. This is a money view: what each branch took, totalled, with
 * completed sales the default because an order still being made is not revenue.
 *
 * ---------------------------------------------------------------------------
 * The total is a sum of what is on screen, and says so
 * ---------------------------------------------------------------------------
 * It is NOT the branch's revenue figure — `/api/reports` is authoritative for
 * that and applies rules this screen knows nothing about. Summing rows here and
 * labelling it "Revenue" would put two different numbers for one day in front of
 * an admin, and the wrong one is the one with no audit behind it. The label says
 * "shown" for that reason.
 */

const ALL_BRANCHES = 'all';

/**
 * `delivered` is the completed state for a counter sale — POS writes it
 * directly. Defaulting here keeps in-flight orders out of a money total.
 */
const STATUS_FILTERS = [
  { key: 'delivered', label: 'Completed' },
  { key: 'all', label: 'All statuses' },
] as const;

type StatusKey = (typeof STATUS_FILTERS)[number]['key'];

export function AdminSalesScreen(): React.ReactElement {
  const theme = useTheme();
  const [branchId, setBranchId] = useState(ALL_BRANCHES);
  const [status, setStatus] = useState<StatusKey>('delivered');

  const branches = useBranches();
  const settings = useSettings();
  const currencySymbol = settings.data?.currencySymbol;

  const filters = useMemo(
    () => ({
      ...(branchId === ALL_BRANCHES ? {} : { branchId }),
      ...(status === 'all' ? {} : { status }),
    }),
    [branchId, status],
  );

  const orders = useQuery({
    queryKey: qk.orders.list(filters),
    queryFn: () => getOrders(filters),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo(() => orders.data ?? [], [orders.data]);

  const shownTotal = useMemo(
    // `toNumber`, not `Number`: a malformed figure yields NaN there and poisons
    // the whole total into "Rs. NaN", where `toNumber` falls back to 0 and loses
    // one row instead of the sum. `round2` matches how `saleTotals` closes every
    // reduce — the drift is invisible once formatted, but the rounded value is
    // what the accessibility label and any later comparison see.
    () => round2(rows.reduce((sum, order) => sum + toNumber(order.grandTotal), 0)),
    [rows],
  );

  const branchOptions = useMemo(
    () => [
      { key: ALL_BRANCHES, label: 'All branches' },
      ...(branches.data ?? []).map(b => ({ key: b.id, label: b.name })),
    ],
    [branches.data],
  );

  const renderItem = useCallback(
    ({ item }: { item: Order }) => <MBSaleItem order={item} currencySymbol={currencySymbol} />,
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Sales"
        dataAsOf={dataAsOfFrom(orders.dataUpdatedAt)}
        subtitle={
          orders.data
            ? `${rows.length} ${rows.length === 1 ? 'sale' : 'sales'} · ${formatCurrency(
                shownTotal,
                currencySymbol,
              )} shown`
            : undefined
        }
        right={<MBSyncStatus />}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.sm }}>
        <MBFilterChips
          options={branchOptions}
          selectedKey={branchId}
          onSelect={setBranchId}
          scroll
          testIDPrefix="sales-branch"
        />
        <MBFilterChips
          options={STATUS_FILTERS}
          selectedKey={status}
          onSelect={key => setStatus(key as StatusKey)}
          tone="accent"
          testIDPrefix="sales-status"
        />
      </View>

      {orders.isPending ? (
        <MBSkeletonList rows={8} />
      ) : orders.isError ? (
        <MBErrorState error={orders.error} onRetry={orders.refetch} retrying={orders.isFetching} />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title="No sales here"
          message="Nothing matches this branch and status."
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={orders.refetch} />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.tight,
  },
});
