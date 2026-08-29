import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import {
  MBAccountButton,
  MBBudgetCard,
  MBCard,
  MBColumnChart,
  MBDataRow,
  MBDateStepper,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBLedgerTable,
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
} from '@/common/ui';
import type { LedgerColumn, LedgerRow } from '@/common/ui';
import { LoginHistoryCard } from '@/features/branch/components';
import { useAccessProfile } from '@/common/hooks/useAccessProfile';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { getReportSummary } from '@/api/services/reportsService';
import { getBranchStockDay } from '@/api/services/stockHistoryService';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import type { ReportPeriod, ReportSummary } from '@/shared/types/report.types';
import {
  businessDateStr,
  businessDaysAgoStr,
  karachiMinutesOfDay,
} from '@/shared/utils/timezone';
import { useAuthStore } from '@/state/authStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { formatCurrency, formatQty, round2, toNumber } from '@/common/utils/money';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { contentColumnWide, space } from '@/common/theme/spacing';

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

/**
 * Stock detail columns.
 *
 * Three, and the movement name is one of them rather than a `heading`: unlike
 * the ledger's day rows, these lines all belong to ONE day, so the name is a
 * column and the date is the card's subtitle.
 */
const STOCK_DETAIL_COLUMNS: readonly LedgerColumn[] = [
  { key: 'movement', title: 'Movement', align: 'left' },
  { key: 'qty', title: 'Qty', align: 'right' },
  { key: 'value', title: 'Value', align: 'right' },
];

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

/**
 * v5's greeting, on the shop's clock rather than the phone's.
 *
 * `karachiMinutesOfDay` and not the device hour: a branch phone left on a
 * travelling user's timezone would otherwise say "Good Evening" to a morning
 * shift. Every other clock this app shows is the Karachi one, and a greeting
 * that disagreed with the business date beside it would be the odd one out.
 *
 * The boundaries are the shop's, not the calendar's — the day rolls at 02:00,
 * so the small hours belong to the evening shift that is still working.
 */
function greetingFor(minutes: number): string {
  if (minutes < 120) return 'Good Evening';
  if (minutes < 12 * 60) return 'Good Morning';
  if (minutes < 17 * 60) return 'Good Afternoon';
  return 'Good Evening';
}

export function BranchDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
  const branchName = useAuthStore(s => s.claims?.branchName);
  const greeting = useMemo(() => greetingFor(karachiMinutesOfDay()), []);
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
   * Stock detail — one chosen business day, with its own date and its own query.
   *
   * Deliberately separate from `stockDay` above rather than a date on it. That
   * one answers "what is on the shelf now" and must not move when a control is
   * touched; this one answers "what moved on the day I picked". Same route, two
   * questions, and collapsing them would make the strip at the top of the screen
   * change meaning when someone stepped the date down here.
   *
   * When the two dates coincide they share a query key, so this costs no extra
   * request on first load — TanStack dedupes them.
   */
  const [detailDate, setDetailDate] = useState(today);
  const stockDetail = useQuery({
    queryKey: qk.stock.day(null, detailDate),
    queryFn: () => getBranchStockDay({ date: detailDate }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  /** The ledger only walks back a year; stop the arrow rather than let it error. */
  const detailMinDate = useMemo(() => businessDaysAgoStr(364), []);

  /**
   * The day's movement as lines.
   *
   * `balanceQty` is the SERVER's closing figure, printed rather than derived.
   * The row reconciles as `opening + new − sold − returned + adjustment`, and
   * recomputing it here would put a second answer on the screen that disagrees
   * with the ledger the moment an adjustment lands late — the branch would be
   * reading a balance nobody else has.
   */
  const stockLines: readonly LedgerRow[] = useMemo(() => {
    const row = stockDetail.data?.row;
    if (!row) return [];
    const line = (
      key: string,
      label: string,
      qty: number,
      amount: number,
      tone?: 'muted' | 'success' | 'danger' | 'warning',
    ): LedgerRow => ({
      key,
      cells: [
        { value: label, tone: 'muted' },
        { value: formatQty(qty), ...(tone ? { tone } : {}) },
        { value: formatCurrency(amount, currencySymbol), tone: 'muted' },
      ],
    });
    return [
      line('opening', 'Opening', row.openingQty, row.openingAmount),
      line('new', 'Added', row.newQty, row.newAmount, 'success'),
      line('sold', 'Sold', row.soldQty, row.soldAmount, 'danger'),
      line('returned', 'Returned', row.returnedQty, row.returnedAmount, 'warning'),
      line('adjustment', 'Adjustment', row.adjustmentQty, row.adjustmentAmount),
      line('balance', 'Balance', row.balanceQty, row.balanceAmount),
    ];
  }, [stockDetail.data, currencySymbol]);

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

  /**
   * Sales against expenses, paired per day.
   *
   * Seven days, not the fourteen the trends use, and that is the component's own
   * constraint rather than a preference: `MBColumnChart` draws real views and
   * warns that a 360dp phone cannot carry many columns per group. Two series
   * across fourteen groups is twenty-eight bars, at which point each is a tick.
   *
   * Gated on the same condition as `expenseTrend` — absent is not zero. A paired
   * chart is worse than a missing one here: a day the server did not report on
   * would draw a full sales column beside an empty expense column, which reads
   * as a day that took money and spent nothing.
   */
  const salesVsExpenses = useMemo(() => {
    const recent = days.slice(-7);
    if (!recent.some(d => d.expenses !== undefined)) return [];
    return recent.map(d => ({
      label: formatBusinessDate(d.date),
      values: [toNumber(d.totalRevenue), toNumber(d.expenses ?? 0)] as const,
    }));
  }, [days]);

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
        leading={<MBAccountButton tone="brand" />}
        tone="brand"
        overline={greeting}
        title={branchName ?? 'Dashboard'}
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
            {/* Discounts as a tile as well as a Breakdown row, because it is one
                of the five figures the branch is measured on — and captioned
                with the one thing that stops it being read twice: the server has
                ALREADY taken it off `totalRevenue`, so Sales above is net of
                this. Subtracting it again to reach "net" is the mistake the
                caption exists to prevent. */}
            <MBStatCard
              label="Discounts"
              icon="expenses"
              tone="warning"
              value={toNumber(data?.totalDiscount)}
              currencySymbol={currencySymbol}
              subtitle="Already off Sales"
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
                  formatValue={v => formatCurrency(v, currencySymbol)}
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
                  formatValue={v => formatCurrency(v, currencySymbol)}
                />
              </MBCard>
            </>
          ) : null}

          {/* 6 — One day's movement, on a date of its own. */}
          <MBSectionHeader
            title="Stock detail"
            subtitle="Movement on a single business day"
          />
          <MBCard>
            <MBDateStepper
              value={detailDate}
              onChange={setDetailDate}
              minDate={detailMinDate}
              testID="stock-detail-date"
            />
            {stockDetail.isPending ? (
              <MBSkeletonList rows={3} />
            ) : stockDetail.isError ? (
              /* A date the ledger cannot reach comes back as an error naming
                 the reason. Shown, not swallowed: "nothing moved that day" and
                 "we cannot get back that far" are both a table of zeroes if the
                 failure is hidden. */
              <MBErrorState
                error={stockDetail.error}
                onRetry={() => {
                  stockDetail.refetch();
                }}
                retrying={stockDetail.isFetching}
              />
            ) : (
              <MBLedgerTable
                columns={STOCK_DETAIL_COLUMNS}
                rows={stockLines}
                testID="stock-detail-table"
              />
            )}
          </MBCard>

          {salesVsExpenses.length > 0 ? (
            <>
              <MBSectionHeader title="Sales vs expenses" subtitle="Last 7 days" />
              <MBCard>
                <MBColumnChart
                  series={['Sales', 'Expenses']}
                  groups={salesVsExpenses}
                  accessibilityLabel={`Sales against expenses over the last ${salesVsExpenses.length} days.`}
                  formatValue={v => formatCurrency(v, currencySymbol)}
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

          {/* Last, and deliberately so. It is the only card on this screen that
              is not about the shop's trading — it answers "was that me?" rather
              than "how did we do?" — so it sits below everything a manager opens
              the dashboard to read. It also loads on its own query and cannot
              blank the page if that fails. */}
          <LoginHistoryCard />
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
