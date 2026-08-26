import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBSkeletonList,
  MBStatusTag,
  MBSyncStatus,
} from '@/components';
import { getBranchReturns } from '@/services/api/returnsApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { useTheme } from '@/theme/ThemeProvider';
import { businessDateLabel } from '@/utils/businessDay';
import { formatQty } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, space } from '@/theme/spacing';

/**
 * The shop's own returns.
 *
 * ---------------------------------------------------------------------------
 * A real endpoint that this app had no screen for
 * ---------------------------------------------------------------------------
 * `GET /api/stock/returns?days=N` — `requireRole('super_admin',
 * ...BRANCH_ROLES)`, branch taken off the JWT, 90 days by default, newest first.
 * v5 lists Returns in the branch drawer and this is what is behind it.
 *
 * It is a **different route** from the production counter's queue and the same
 * table underneath. `ProductionReturnsScreen` reads
 * `GET /api/production-returns` over 30 business days and can act on the rows;
 * this reads a quarter and cannot. Both render the same `ProductionReturn`, so
 * the two sides cannot disagree about what a return is.
 *
 * ---------------------------------------------------------------------------
 * Read-only, and the units have already moved
 * ---------------------------------------------------------------------------
 * A branch return takes the stock off the shop's balance **as it is raised** and
 * then waits for the counter to decide. So `pending` here does not mean "nothing
 * has happened yet" — it means the units are gone from the shelf and their
 * destination is undecided. The status copy says which of the two it is rather
 * than leaving a bare word to be interpreted.
 *
 * Revising, resubmitting and withdrawing a pending return are real endpoints
 * (`PUT /api/stock/returns/:id` and friends, all idempotent) and are deliberately
 * not offered here: each moves stock a second time and needs its own confirm and
 * its own conflict handling, which is a screen of its own rather than a row
 * action bolted onto a list. Until then this states plainly that it is a record,
 * not a queue.
 *
 * ---------------------------------------------------------------------------
 * The window is stated, because the chips do not change it
 * ---------------------------------------------------------------------------
 * The chips filter **what came back**. The subtitle says how far back that is —
 * an "All" chip over a bounded window is a lie that reads exactly like the truth,
 * which is the same trap `ProductionReturnsScreen` documents.
 */

/** The server's default. Sent explicitly so the subtitle cannot drift from it. */
const WINDOW_DAYS = 90;

const FILTERS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'returned', label: 'Sent back' },
  { key: 'all', label: 'All' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const STATUS_LABEL: Record<string, string> = {
  // Not "Pending": the units are already off the shelf, and a word that reads as
  // "not started" is the one misreading this screen must not allow.
  pending: 'With production',
  accepted: 'Accepted',
  rejected: 'Rejected',
  // The counter handed the paperwork back for this shop to correct.
  returned: 'Needs your attention',
};

/**
 * `ProductionReturnStatus` → a `statusColors` key.
 *
 * `accepted` is not one of the server's own status words, so it borrows
 * `approved`'s hue — the same meaning one workflow along. Mapped here rather
 * than widening `statusColors`, which holds only real backend status values.
 */
const STATUS_TONE: Record<string, 'pending' | 'approved' | 'rejected'> = {
  pending: 'pending',
  accepted: 'approved',
  rejected: 'rejected',
  returned: 'pending',
};

export function BranchReturnsScreen(): React.ReactElement {
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterKey>('all');

  const returns = useQuery({
    queryKey: qk.productionReturns.branch(WINDOW_DAYS),
    queryFn: () => getBranchReturns(WINDOW_DAYS),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo(() => {
    const all = returns.data ?? [];
    return filter === 'all' ? all : all.filter(r => r.status === filter);
  }, [returns.data, filter]);

  const renderItem = useCallback(
    ({ item }: { item: ProductionReturn }) => <ReturnRow row={item} />,
    [],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Returns"
        subtitle={`Last ${WINDOW_DAYS} days · stock leaves the shelf when a return is raised`}
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(returns.dataUpdatedAt)}
      />

      <MBFilterChips
        options={FILTERS.map(f => ({ key: f.key, label: f.label }))}
        selectedKey={filter}
        onSelect={key => setFilter(key as FilterKey)}
        scroll
        testIDPrefix="branch-returns-filter"
      />

      {returns.isPending ? (
        <MBSkeletonList rows={6} />
      ) : returns.isError ? (
        <MBErrorState
          error={returns.error}
          onRetry={() => returns.refetch()}
          retrying={returns.isFetching}
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title={filter === 'all' ? 'No returns' : 'None in this state'}
          message={
            filter === 'all'
              ? `Nothing has been handed back in the last ${WINDOW_DAYS} days.`
              : 'Try another filter to see the rest.'
          }
          actionLabel={filter === 'all' ? undefined : 'Show all'}
          onAction={filter === 'all' ? undefined : () => setFilter('all')}
          icon="delivery"
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyOf}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={returns.isFetching && !returns.isPending}
              onRefresh={() => returns.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

function keyOf(item: ProductionReturn): string {
  return item.id;
}

function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

/**
 * Memoised at module scope: the list re-renders on every chip tap and every
 * refetch, and with stable props none of the visible rows re-render with it.
 * The theme still reaches them — context bypasses `memo`.
 */
const ReturnRow = React.memo(function ReturnRowView({
  row,
}: {
  row: ProductionReturn;
}): React.ReactElement {
  const theme = useTheme();
  const status = STATUS_LABEL[row.status] ?? row.status;

  return (
    <MBCard
      accessibilityLabel={`${formatQty(row.qty)} ${row.productName}, ${businessDateLabel(row.date)}, ${status}${
        row.reason ? `, ${row.reason}` : ''
      }`}>
      <View style={styles.head}>
        <Text
          numberOfLines={1}
          style={[theme.type.cardTitle, styles.flex, { color: theme.colors.text }]}>
          {row.productName}
        </Text>
        <MBStatusTag status={STATUS_TONE[row.status] ?? 'pending'} label={status} />
      </View>

      <View style={[styles.meta, { paddingTop: theme.space.sm, gap: theme.space.md }]}>
        <Text style={[theme.type.number, { color: theme.colors.text }]}>
          {formatQty(row.qty)}
        </Text>
        <Text style={[theme.type.caption, styles.flex, { color: theme.colors.textMuted }]}>
          {businessDateLabel(row.date)}
        </Text>
        {/* No money figure. `ProductionReturn` carries a quantity and no
            amount, and valuing it here from the cached price list would put a
            number on the row that the server never agreed to — and one a reader
            would take for a refund. The quantity is what was handed back. */}
      </View>

      {row.reason ? (
        <Text
          style={[
            theme.type.caption,
            { color: theme.colors.textMuted, paddingTop: theme.space.xs },
          ]}>
          {row.reason}
        </Text>
      ) : null}
    </MBCard>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet: a row is a label at one edge
  // and a value at the other, and unconstrained on a 10" screen the two end up a
  // hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
