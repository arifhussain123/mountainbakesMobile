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
  MBStatCard,
  MBStatGrid,
  MBStatusTag,
  MBSyncStatus,
} from '@/common/ui';
import { getBranchReturns } from '@/api/services/returnsService';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/common/theme/ThemeProvider';
import { businessDateLabel } from '@/common/helpers/businessDay';
import { formatQty } from '@/common/utils/money';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { contentColumn, space } from '@/common/theme/spacing';

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
 *
 * ---------------------------------------------------------------------------
 * v6's screen 10, and the half of it this data cannot carry
 * ---------------------------------------------------------------------------
 * The summary above the list counts **units**, never money. v6 draws a Credit
 * value card beside it and there is nothing behind it: `ProductionReturn` has a
 * quantity, a reason and a status, and no rate, amount or credit anywhere.
 * Valuing the rows here from the cached price list would put a figure on the
 * screen the server never agreed to, in a place a reader would take for a
 * refund — see the note on the card below, which refused the same thing for the
 * same reason. A credit figure is a server change: the return would have to
 * snapshot the rate in force, as a production-order line already does.
 *
 * Two more of v6's rules are declined rather than deferred:
 *
 * - **`REASONS.restock`** would put "can these units be sold again" in the
 *   branch's hands. `reason` here is free text and the decision belongs to
 *   Production at review — `ProductionReturnDisposition` says so in as many
 *   words, and the point of splitting it out was that an accepted return is not
 *   automatically saleable stock.
 * - **Three tabs** (Pending / Approved / Rejected) would hide `returned`, which
 *   is the counter handing the paperwork back for this shop to fix. It is the
 *   one status on this screen that needs the branch, so it is the last one to
 *   drop — and `open` is `pending` AND `returned` here, not `pending` alone.
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

/**
 * Urgency, and it is not quite v6's.
 *
 * Screen 10 sorts Pending first, because what has not been decided is the reason
 * to open the screen. That holds — but this workflow has **two** open states and
 * they are not equally urgent to the shop. `returned` is Production handing the
 * paperwork back for the branch to correct: it is waiting on *this* reader.
 * `pending` is waiting on somebody else. So the thing needing an action from the
 * person holding the phone sorts above the thing needing an action from the
 * counter, and the two terminal states share the bottom rank — an accepted and a
 * rejected return are equally finished, and ordering one above the other would
 * imply a judgement the screen is not making.
 */
const URGENCY: Record<string, number> = {
  returned: 0,
  pending: 1,
  accepted: 2,
  rejected: 2,
};

/**
 * The list's order, as a function rather than inline in the component.
 *
 * Exported and tested directly because the rendered order cannot be read back
 * off the list: `FlashList` keeps its mounted cells in the order they first
 * appeared, so a row that was on screen before a filter widened stays where it
 * was in the host tree even after the data behind it is re-sorted. Asserting on
 * `getAllByTestId` would be pinning that behaviour rather than this rule.
 *
 * Sorted on a copy, and stably: within one rank the server's own order — newest
 * first — is kept, so two returns raised in the same minute do not swap places
 * between renders.
 */
export function byUrgency(rows: readonly ProductionReturn[]): ProductionReturn[] {
  return [...rows].sort((a, b) => (URGENCY[a.status] ?? 3) - (URGENCY[b.status] ?? 3));
}

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
  /**
   * Lands on Waiting, which v6 asks for: what has not been decided is why the
   * screen gets opened. All is one tap away with its own total on it, and the
   * "nothing waiting" state below offers it directly rather than leaving a
   * healthy quarter looking like a broken fetch.
   */
  const [filter, setFilter] = useState<FilterKey>('pending');

  const returns = useQuery({
    queryKey: qk.productionReturns.branch(WINDOW_DAYS),
    queryFn: () => getBranchReturns(WINDOW_DAYS),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const all = useMemo(() => returns.data ?? [], [returns.data]);

  /**
   * Counted over the whole window rather than over what is on screen: a count
   * says what tapping that chip would show, which a count of the current
   * filter's own result cannot do.
   */
  const chips = useMemo(
    () =>
      FILTERS.map(f => ({
        key: f.key,
        label: f.label,
        count: f.key === 'all' ? all.length : all.filter(r => r.status === f.key).length,
      })),
    [all],
  );

  /**
   * Units handed back **today**, and how many returns are still open.
   *
   * Today is the business date — the day rolls at 02:00 Asia/Karachi, so an
   * evening shift's returns belong to the day that is still running and a naive
   * midnight would move them a shift early.
   *
   * The units figure counts every return raised today whatever its status,
   * because that is what left the shelf today: the branch balance is debited as
   * a return is saved, and a rejection puts the units back on a later day rather
   * than unmaking the movement.
   */
  const summary = useMemo(() => {
    const today = businessDateStr();
    return {
      unitsToday: all.reduce((sum, r) => (r.date === today ? sum + r.qty : sum), 0),
      waiting: all.filter(r => r.status === 'pending').length,
      needsYou: all.filter(r => r.status === 'returned').length,
    };
  }, [all]);

  const rows = useMemo(
    () => byUrgency(filter === 'all' ? all : all.filter(r => r.status === filter)),
    [all, filter],
  );

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

      {/* Quantities only — see the note at the top of the file for why there is
          no credit figure beside them.

          `currency={false}` on every tile, and it is the load-bearing prop
          rather than a tidy-up: `MBStatCard` formats as currency by DEFAULT,
          which is right on the dashboards it was built for and exactly wrong
          here. Left off, these three tiles render "Rs. 12 units off the shelf"
          — a money figure invented by a component default, on the one screen
          whose whole argument is that the endpoint returns no money.
          `BranchReturnsScreen.test.tsx` asserts no `Rs.` reaches this screen,
          and it caught this.

          The third tile appears only when the counter has actually sent
          something back; a permanent "0 needs you" is a tile that teaches the
          reader to stop looking at it. */}
      {!returns.isPending && !returns.isError ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
          <MBStatGrid>
            <MBStatCard
              label="Handed back today"
              value={summary.unitsToday}
              subtitle="units off the shelf"
              icon="delivery"
              tone="brand"
              currency={false}
              testID="returns-units-today"
            />
            {/* "Awaiting production", not "With production", which is the wording
                the status pill on each card already carries. A tile counting
                returns and a pill naming one return's state are different
                claims, and giving them the same three words makes the tile look
                like a filter for the pill. */}
            <MBStatCard
              label="Awaiting production"
              value={summary.waiting}
              subtitle="not yet decided"
              icon="orders"
              tone="warning"
              currency={false}
              testID="returns-waiting"
            />
            {summary.needsYou > 0 ? (
              <MBStatCard
                label="Needs your attention"
                value={summary.needsYou}
                subtitle="sent back to correct"
                icon="blocked"
                tone="danger"
                currency={false}
                testID="returns-needs-you"
              />
            ) : null}
          </MBStatGrid>
        </View>
      ) : null}

      <MBFilterChips
        options={chips}
        selectedKey={filter}
        onSelect={key => setFilter(key as FilterKey)}
        scroll
        gutter={space.lg}
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
      ) : all.length === 0 ? (
        <MBEmptyState
          title="No returns"
          message={`Nothing has been handed back in the last ${WINDOW_DAYS} days.`}
          icon="delivery"
        />
      ) : rows.length === 0 && filter === 'pending' ? (
        /* Not an empty screen — a settled one. The landing filter is the open
           work, so its empty case is good news and has to read as good news
           rather than as "nothing has been handed back". */
        <MBEmptyState
          title="Nothing waiting"
          message={`Every return in the last ${WINDOW_DAYS} days has been decided.`}
          actionLabel="Show all"
          onAction={() => setFilter('all')}
          icon="delivery"
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title="None in this state"
          message="Try another filter to see the rest."
          actionLabel="Show all"
          onAction={() => setFilter('all')}
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
      testID={`return-${row.id}`}
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
