import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBConfirmDialog,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  MBStatusTag,
} from '@/components';
import { getProductionReturns, reviewProductionReturn } from '@/services/api/returnsApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { useTheme } from '@/theme/ThemeProvider';
import { businessDateLabel } from '@/utils/businessDay';
import { formatQty } from '@/utils/money';
import { contentColumn, space } from '@/theme/spacing';

/**
 * Returns waiting on the production counter.
 *
 * ---------------------------------------------------------------------------
 * BOTH decisions move real stock now, so both are confirmed
 * ---------------------------------------------------------------------------
 * This screen used to confirm Accept and fire Reject straight off, on the
 * grounds that rejecting only closed the record. That stopped being true when
 * branch returns stopped being auto-approved. A branch return now takes the
 * units off the shop's balance as it is raised and waits here for a decision:
 *
 *   accept  the units go into the production pool
 *   reject  the units go back onto the branch's balance
 *
 * Neither is free, and a mis-tapped reject is no longer something the branch can
 * simply raise again — it is stock that has moved in a shop that is not looking.
 * A return Production recorded itself (`source` null) has moved nothing yet, so
 * for those accept still does both halves and reject really is a no-op; the
 * confirmation text says which case the operator is in rather than guessing.
 *
 * ---------------------------------------------------------------------------
 * Send Back is on the web app only
 * ---------------------------------------------------------------------------
 * The third decision — hand the paperwork to the branch to correct, moving no
 * stock — is raised from the web Production Returns page. Rows in that state
 * arrive here labelled "With branch" under their own filter chip and carry no
 * actions, because they are not this counter's to act on.
 *
 * ---------------------------------------------------------------------------
 * Reviewing does not queue, and the server is why
 * ---------------------------------------------------------------------------
 * The update carries `.eq('status', 'pending')`, so a second review of the same
 * return matches no row and answers 409 rather than moving the stock twice. That
 * makes the write safe against a retry and unsuitable for the offline queue at
 * the same time: a review drained an hour later is a decision about stock that
 * another operator may already have made, and it would surface as a conflict for
 * a human — which is where it began. It goes straight out and fails loudly.
 *
 * ---------------------------------------------------------------------------
 * Thirty days, and the screen says thirty days
 * ---------------------------------------------------------------------------
 * `GET /api/production-returns` takes no filters and returns the last thirty
 * business days. The chips below filter **what came back**, and the subtitle
 * states the window — an "All" chip over a fixed window is a lie that reads
 * exactly like the truth.
 */

// 'Sent back' has its own chip rather than living under 'All'. It is the one
// status that is neither settled nor on this counter's queue — the branch has
// it — and without a chip those rows were reachable only by scrolling 'All',
// which is where a return goes to be forgotten.
const FILTERS = [
  { key: 'pending', label: 'To review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'returned', label: 'Sent back' },
  { key: 'all', label: 'All' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: 'To review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  // Not "Returned": every row on this screen is a return, so the label has to
  // say who is holding it, not repeat what it is.
  returned: 'With branch',
};

/**
 * `ProductionReturnStatus` → a `statusColors` key.
 *
 * `accepted` is not one of the server's own status words, so it borrows
 * `approved`'s hue — the same meaning one workflow along. Mapped here rather
 * than adding a key to `statusColors`, which is documented as holding only real
 * backend status values.
 */
const STATUS_TONE: Record<string, 'pending' | 'approved' | 'rejected'> = {
  pending: 'pending',
  accepted: 'approved',
  rejected: 'rejected',
  // Amber like `pending`: it is unfinished work, just not this counter's.
  returned: 'pending',
};

/**
 * What the decision does to stock, in the operator's own terms.
 *
 * Branches on `source` because the answer genuinely differs — a branch-raised
 * return has already come off the shop's balance and a Production-recorded one
 * has not — and getting that wrong in the message is worse than not showing one:
 * it would tell someone rejecting a branch return that nothing moves.
 */
function confirmMessage(r: ProductionReturn, status: 'accepted' | 'rejected'): string {
  const fromBranch = r.source === 'branch';
  if (status === 'accepted') {
    return fromBranch
      ? `The units go into the production pool. ${r.branchName} has already had them taken off their balance, so nothing changes at the branch. This cannot be undone from here.`
      : `The units go into the production pool and out of ${r.branchName}'s stock straight away. This cannot be undone from here.`;
  }
  return fromBranch
    ? `The units go back onto ${r.branchName}'s balance and nothing enters the production pool. The branch cannot change the return afterwards. This cannot be undone from here.`
    : `The return is refused. No stock moves. This cannot be undone from here.`;
}

export function ProductionReturnsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<string>('pending');
  const [confirming, setConfirming] = useState<{ row: ProductionReturn; status: 'accepted' | 'rejected' } | null>(null);

  const returns = useQuery({
    queryKey: qk.productionReturns.list(),
    queryFn: getProductionReturns,
    staleTime: LIVE_STALE_TIME_MS,
  });

  const review = useMutation({
    mutationFn: (input: { id: string; status: 'accepted' | 'rejected' }) =>
      reviewProductionReturn(input.id, input.status),
    onSuccess: () => {
      // Every outcome moves stock somewhere — the pool on an accept, the branch
      // ledger on a reject — so both are stale the moment this returns.
      // Invalidating the return list alone would leave the Stock tab showing a
      // balance that has moved.
      queryClient.invalidateQueries({ queryKey: qk.productionReturns.all() });
      queryClient.invalidateQueries({ queryKey: qk.production.all() });
      queryClient.invalidateQueries({ queryKey: qk.stock.all() });
    },
  });

  const rows = useMemo(() => returns.data ?? [], [returns.data]);

  const shown = useMemo(
    () => (filter === 'all' ? rows : rows.filter(r => r.status === filter)),
    [rows, filter],
  );

  /**
   * The two tiles describe the **pending** queue, not the thirty-day window.
   *
   * "36 units waiting" is a job to do; "36 units returned this month" is a
   * statistic, and the counter is standing here to work through a queue.
   */
  const pending = useMemo(() => rows.filter(r => r.status === 'pending'), [rows]);
  const pendingUnits = pending.reduce((sum, r) => sum + Number(r.qty ?? 0), 0);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Returns"
        subtitle="Handed back by branches · last 30 business days"
        onBack={() => navigation.goBack()}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        <MBStatGrid>
          <MBStatCard
            label="Waiting"
            value={pending.length}
            currency={false}
            icon="delivery"
            tone="warning"
            subtitle={pending.length === 1 ? 'return' : 'returns'}
          />
          <MBStatCard
            label="Units"
            value={formatQty(pendingUnits)}
            currency={false}
            icon="stock"
            tone="info"
            subtitle="to put back"
          />
        </MBStatGrid>

        <MBFilterChips
          options={FILTERS}
          selectedKey={filter}
          onSelect={setFilter}
          testIDPrefix="returns-filter"
        />
      </View>

      {returns.isPending ? (
        <MBSkeletonList rows={5} />
      ) : returns.isError ? (
        <MBErrorState
          error={returns.error}
          onRetry={() => returns.refetch()}
          retrying={returns.isFetching}
        />
      ) : shown.length === 0 ? (
        <MBEmptyState
          title={filter === 'pending' ? 'Nothing to review' : 'No returns here'}
          message={
            filter === 'pending'
              ? 'Every return from the last thirty business days has been dealt with.'
              : 'Nothing in the last thirty business days matches this filter.'
          }
          icon="delivery"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={returns.isFetching && !returns.isPending}
              onRefresh={() => returns.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          {review.isError ? (
            <Text
              accessibilityRole="alert"
              style={[theme.type.caption, { color: theme.colors.danger }]}>
              {(review.error as Error).message}
            </Text>
          ) : null}

          {shown.map(item => (
            <MBCard key={item.id}>
              <View style={[styles.head, { gap: theme.space.md }]}>
                <Text style={[theme.type.cardTitle, styles.flex, { color: theme.colors.text }]}>
                  {item.productName}
                </Text>
                <MBStatusTag
                  label={STATUS_LABEL[item.status] ?? item.status}
                  status={STATUS_TONE[item.status]}
                />
              </View>

              <Text style={[theme.type.body, { color: theme.colors.textSubtle }]}>
                {formatQty(item.qty)} units · {item.branchName}
              </Text>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {businessDateLabel(item.date)} · {item.reason}
              </Text>

              {item.status === 'pending' ? (
                <View style={[styles.actions, { gap: theme.space.sm }]}>
                  <MBButton
                    label="Accept"
                    size="sm"
                    onPress={() => setConfirming({ row: item, status: 'accepted' })}
                    disabled={review.isPending}
                    testID={`accept-${item.id}`}
                  />
                  {/* Confirmed too — see the header. Rejecting a branch-raised
                      return pushes the units back onto that shop's balance. */}
                  <MBButton
                    label="Reject"
                    size="sm"
                    variant="dangerSoft"
                    onPress={() => setConfirming({ row: item, status: 'rejected' })}
                    disabled={review.isPending}
                    testID={`reject-${item.id}`}
                  />
                </View>
              ) : item.reviewedByName ? (
                <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  Reviewed by {item.reviewedByName}
                </Text>
              ) : null}
            </MBCard>
          ))}
        </ScrollView>
      )}

      <MBConfirmDialog
        visible={confirming !== null}
        title={
          confirming
            ? `${confirming.status === 'accepted' ? 'Accept' : 'Reject'} ${formatQty(confirming.row.qty)} × ${confirming.row.productName}?`
            : ''
        }
        message={confirming ? confirmMessage(confirming.row, confirming.status) : ''}
        confirmLabel={confirming?.status === 'accepted' ? 'Accept and restock' : 'Reject return'}
        cancelLabel="Not yet"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) review.mutate({ id: confirming.row.id, status: confirming.status });
          setConfirming(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.tight },
  actions: { flexDirection: 'row', marginTop: space.md },
});
