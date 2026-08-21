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
 * Accepting one moves real stock. Rejecting one moves nothing.
 * ---------------------------------------------------------------------------
 * That asymmetry is the whole screen. `accepted` runs two movements — the units
 * go back into the production pool and out of the branch's ledger — while
 * `rejected` only closes the record. So accept is confirmed and reject is not:
 * a mis-tapped reject is a decision somebody can revisit by raising the return
 * again, and a mis-tapped accept is inventory that has moved.
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

const FILTERS = [
  { key: 'pending', label: 'To review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: 'To review',
  accepted: 'Accepted',
  rejected: 'Rejected',
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
};

export function ProductionReturnsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<string>('pending');
  const [accepting, setAccepting] = useState<ProductionReturn | null>(null);

  const returns = useQuery({
    queryKey: qk.productionReturns.list(),
    queryFn: getProductionReturns,
    staleTime: LIVE_STALE_TIME_MS,
  });

  const review = useMutation({
    mutationFn: (input: { id: string; status: 'accepted' | 'rejected' }) =>
      reviewProductionReturn(input.id, input.status),
    onSuccess: () => {
      // Accepting moves stock in two places, so the pool and the branch ledger
      // are both stale the moment this returns. Invalidating the return list
      // alone would leave the Stock tab showing a balance that has moved.
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
                    onPress={() => setAccepting(item)}
                    disabled={review.isPending}
                    testID={`accept-${item.id}`}
                  />
                  {/* Not confirmed. Rejecting moves no stock, and the branch can
                      raise the return again — so a second dialog would be a tax
                      on the safe half of the decision. */}
                  <MBButton
                    label="Reject"
                    size="sm"
                    variant="dangerSoft"
                    onPress={() => review.mutate({ id: item.id, status: 'rejected' })}
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
        visible={accepting !== null}
        title={`Accept ${accepting?.qty ?? ''} × ${accepting?.productName ?? ''}?`}
        message={`The units go back into the production pool and out of ${
          accepting?.branchName ?? 'the branch'
        }'s stock straight away. This cannot be undone from here.`}
        confirmLabel="Accept and restock"
        cancelLabel="Not yet"
        onCancel={() => setAccepting(null)}
        onConfirm={() => {
          if (accepting) review.mutate({ id: accepting.id, status: 'accepted' });
          setAccepting(null);
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
