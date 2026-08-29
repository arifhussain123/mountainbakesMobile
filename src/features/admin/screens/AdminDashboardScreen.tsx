import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBAccountButton,
  MBCard,
  MBRangeFilter,
  MBErrorState,
  MBHeader,
  MBShareList,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  MBSyncStatus,
  MBTrendChart,
} from '@/common/ui';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { getBranchStock, getProductionOrders } from '@/api/services/productionService';
import { getReportSummary } from '@/api/services/reportsService';
import { LIVE_STALE_TIME_MS, STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import { isLowStock } from '@/shared/utils/stock';
import { businessDaysAgoStr, businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumnWide } from '@/common/theme/spacing';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import {
  resolveRange,
  type CustomDates,
  type DashboardRangeKey,
} from '@/common/helpers/dashboardRange';
import { formatCurrency, formatQty, toNumber } from '@/common/utils/money';

/**
 * Company-wide dashboard.
 *
 * ---------------------------------------------------------------------------
 * Three requests, chosen to be three
 * ---------------------------------------------------------------------------
 * They run concurrently — React Query fires each `useQuery` as it mounts, so
 * there is no waterfall — and each is the *cheapest call that answers its
 * question*:
 *
 *   summary       one call covering sales, expenses, profit, pending orders,
 *                 the daily series and all three breakdowns. Everything the
 *                 period selector affects comes from here.
 *   pending demand `?status=pending`, filtered server-side. Fetching every
 *                 demand and counting on the device would transfer the year to
 *                 render one number.
 *   branch stock  the only single request that can answer low-stock across the
 *                 company (see `getBranchStock`), and it carries the active
 *                 branch list, which is why there is no fourth call for
 *                 "Total Branches".
 *
 * Their cache windows differ on purpose. Money is `LIVE_STALE_TIME_MS` (15s)
 * because an admin watching a shift expects it to move; stock is `STALE_TIME_MS`
 * (60s) because a *count of products under five units* does not meaningfully
 * change inside a minute, and that call is the expensive one.
 *
 * Only `summary` is keyed on the period. Changing the range must not re-fetch
 * stock or pending demand — neither is period-scoped, and refetching them would
 * be exactly the "unnecessary data" a period chip should not cost.
 */
export function AdminDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const { currencySymbol } = useCatalogSettings();

  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>('today');
  const [custom, setCustom] = useState<CustomDates>(() => ({
    from: businessDaysAgoStr(6),
    to: businessDateStr(),
  }));

  const range = useMemo(() => resolveRange(rangeKey, custom), [rangeKey, custom]);

  const summary = useQuery({
    // `from`/`to` are in the key: two custom ranges are two different questions.
    queryKey: qk.reports.summary(range),
    queryFn: () => getReportSummary(range),
    staleTime: LIVE_STALE_TIME_MS,
    /**
     * The previous answer stays on screen while the new one loads.
     *
     * Without it, changing the filter unmounts the whole result and puts a
     * skeleton in its place — the screen empties, the layout collapses, and it
     * refills a moment later. The user did not ask for a new screen, they asked
     * the same screen a different question, so the old answer is the honest
     * thing to show until the new one arrives.
     */
    placeholderData: previous => previous,
  });

  const pendingDemand = useQuery({
    // `GET /api/production-orders`, the same resource the production counter's
    // Orders list and a branch's Demands list read. One key, or the pending
    // count and the list it counts go stale independently.
    queryKey: qk.productionOrders.list({ status: 'pending' }),
    queryFn: () => getProductionOrders({ status: 'pending' }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const branchStock = useQuery({
    queryKey: qk.production.branchStock(),
    queryFn: getBranchStock,
    staleTime: STALE_TIME_MS,
  });

  const data = summary.data;

  /**
   * A product counts once, however many branches it is low in.
   *
   * The tile answers "how many products need attention", not "how many
   * branch-product pairs are short" — the second number is bigger, moves for
   * reasons nobody can see, and is not what anyone acts on. `isLowStock` is the
   * shared helper the server itself uses (`> 0 and < 5`), so this cannot drift
   * from the alert that fires at the till.
   */
  const lowStockCount = useMemo(() => {
    const rows = branchStock.data?.rows ?? [];
    return rows.filter(row => Object.values(row.byBranch).some(isLowStock)).length;
  }, [branchStock.data]);

  const trend = useMemo(() => (data?.dailyData ?? []).map(toTrend), [data]);
  const expenseTrend = useMemo(
    () => (data?.dailyData ?? []).map(d => ({ label: d.date, value: toNumber(d.expenses) })),
    [data],
  );
  const profitTrend = useMemo(
    () => (data?.dailyData ?? []).map(d => ({ label: d.date, value: toNumber(d.profit) })),
    [data],
  );

  const money = (value: unknown) => formatCurrency(value, currencySymbol);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton tone="brand" />}
        tone="brand"
        title="Dashboard"
        subtitle="All branches"
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(summary.dataUpdatedAt)}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <MBRangeFilter
          value={rangeKey}
          onChange={setRangeKey}
          custom={custom}
          onCustomChange={setCustom}
        />
      </View>

      {summary.isPending ? (
        <MBSkeletonList rows={5} />
      ) : summary.isError ? (
        <MBErrorState
          error={summary.error}
          onRetry={() => summary.refetch()}
          retrying={summary.isFetching}
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
              refreshing={summary.isFetching && !summary.isPending}
              onRefresh={() => {
                // Everything on screen, not just the period-scoped call.
                summary.refetch();
                pendingDemand.refetch();
                branchStock.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }>
          <MBStatGrid>
            <MBStatCard
              label="Sales"
              tone="success"
              value={toNumber(data?.totalRevenue)}
              currencySymbol={currencySymbol}
              icon="sales"
            />
            <MBStatCard
              label="Expenses"
              tone="danger"
              value={toNumber(data?.totalExpenses)}
              currencySymbol={currencySymbol}
              icon="expenses"
            />
            <MBStatCard
              label="Profit"
              tone="warning"
              value={toNumber(data?.totalProfit)}
              currencySymbol={currencySymbol}
              icon="reports"
            />
            <MBStatCard
              label="Pending orders"
              tone="info"
              value={toNumber(data?.totalPending)}
              currency={false}
              icon="orders"
            />
            <MBStatCard
              label="Pending demand"
              tone="info"
              value={pendingDemand.data?.length ?? 0}
              currency={false}
              icon="production"
              loading={pendingDemand.isPending}
              subtitle="Awaiting production review"
            />
            <MBStatCard
              label="Low stock"
              tone="danger"
              value={lowStockCount}
              currency={false}
              icon="stock"
              loading={branchStock.isPending}
              subtitle={`Under ${LOW_STOCK_LABEL} units`}
            />
            <MBStatCard
              label="Branches"
              tone="brand"
              value={branchStock.data?.branches.length ?? 0}
              currency={false}
              icon="branches"
              loading={branchStock.isPending}
            />
          </MBStatGrid>

          {trend.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Sales</Text>
              <MBTrendChart
                data={trend}
                accessibilityLabel={`Sales by day. Total ${money(data?.totalRevenue)}.`}
                formatValue={money}
              />
            </MBCard>
          ) : null}

          {expenseTrend.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Expenses</Text>
              <MBTrendChart
                data={expenseTrend}
                accessibilityLabel={`Expenses by day. Total ${money(data?.totalExpenses)}.`}
                formatValue={money}
              />
            </MBCard>
          ) : null}

          {profitTrend.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Profit</Text>
              <MBTrendChart
                data={profitTrend}
                accessibilityLabel={`Profit by day. Total ${money(data?.totalProfit)}.`}
                formatValue={money}
              />
            </MBCard>
          ) : null}

          {(data?.branchData ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Branches</Text>
              <MBShareList
                accessibilityLabel="Branches by revenue"
                items={(data?.branchData ?? []).map(branch => ({
                  label: `${branch.branchName} · ${branch.totalOrders}`,
                  amount: toNumber(branch.totalRevenue),
                  display: money(branch.totalRevenue),
                }))}
              />
            </MBCard>
          ) : null}

          {(data?.topProducts ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Top products</Text>
              <MBShareList
                accessibilityLabel="Top products by revenue"
                items={(data?.topProducts ?? []).slice(0, 8).map(product => ({
                  label: `${product.productName} · ${formatQty(product.totalQty)}`,
                  amount: toNumber(product.totalRevenue),
                  display: money(product.totalRevenue),
                }))}
              />
            </MBCard>
          ) : null}

          {(data?.paymentMethodBreakdown ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Payment methods</Text>
              <MBShareList
                accessibilityLabel="Revenue by payment method"
                items={(data?.paymentMethodBreakdown ?? []).map(entry => ({
                  label: `${entry.method} · ${entry.count}`,
                  amount: toNumber(entry.total),
                  display: money(entry.total),
                }))}
              />
            </MBCard>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

/** Kept in sync with `LOW_STOCK_THRESHOLD` through `isLowStock`, which owns the rule. */
const LOW_STOCK_LABEL = 5;

function toTrend(day: { date: string; totalRevenue: number }) {
  return { label: day.date, value: toNumber(day.totalRevenue) };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
