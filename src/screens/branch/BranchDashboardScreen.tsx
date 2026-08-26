import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import {
  MBAccountButton,
  MBBudgetCard,
  MBCard,
  MBDataRow,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBMoney,
  MBPressable,
  MBQuickActions,
  MBSectionHeader,
  MBShareList,
  MBSkeletonList,
  MBStatCard,
  MBStatScroller,
  MBStockSummaryCard,
  MBSyncStatus,
  MBTrendChart,
} from '@/components';
import { useAccessProfile } from '@/hooks/useAccessProfile';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getReportSummary } from '@/services/api/reportsApi';
import { getBranchStockDay } from '@/services/api/stockHistoryApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { ReportPeriod, ReportSummary } from '@/shared/types/report.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatBusinessDate } from '@/utils/businessDay';
import { formatCurrency, formatQty, round2, toNumber } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumnWide, space } from '@/theme/spacing';

/**
 * Branch dashboard.
 *
 * Every figure comes from the server's own report calculation — nothing is
 * recomputed here. The server already handles the parts that are easy to get
 * subtly wrong: excluding cancelled orders, excluding unpaid `staff` sales from
 * revenue, and applying the 2 AM business-day boundary to the range.
 *
 * ---------------------------------------------------------------------------
 * The order of this screen is v5's, and the order is the design
 * ---------------------------------------------------------------------------
 * Date filter → summary → orders → quick actions → budget → stock → charts.
 * It descends from *what happened* to *what to do about it* to *how it compares*,
 * and the quick actions sit at the hinge: high enough that a shift never scrolls
 * to reach them, low enough that the day's position is read first. The charts
 * are last because they are the part nobody opens the app for.
 *
 * Two things v5 draws are deliberately absent:
 *
 * - **The notification bell in the header.** There is no inbox endpoint — the
 *   server writes `notifications` rows and mounts no route that reads them — so
 *   the bell would open a placeholder and its badge would count nothing. It is
 *   also a third trailing control, which `MBHeader` documents as the thing that
 *   squeezes the title out on a narrow phone.
 * - **A separate "Net amount" summary card.** Net is Sales − Expenses and both
 *   are on screen beside it; the server's own `totalProfit` is a different
 *   figure (it carries cost of goods), so a card labelled Net showing profit
 *   would be a third number that reconciles with neither. Profit is reported
 *   under its own name in Breakdown.
 */

const PERIODS: ReadonlyArray<{ key: ReportPeriod; label: string }> = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
];

/**
 * Which budget figure the chosen period is measured against.
 *
 * `BudgetSummary` carries all three; the card shows one, and it has to be the
 * one matching the range the actual came from — comparing a week's takings to a
 * daily allowance is a card that is always red.
 *
 * Returns `null` rather than `0` when the field is absent or unset. **Absent is
 * not zero**: a branch with no budget and a server too old to report one are
 * different states, and neither of them means "you have spent your whole
 * allowance". The card is not drawn at all in that case.
 */
export function budgetForPeriod(
  summary: ReportSummary | undefined,
  period: ReportPeriod,
): number | null {
  const budget = summary?.budget;
  if (!budget) return null;
  const value =
    period === 'daily' ? budget.daily : period === 'weekly' ? budget.weekly : budget.monthly;
  const amount = toNumber(value);
  return amount > 0 ? amount : null;
}

export function BranchDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
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
   * Today's ledger row, for the stock strip.
   *
   * **Today's, not the selected period's.** The chips above choose a range for
   * the money figures; what is on the shelf is a fact about now, and a stock
   * strip that changed when someone picked "This month" would be reporting a
   * balance nobody can go and count. A branch role sends no `branchId` — the
   * server scopes it from the JWT.
   */
  const today = businessDateStr();
  const stockDay = useQuery({
    queryKey: qk.stock.day(null, today),
    queryFn: () => getBranchStockDay({ date: today }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  /**
   * One trend card serves Daily / Weekly / Monthly: the chips change the range
   * the server buckets, and `dailyData` comes back already bucketed for it.
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
  const budget = budgetForPeriod(data, period);

  /**
   * Net, computed here and labelled as what it is.
   *
   * Sales minus expenses, which is a figure the server does not return under
   * that name — `totalProfit` carries cost of goods as well and is a different
   * number. Subtracting two figures already on screen is safe; relabelling one
   * of them would not be.
   */
  const net = round2(toNumber(data?.totalRevenue) - toNumber(data?.totalExpenses));

  const orderCounts = useMemo(
    () => [
      { label: 'Total', value: toNumber(data?.totalOrders), tone: theme.colors.text },
      { label: 'Pending', value: toNumber(data?.totalPending), tone: theme.colors.warning },
      {
        label: 'Done',
        value: Math.max(
          0,
          toNumber(data?.totalOrders) -
            toNumber(data?.totalPending) -
            toNumber(data?.totalCancelled),
        ),
        tone: theme.colors.success,
      },
      { label: 'Cancelled', value: toNumber(data?.totalCancelled), tone: theme.colors.danger },
    ],
    [data, theme.colors],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Dashboard"
        subtitle={branchName ?? undefined}
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(summary.dataUpdatedAt)}
      />

      {/* v5's date filter: the range chips, and under them the business date the
          server actually answered about. The date is not decoration — the day
          rolls at 02:00, so a shift working past midnight is looking at
          yesterday's date on purpose and needs to see which one. */}
      <View style={{ paddingHorizontal: theme.layout.screenPad, paddingBottom: theme.space.sm }}>
        <MBFilterChips
          options={PERIODS.map(p => ({ key: p.key, label: p.label }))}
          selectedKey={period}
          onSelect={key => setPeriod(key as ReportPeriod)}
          testIDPrefix="dashboard-period"
        />
        <Text
          style={[
            theme.type.caption,
            { color: theme.colors.textMuted, paddingTop: theme.space.xs },
          ]}>
          {data ? rangeLabel(data) : formatBusinessDate(today)}
        </Text>
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
          /* Wide cap, not the single-column one: the summary row and the stock
             strip are genuinely several measures side by side, and capping at
             640 would leave a tablet showing a phone's layout in the middle of
             the screen. */
          contentContainerStyle={[
            contentColumnWide,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={summary.isFetching && !summary.isPending}
              onRefresh={() => {
                summary.refetch();
                stockDay.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }>
          {/* 1 — Summary. Three wide cards rather than a 2×2 block, because each
              carries a figure AND the line that qualifies it. */}
          <MBStatScroller accessibilityLabel={`Summary for ${periodLabel.toLowerCase()}`}>
            <MBStatCard
              label="Sales"
              icon="sales"
              tone="success"
              value={toNumber(data?.totalRevenue)}
              currencySymbol={currencySymbol}
              subtitle={periodLabel}
            />
            <MBStatCard
              label="Expenses"
              icon="expenses"
              tone="danger"
              value={toNumber(data?.totalExpenses)}
              currencySymbol={currencySymbol}
              /* v5 puts a count here ("6 entries today"). `/api/reports/summary`
                 returns the expense TOTAL and no count, so the tile says which
                 range it covers instead of inventing a number. */
              subtitle={periodLabel}
            />
            <MBStatCard
              label="Net"
              icon="reports"
              tone="info"
              value={net}
              currencySymbol={currencySymbol}
              subtitle="Sales less expenses"
            />
          </MBStatScroller>

          {/* 2 — Orders, with a way through to the list. */}
          <MBCard>
            <View style={styles.cardHead}>
              <Text style={[theme.type.cardTitle, { color: theme.colors.text }]}>Orders</Text>
              <MBPressable
                onPress={() => navigation.navigate('Orders')}
                accessibilityRole="link"
                accessibilityLabel="View all orders"
                feedback="opacity"
                testID="dashboard-view-orders">
                <Text style={[theme.type.label, { color: theme.colors.accent }]}>View all</Text>
              </MBPressable>
            </View>
            <View style={[styles.counts, { paddingTop: theme.space.md, gap: theme.space.sm }]}>
              {orderCounts.map(count => (
                <View key={count.label} style={[styles.count, { gap: theme.space.hair }]}>
                  <Text style={[theme.type.money, { color: count.tone }]}>
                    {formatQty(count.value)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                    {count.label}
                  </Text>
                </View>
              ))}
            </View>
          </MBCard>

          {/* 3 — The row the screen exists for. High enough that a shift never
              scrolls to reach it, low enough that the day is read first. */}
          {profile ? <MBQuickActions profile={profile} /> : null}

          {/* 4 — Budget. Only when the server actually reported one: absent is
              not zero, and a full bar over a branch with no budget set is the
              worst possible reading of no data. */}
          {budget !== null ? (
            <MBBudgetCard
              budget={budget}
              actual={toNumber(data?.totalRevenue)}
              periodLabel={periodLabel}
              currencySymbol={currencySymbol}
              testID="budget-card"
            />
          ) : null}

          {/* 5 — Today's shelf. Not the selected period's; see the query. */}
          {stockDay.data ? (
            <MBStockSummaryCard
              row={stockDay.data.row}
              currencySymbol={currencySymbol}
              onPress={() => navigation.navigate('Stock', { screen: 'StockDay' })}
              testID="stock-summary"
            />
          ) : null}

          {/* 6 — The charts, last. */}
          {salesTrend.length > 0 ? (
            <>
              <MBSectionHeader title="Sales trend" subtitle={periodLabel} />
              <MBCard>
                <MBTrendChart
                  data={salesTrend}
                  accessibilityLabel={`Sales trend, ${periodLabel.toLowerCase()}, ${salesTrend.length} days.`}
                />
              </MBCard>
            </>
          ) : null}

          {expenseTrend.length > 0 ? (
            <>
              <MBSectionHeader title="Expense trend" subtitle={periodLabel} />
              <MBCard>
                <MBTrendChart
                  data={expenseTrend}
                  accessibilityLabel={`Expense trend, ${periodLabel.toLowerCase()}, ${expenseTrend.length} days.`}
                />
              </MBCard>
            </>
          ) : null}

          {productShare.length > 0 ? (
            <>
              <MBSectionHeader title="Top products" />
              <MBCard>
                <MBShareList
                  items={productShare}
                  accessibilityLabel="Top products by revenue this period"
                />
              </MBCard>
            </>
          ) : null}

          {paymentShare.length > 0 ? (
            <>
              <MBSectionHeader title="Payment methods" />
              <MBCard>
                <MBShareList
                  items={paymentShare}
                  accessibilityLabel="Takings by payment method this period"
                />
              </MBCard>
            </>
          ) : null}

          <MBSectionHeader title="Breakdown" />
          <MBCard>
            <MBDataRow
              label="Average order"
              value={<MBMoney value={data?.averageOrderValue} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow
              label="Discount given"
              value={<MBMoney value={data?.totalDiscount} size="sm" symbol={currencySymbol} />}
            />
            {/* Profit under its own name, and not on the summary row above: it
                carries cost of goods, so it is not Sales less Expenses and must
                never be shown as though it were. */}
            <MBDataRow
              label="Profit"
              value={<MBMoney value={data?.totalProfit} size="sm" symbol={currencySymbol} />}
            />
            {/* Unpaid staff sales are excluded from revenue and profit by the
                server; shown separately so the numbers reconcile. */}
            {toNumber(data?.staffTotal) > 0 ? (
              <MBDataRow
                label="Staff (unpaid)"
                value={<MBMoney value={data?.staffTotal} size="sm" symbol={currencySymbol} />}
              />
            ) : null}
          </MBCard>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * The business dates the answer actually covers.
 *
 * From the server's own `from`/`to` rather than recomputed here — the range for
 * a named period is `getDateRange()`'s to decide, and a client that worked out
 * its own "this week" would eventually disagree with the figures printed beside
 * it.
 */
function rangeLabel(summary: ReportSummary): string {
  const from = summary.from.slice(0, 10);
  const to = summary.to.slice(0, 10);
  return from === to
    ? formatBusinessDate(from)
    : `${formatBusinessDate(from)} – ${formatBusinessDate(to)}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  counts: { flexDirection: 'row' },
  count: { flex: 1, alignItems: 'center' },
});
