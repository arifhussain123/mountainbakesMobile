import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBDataRow,
  MBErrorState,
  MBHeader,
  MBMoney,
  MBPressable,
  MBQuickActions,
  MBShareList,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  MBSyncStatus,
  MBTrendChart,
} from '@/components';
import { useAccessProfile } from '@/hooks/useAccessProfile';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { useStock } from '@/hooks/useCatalog';
import { getReportSummary } from '@/services/api/reportsApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { ReportPeriod } from '@/shared/types/report.types';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatQty, toNumber } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumnWide, layout, space } from '@/theme/spacing';

/**
 * Branch dashboard.
 *
 * Every figure comes from the server's own report calculation — nothing is
 * recomputed here. The server already handles the parts that are easy to get
 * subtly wrong: excluding cancelled orders, excluding unpaid `staff` sales from
 * revenue, and applying the 2 AM business-day boundary to the range.
 */

const PERIODS: ReadonlyArray<{ key: ReportPeriod; label: string }> = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
];

export function BranchDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const branchName = useAuthStore(s => s.claims?.branchName);
  const profile = useAccessProfile();
  const { currencySymbol } = useCatalogSettings();
  const [period, setPeriod] = useState<ReportPeriod>('daily');

  const summary = useQuery({
    // The same key the Reports screen uses, because it is the same request:
    // `qk.reports.summary` keys on the filters and nothing else, so a manager
    // moving between the two screens does not fetch the period twice.
    queryKey: qk.reports.summary({ period }),
    queryFn: () => getReportSummary({ period }),
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

  const data = summary.data;

  /**
   * One trend card serves Daily / Weekly / Monthly: the chips change the range
   * the server buckets, and `dailyData` comes back already bucketed for it.
   * Three separate charts would be the same drawing three times over three
   * queries, and would go stale independently.
   */
  const days = useMemo(() => (data?.dailyData ?? []).slice(-14), [data]);

  const salesTrend = useMemo(
    () => days.map(d => ({ label: d.date, value: toNumber(d.totalRevenue) })),
    [days],
  );

  /**
   * `expenses` is optional on the daily row. Absent is not zero — a day the
   * server did not report on must not be drawn as a day that spent nothing — so
   * the trend is only offered when at least one day actually carries a figure.
   */
  const expenseTrend = useMemo(
    () =>
      days.some(d => d.expenses !== undefined)
        ? days.map(d => ({ label: d.date, value: toNumber(d.expenses ?? 0) }))
        : [],
    [days],
  );

  const productShare = useMemo(
    () =>
      (data?.topProducts ?? []).slice(0, 5).map(p => ({
        label: `${p.productName} · ${formatQty(p.totalQty)}`,
        amount: toNumber(p.totalRevenue),
        display: formatCurrency(toNumber(p.totalRevenue), currencySymbol),
      })),
    [data, currencySymbol],
  );

  const paymentShare = useMemo(
    () =>
      (data?.paymentMethodBreakdown ?? []).map(e => ({
        label: e.method,
        amount: toNumber(e.total),
        display: formatCurrency(toNumber(e.total), currencySymbol),
      })),
    [data, currencySymbol],
  );

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? 'This period';

  /**
   * Stock status, from the branch's own stock rather than the report summary —
   * `/api/reports/summary` carries no stock figures, and stock is the one number
   * on this screen that is about *now* rather than about the period. Branch roles
   * are auto-scoped server-side, so this sends no branchId.
   */
  const stock = useStock();

  const stockStatus = useMemo(() => {
    const rows = stock.data?.rows ?? [];
    if (rows.length === 0) return null;
    const out = rows.filter(r => toNumber(r.balance) <= 0).length;
    return { total: rows.length, out, inStock: rows.length - out };
  }, [stock.data]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Dashboard"
        subtitle={branchName ?? undefined}
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(summary.dataUpdatedAt)}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <View style={styles.chips}>
          {PERIODS.map(option => {
            const selected = option.key === period;
            return (
              <MBPressable
                key={option.key}
                onPress={() => setPeriod(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    {
                      color: selected ? theme.colors.onPrimary : theme.colors.text,
                    },
                  ]}>
                  {option.label}
                </Text>
              </MBPressable>
            );
          })}
        </View>
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
              onRefresh={() => summary.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          <MBStatGrid>
            <MBStatCard
              label="Sales"
              icon="sales"
              value={toNumber(data?.totalRevenue)}
              currencySymbol={currencySymbol}
            />
            <MBStatCard
              label="Expenses"
              icon="expenses"
              value={toNumber(data?.totalExpenses)}
              currencySymbol={currencySymbol}
            />
            <MBStatCard
              label="Profit"
              icon="reports"
              value={toNumber(data?.totalProfit)}
              currencySymbol={currencySymbol}
            />
            <MBStatCard
              label="Orders"
              icon="orders"
              value={toNumber(data?.totalOrders)}
              currency={false}
            />
          </MBStatGrid>

          {/* Above the breakdown, below the figures: read the day's position,
              then get on with it. The row is the reason most people open this
              screen at all. */}
          {profile ? <MBQuickActions profile={profile} /> : null}

          {stockStatus ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Stock status</Text>
              <MBDataRow label="Products on the shelf" value={String(stockStatus.inStock)} />
              <MBDataRow label="Out of stock" value={String(stockStatus.out)} />
              {/* Today's balances, not the selected period: what is on the shelf
                  right now is the only version of this number worth acting on. */}
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {stockStatus.total} tracked today
              </Text>
            </MBCard>
          ) : null}

          {salesTrend.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Sales trend</Text>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {periodLabel}
              </Text>
              <MBTrendChart
                data={salesTrend}
                accessibilityLabel={`Sales trend, ${periodLabel.toLowerCase()}, ${salesTrend.length} days.`}
              />
            </MBCard>
          ) : null}

          {expenseTrend.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Expense trend</Text>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {periodLabel}
              </Text>
              <MBTrendChart
                data={expenseTrend}
                accessibilityLabel={`Expense trend, ${periodLabel.toLowerCase()}, ${expenseTrend.length} days.`}
              />
            </MBCard>
          ) : null}

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Breakdown</Text>
            <MBDataRow
              label="Average order"
              value={<MBMoney value={data?.averageOrderValue} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow
              label="Discount given"
              value={<MBMoney value={data?.totalDiscount} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow label="Pending orders" value={String(toNumber(data?.totalPending))} />
            <MBDataRow label="Cancelled" value={String(toNumber(data?.totalCancelled))} />
            {/* Unpaid staff sales are excluded from revenue and profit by the
                server; shown separately so the numbers reconcile. */}
            {toNumber(data?.staffTotal) > 0 ? (
              <MBDataRow
                label="Staff (unpaid)"
                value={<MBMoney value={data?.staffTotal} size="sm" symbol={currencySymbol} />}
              />
            ) : null}
          </MBCard>

          {productShare.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Top products</Text>
              <MBShareList
                items={productShare}
                accessibilityLabel="Top products by revenue this period"
              />
            </MBCard>
          ) : null}

          {paymentShare.length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Payment methods</Text>
              <MBShareList
                items={paymentShare}
                accessibilityLabel="Takings by payment method this period"
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
  chips: { flexDirection: 'row', gap: space.sm },
  chip: {
    height: layout.chipH,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.snug,
  },
});
