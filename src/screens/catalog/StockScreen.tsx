import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBSearchBar,
  MBSyncStatus,
  MBSkeletonList,
} from '@/components';
import { useStock } from '@/hooks/useCatalog';
import { isBranchRole } from '@/navigation/roleNavigation';
import type { StockRow } from '@/shared/types/stock.types';
import { stockLevel, type StockLevel } from '@/shared/utils/stock';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatQty } from '@/utils/money';

/**
 * Branch stock for the current business date.
 *
 * The server computes the row arithmetic and echoes back the business date it
 * used — the app does not recompute either. That matters because the business
 * day rolls at 2 AM, so an evening shift and the client's idea of "today" can
 * legitimately disagree.
 *
 * Filtering is client-side here, unlike Products: this endpoint returns one row
 * per product for a single branch and day — a bounded set — and offers no search
 * parameter.
 */
export function StockScreen(): React.ReactElement {
  const theme = useTheme();
  const role = useAuthStore(s => s.claims?.role);
  const branchName = useAuthStore(s => s.claims?.branchName);

  const [search, setSearch] = useState('');
  const stock = useStock();

  const onRefresh = useCallback(() => {
    stock.refetch();
  }, [stock]);

  const rows = useMemo(() => {
    const all = stock.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      r =>
        r.productName.toLowerCase().includes(term) || r.stockCode.toLowerCase().includes(term),
    );
  }, [stock.data, search]);

  const renderItem = useCallback(
    ({ item }: { item: StockRow }) => <StockRowCard row={item} />,
    [],
  );

  // Admin and production roles carry no branch, and the endpoint 400s without
  // one. Say so rather than surfacing a server error the user cannot act on.
  const needsBranchSelection = role ? !isBranchRole(role) : false;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Stock"
        subtitle={
          stock.data?.date
            ? `${branchName ?? 'Branch'} · business day ${stock.data.date}`
            : (branchName ?? undefined)
        }
        right={<MBSyncStatus />}
      />

      {needsBranchSelection ? (
        <MBEmptyState
          title="Choose a branch"
          message="Stock is per branch. Branch selection for admin and production roles arrives with the dashboard."
        />
      ) : (
        <>
          <View style={{ padding: theme.layout.screenPad }}>
            <MBSearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search product or stock code"
              testID="stock-search"
            />
          </View>

          {stock.isPending ? (
            <MBSkeletonList rows={8} />
          ) : stock.isError ? (
            <MBErrorState error={stock.error} onRetry={onRefresh} retrying={stock.isFetching} />
          ) : rows.length === 0 ? (
            <MBEmptyState
              title={search ? 'No products match' : 'No stock recorded'}
              message={
                search
                  ? `Nothing found for "${search}".`
                  : 'No stock movements for this business day yet.'
              }
              actionLabel={search ? 'Clear search' : undefined}
              onAction={search ? () => setSearch('') : undefined}
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
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
        </>
      )}
    </View>
  );
}

function StockRowCard({ row }: { row: StockRow }): React.ReactElement {
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
      accessibilityLabel={`${row.productName}, balance ${formatQty(row.balance)}, ${levelLabel[level]}`}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
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
          {/* A word as well as a colour — the level must be readable without
              distinguishing red from green. */}
          <Text style={[theme.type.caption, { color: levelColor[level] }]}>
            {levelLabel[level]}
          </Text>
        </View>
      </View>

      {/* opening + newQty − sold − returned + adjustment = balance */}
      <View style={[styles.movements, { borderTopColor: theme.colors.border }]}>
        <Movement label="Opening" value={row.opening} />
        <Movement label="Received" value={row.newQty} />
        <Movement label="Sold" value={row.sold} />
        <Movement label="Returned" value={row.returned} />
        <Movement label="Adjusted" value={row.adjustment} signed />
      </View>
    </MBCard>
  );
}

function Movement({
  label,
  value,
  signed = false,
}: {
  label: string;
  value: number;
  signed?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  // `adjustment` is deliberately signed — the direction is the point, and it is
  // what makes the row reconcile.
  const display = signed && value > 0 ? `+${formatQty(value)}` : formatQty(value);

  return (
    <View style={styles.movement}>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[theme.type.mono, { color: theme.colors.text }]}>{display}</Text>
    </View>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerMain: { flex: 1, gap: 2 },
  balance: { alignItems: 'flex-end', gap: 2 },
  movements: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  movement: { alignItems: 'center', gap: 2, minWidth: 56 },
});
