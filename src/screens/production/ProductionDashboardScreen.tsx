import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBDataRow,
  MBErrorState,
  MBHeader,
  MBShareList,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  MBSyncStatus,
  MBTrendChart,
} from '@/components';
import { getProductionOverview, getProductionQueueStats } from '@/services/api/productionApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumnWide, space } from '@/theme/spacing';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { formatQty, toNumber } from '@/utils/money';

/**
 * Production dashboard.
 *
 * Counts, not money: the production floor works in quantities, and every figure
 * here is the server's own aggregate — nothing is recomputed on the device.
 *
 * ---------------------------------------------------------------------------
 * Two pipelines, kept visibly apart
 * ---------------------------------------------------------------------------
 * The six headline figures do not come from one journey, and putting them in a
 * single undifferentiated grid is how an operator reads them as one:
 *
 *   Preparation  `GET /api/production/queue` — **customer orders**, moving
 *                `pending → preparing → ready`. This is the bench.
 *   Dispatch     `GET /api/production/overview` — **branch demands**, moving
 *                `pending → awaiting_verification → verified → approved`. This
 *                is what goes out to the shops.
 *
 * They are separate resources with separate status enums (see `roleConfig.ts`,
 * which gives the role a tab for each), and a demand that is `approved` is not
 * an order that is `ready`. So they are drawn as two labelled groups.
 *
 * A note on **Delivered**: the server computes `deliveredOrders` as literally
 * `approvedOrders` — one assignment, commented `// Approve = Delivered` — over
 * demands approved in the **last 7 business days**. The tile says so rather than
 * implying a same-day delivery count the API does not produce. Until this
 * screen was rewritten it showed *both* numbers as separate tiles, so the same
 * figure appeared twice under two labels.
 */
export function ProductionDashboardScreen(): React.ReactElement {
  const theme = useTheme();

  // Two independent requests, fired concurrently — neither waits on the other,
  // and each covers one of the two pipelines above.
  const overview = useQuery({
    queryKey: qk.production.overview(),
    queryFn: getProductionOverview,
    staleTime: LIVE_STALE_TIME_MS,
  });

  const queue = useQuery({
    queryKey: qk.production.queueStats(),
    queryFn: getProductionQueueStats,
    staleTime: LIVE_STALE_TIME_MS,
  });

  const cards = overview.data?.cards;
  const stats = queue.data;

  const demandTrend = useMemo(
    () => (overview.data?.demandByDay ?? []).map(d => ({ label: d.date, value: toNumber(d.qty) })),
    [overview.data],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Production"
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(overview.dataUpdatedAt)}
      />

      {overview.isPending ? (
        <MBSkeletonList rows={5} />
      ) : overview.isError ? (
        <MBErrorState
          error={overview.error}
          onRetry={() => overview.refetch()}
          retrying={overview.isFetching}
        />
      ) : (
        <ScrollView
          /* Wide cap, not the single-column one: the stat grid is genuinely
             several measures side by side, and capping it at 640 would leave a
             tablet showing a phone's 2x2 block in the middle of the screen. */
          contentContainerStyle={[
            contentColumnWide,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={overview.isFetching && !overview.isPending}
              onRefresh={() => {
                overview.refetch();
                queue.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }>
          <Text style={[theme.type.h3, { color: theme.colors.text }]}>On the bench</Text>
          <MBStatGrid>
            <MBStatCard
              label="Waiting orders"
              value={toNumber(stats?.waitingCount)}
              currency={false}
              icon="orders"
              loading={queue.isPending}
              subtitle="Accepted, not started"
            />
            <MBStatCard
              label="In production"
              value={toNumber(stats?.preparingCount)}
              currency={false}
              icon="preparation"
              loading={queue.isPending}
              subtitle="On the bench now"
            />
            <MBStatCard
              label="Prepared"
              value={toNumber(stats?.readyCount)}
              currency={false}
              icon="production"
              loading={queue.isPending}
              subtitle="Made, waiting to go out"
            />
          </MBStatGrid>

          <Text style={[theme.type.h3, { color: theme.colors.text }]}>Going out</Text>
          <MBStatGrid>
            <MBStatCard
              label="Delivered"
              value={toNumber(cards?.deliveredOrders)}
              currency={false}
              icon="delivery"
              // Named honestly: the API returns approvals, over a 7-day window.
              subtitle="Demands approved, last 7 days"
            />
            <MBStatCard
              label="Returned"
              value={toNumber(cards?.returnedProducts)}
              currency={false}
              icon="stock"
              subtitle="Units back today"
            />
            <MBStatCard
              label="Changed orders"
              value={toNumber(cards?.changedOrders)}
              currency={false}
              icon="filter"
              subtitle="Approved with edits"
            />
          </MBStatGrid>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Prepared quantity</Text>
            {/* Units, not orders — the row above counts jobs, this counts what
                came off the bench. Labelling both "production" without saying
                which is how the two get compared to each other. */}
            <MBDataRow label="Today" value={formatQty(cards?.todayProduction)} />
            <MBDataRow label="This week" value={formatQty(cards?.weeklyProduction)} />
            <MBDataRow label="This month" value={formatQty(cards?.monthlyProduction)} />
          </MBCard>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Pool</Text>
            <MBDataRow
              label="Available production stock"
              value={formatQty(cards?.availableProductionStock)}
            />
            <MBDataRow label="Open demand" value={formatQty(cards?.totalDemandQty)} />
          </MBCard>

          {demandTrend.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Demand by day</Text>
              <MBTrendChart
                data={demandTrend}
                accessibilityLabel="Branch demand quantity by business day"
              />
            </MBCard>
          ) : null}

          {(overview.data?.branchDemand ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Demand by branch</Text>
              <MBShareList
                accessibilityLabel="Branches by demand quantity"
                items={(overview.data?.branchDemand ?? []).map(branch => ({
                  label: branch.branchName,
                  amount: toNumber(branch.qty),
                  display: formatQty(branch.qty),
                }))}
              />
            </MBCard>
          ) : null}

          {(overview.data?.topProducts ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Most demanded</Text>
              <MBShareList
                accessibilityLabel="Most demanded products"
                items={(overview.data?.topProducts ?? []).slice(0, 8).map(product => ({
                  label: product.productName,
                  amount: toNumber(product.qty),
                  display: formatQty(product.qty),
                }))}
              />
            </MBCard>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.snug,
  },
});
