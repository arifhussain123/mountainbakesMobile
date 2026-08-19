import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { getProductionStock } from '@/services/api/productionApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { StockRow } from '@/shared/types/stock.types';
import { stockLevel, type StockLevel } from '@/shared/utils/stock';
import { useTheme } from '@/theme/ThemeProvider';
import { formatQty } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, space } from '@/theme/spacing';

/**
 * Central production stock — the pool branches draw from.
 *
 * Distinct from branch stock: this is the production pool, and it is debited
 * when a branch VERIFIES receipt, by the quantity the branch actually counted.
 * That is why the pool and a branch's expectations can legitimately differ until
 * verification happens.
 */
export function ProductionStockScreen(): React.ReactElement {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  const stock = useQuery({
    queryKey: qk.production.stock(),
    queryFn: () => getProductionStock(),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo(() => {
    const all = stock.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      row =>
        row.productName.toLowerCase().includes(term) || row.stockCode.toLowerCase().includes(term),
    );
  }, [stock.data, search]);

  const renderItem = useCallback(({ item }: { item: StockRow }) => <Row row={item} />, []);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Production stock"
        dataAsOf={dataAsOfFrom(stock.dataUpdatedAt)}
        subtitle={stock.data?.date ? `Business day ${stock.data.date}` : undefined}
        search={{
          value: search,
          onChangeText: setSearch,
          placeholder: 'Search product or stock code',
          testID: 'production-stock-search',
        }}
        right={<MBSyncStatus />}
      />

      {stock.isPending ? (
        <MBSkeletonList rows={8} />
      ) : stock.isError ? (
        <MBErrorState
          error={stock.error}
          onRetry={() => stock.refetch()}
          retrying={stock.isFetching}
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title={search ? 'No products match' : 'No production stock'}
          message={search ? `Nothing found for "${search}".` : 'Nothing recorded for today yet.'}
          actionLabel={search ? 'Clear search' : undefined}
          onAction={search ? () => setSearch('') : undefined}
          illustration={search ? undefined : 'empty-stock'}
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={item => item.productId}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={stock.isFetching && !stock.isPending}
              onRefresh={() => stock.refetch()}
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
const Row = React.memo(function RowView({ row }: { row: StockRow }): React.ReactElement {
  const theme = useTheme();
  const level = stockLevel(row.balance);

  const levelColor: Record<StockLevel, string> = {
    out: theme.colors.danger,
    critical: theme.colors.danger,
    moderate: theme.colors.warning,
    healthy: theme.colors.success,
  };
  const levelLabel: Record<StockLevel, string> = {
    out: 'Out of stock',
    critical: 'Critical',
    moderate: 'Low',
    healthy: 'In stock',
  };

  return (
    <MBCard
      accessibilityLabel={`${row.productName}, ${formatQty(row.balance)}, ${levelLabel[level]}`}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {row.productName}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {row.stockCode}
          </Text>
        </View>
        <View style={styles.balance}>
          <Text style={[theme.type.money, { color: theme.colors.text }]}>
            {formatQty(row.balance)}
          </Text>
          <Text style={[theme.type.caption, { color: levelColor[level] }]}>
            {levelLabel[level]}
          </Text>
        </View>
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
  balance: { alignItems: 'flex-end', gap: space.hair },
});
