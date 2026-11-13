import { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { format } from 'date-fns';
import {
  getBusinessDate,
  getSalesAnalyticsExportCsv,
  useReportSummary,
  useSalesAnalytics,
  useStockHistoryDay,
  useStockHistorySeries,
  type ReportSummary,
  type SalesAnalytics,
  type StockHistoryDayResponse,
  type StockHistorySeriesResponse,
} from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer, Routes, useTabBarHeight } from '@/navigation';
import { designType, useAppTheme } from '@/shared/theme';
import { AppHeader, type DatePeriod, EmptyState, ErrorState, IconButton, InfoBanner, KpiTile, LoadingSkeleton, Screen, SectionHeader, SegmentedControl, type SegmentedOption } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate, formatDisplayTime, formatPercent } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAuthStore } from '@/state';
import { DailyKpiGrid, HeadingActions, HeroSalesCard, OrdersCard, PaymentMethodsCard, SalesChart, SalesVsExpensesBar, StockDetailTable, StockFlowChart, StockGrid, StockHistoryList, TopSellersCard, type DailyKpiItem, type TopSellersMetric } from '../../components';
import { sharePct } from '../../calculations';
import { getAnalyticsWindow } from '../../utils';
import { styles } from './styles';

const PERIOD_LABEL: Record<DatePeriod, string> = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' };
const PERIOD_TITLE: Record<DatePeriod, string> = { daily: "Today's overview", weekly: "This week's overview", monthly: "This month's overview" };
// The same three periods the old DateFilter offered — `reports/summary?period=` has no others.
const PERIOD_OPTIONS: SegmentedOption<DatePeriod>[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
];
const TOP_SELLERS_OPTIONS: SegmentedOption<TopSellersMetric>[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'qty', label: 'Qty' },
];

/** `Mon 12 Oct 2026` — the title block's eyebrow. */
function eyebrowDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? isoDate : format(d, 'EEE d MMM yyyy');
}

/** "x% of sales", or a plain caption when there are no sales to compare against. */
function shareOfSales(part: number, sales: number, fallback: string): string {
  const pct = sharePct(part, sales);
  return pct === null ? fallback : `${formatPercent(pct, 'shareOfSales')} of sales`;
}

interface DashboardCachePayload {
  summary: ReportSummary;
  analytics: SalesAnalytics;
  stockDay: StockHistoryDayResponse;
  stockHistory: StockHistorySeriesResponse;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function HomeDashboardScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const branchName = useAuthStore((state) => state.user?.branchName ?? undefined);
  const branchId = useAuthStore((state) => state.user?.branchId ?? 'unassigned');
  const [period, setPeriod] = useState<DatePeriod>('daily');
  const [compare, setCompare] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [topMetric, setTopMetric] = useState<TopSellersMetric>('sales');
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { isOffline } = useNetworkStatus();

  const today = useMemo(() => getBusinessDate(), []);
  const window = useMemo(() => getAnalyticsWindow(period, today), [period, today]);

  const summary = useReportSummary(period);
  const analytics = useSalesAnalytics(window.from, window.to, compare);
  const stockDay = useStockHistoryDay(today);
  const stockHistory = useStockHistorySeries(7);

  const isLoading = summary.isLoading || analytics.isLoading || stockDay.isLoading || stockHistory.isLoading;
  const firstError = summary.error ?? analytics.error ?? stockDay.error ?? stockHistory.error;

  const refreshing = summary.isRefetching || analytics.isRefetching || stockDay.isRefetching || stockHistory.isRefetching;
  const onRefresh = () => {
    void summary.refetch();
    void analytics.refetch();
    void stockDay.refetch();
    void stockHistory.refetch();
  };

  // "Branch" (not role) per the shared offline/db.ts comment: one SQLite "last
  // successful response" row per branch+period+date, overwritten on every
  // successful fetch, read back only while offline.
  //
  // `v2`: payloads cached by builds that typed `/sales-analytics` under the
  // wrong field names (`revenue`/`orders`, `totalRevenue`/`totalQty`) are a
  // different shape — read back offline, every one of those fields is
  // `undefined` ("Rs. NaN", "undefined orders"). Bumping the key means an
  // old-shape row is simply never read; it is overwritten/ignored, not parsed.
  const cacheKey = `dashboard:v2:${branchId}:${period}:${today}`;
  const [cached, setCached] = useState<{ data: DashboardCachePayload; updatedAt: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<DashboardCachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  const liveData: DashboardCachePayload | null = useMemo(
    () =>
      summary.data && analytics.data && stockDay.data && stockHistory.data
        ? { summary: summary.data, analytics: analytics.data, stockDay: stockDay.data, stockHistory: stockHistory.data }
        : null,
    [summary.data, analytics.data, stockDay.data, stockHistory.data],
  );

  useEffect(() => {
    if (liveData) void setCachedResponse(cacheKey, liveData);
  }, [cacheKey, liveData]);

  const showingCache = !liveData && isOffline && !!cached;
  const data = liveData ?? (showingCache ? cached!.data : null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await getSalesAnalyticsExportCsv(window.from, window.to);
      await Share.share({ title: `Branch sales ${window.from} to ${window.to}`, message: csv });
    } catch (error) {
      Alert.alert('Export failed', mapErrorToMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const comparison = data?.analytics.comparison;
  const comparisonSub = !compare
    ? 'This period'
    : !comparison
      ? 'Comparing…'
      : comparison.changePct === null
        ? 'No prior period data'
        : `${formatPercent(comparison.changePct, 'comparison.changePct', { signed: true })} vs previous period`;
  const comparisonDot = !compare || !comparison ? theme.colors.secondary : comparison.direction === 'down' ? theme.colors.danger : theme.colors.success;
  const heroComparison =
    compare && comparison && comparison.changePct !== null
      ? { label: `${formatPercent(comparison.changePct, 'comparison.changePct', { signed: true })} vs previous`, direction: comparison.direction }
      : null;
  const lastSeven = data ? data.analytics.daily.slice(-7) : [];
  const lastSevenAverage = lastSeven.length > 0 ? lastSeven.reduce((sum, p) => sum + (Number.isFinite(p.sales) ? p.sales : 0), 0) / lastSeven.length : 0;

  return (
    <Screen>
      {/* The redesign's topbar (logo · "Mountain Bakes" · bell · avatar) is the shared AppHeader's job — kept as is here. */}
      <AppHeader
        title={greeting()}
        subtitle={branchName ?? 'No branch assigned'}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      {showingCache ? (
        <InfoBanner kind="warn" icon="clock" style={styles.offline}>
          {`Last updated ${formatDisplayTime(new Date(cached!.updatedAt).toISOString())} · Offline`}
        </InfoBanner>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: theme.spacing.lg + tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        {/* ── Title block: date eyebrow, "Today's overview", refresh ── */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={[designType.eyebrow, { color: theme.colors.textFaint }]}>{eyebrowDate(today)}</Text>
            <Text accessibilityRole="header" style={[designType.h1, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {PERIOD_TITLE[period]}
            </Text>
          </View>
          <IconButton icon="refresh" accessibilityLabel="Refresh dashboard" onPress={onRefresh} loading={refreshing} />
        </View>

        <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

        {isLoading && !data ? (
          <View style={styles.stack}>
            <LoadingSkeleton height={170} />
            <LoadingSkeleton height={110} />
            <LoadingSkeleton height={190} />
          </View>
        ) : firstError && !data ? (
          <ErrorState message={mapErrorToMessage(firstError)} onRetry={onRefresh} />
        ) : data ? (
          <>
            {/* ── Hero: Sales with Net / Orders / Avg order ── */}
            <HeroSalesCard
              periodLabel={PERIOD_LABEL[period]}
              sales={data.summary.totalRevenue}
              netAmount={data.summary.totalProfit}
              orders={data.summary.totalOrders}
              averageOrder={data.summary.averageOrderValue}
              comparison={heroComparison}
            />

            {/* ── Expenses / Discounts / Returns ── */}
            <View style={styles.grid3}>
              <KpiTile
                index={0}
                label="Expenses"
                value={formatCurrency(data.summary.totalExpenses, 'summary.totalExpenses')}
                sub={shareOfSales(data.summary.totalExpenses, data.summary.totalRevenue, 'logged')}
                dot={theme.colors.danger}
              />
              <KpiTile
                index={1}
                label="Discounts"
                value={formatCurrency(data.summary.totalDiscount, 'summary.totalDiscount')}
                sub={shareOfSales(data.summary.totalDiscount, data.summary.totalRevenue, 'applied')}
                dot={theme.colors.secondary}
              />
              <KpiTile
                index={2}
                label="Returns"
                value={formatCount(data.stockDay.row.returnedQty, 'stockDay.returnedQty')}
                sub={period === 'daily' ? 'units' : 'units today'}
                dot={theme.colors.violet}
              />
            </View>

            {/* ── Last 7 days ── */}
            <SectionHeader title="Last 7 days" linkLabel="Reports" onLinkPress={() => navigation.navigate(Routes.REPORTS_STACK)} />
            {lastSeven.length > 0 ? (
              <SalesChart key={`last7-${period}`} data={lastSeven} average={lastSevenAverage} title={null} hero />
            ) : (
              <EmptyState title="No Sales Yet" message="Sales for the last 7 days will appear here." />
            )}

            {/* ── Top sellers (Sales / Qty) ── */}
            <SectionHeader
              title="Top sellers"
              right={<SegmentedControl options={TOP_SELLERS_OPTIONS} value={topMetric} onChange={setTopMetric} style={styles.smallSeg} />}
            />
            <TopSellersCard products={data.analytics.topProducts} metric={topMetric} />

            {/* ── Payment methods ── */}
            <SectionHeader title="Payment methods" />
            <PaymentMethodsCard methods={data.analytics.paymentMethods} />

            {/* ── Branch stock ── */}
            <SectionHeader title="Branch stock" linkLabel="Open stock" onLinkPress={() => navigation.navigate(Routes.STOCK_TAB)} />
            <StockGrid row={data.stockDay.row} difference={data.stockDay.reconciliation.difference} />
            <Text style={[designType.sm, styles.center, { color: theme.colors.textSecondary }]}>
              Valued at current prices ·{' '}
              {data.stockDay.reconciliation.difference === 0
                ? 'agrees with the Stock page'
                : `${formatCount(data.stockDay.reconciliation.difference, 'reconciliation.difference')} difference vs the Stock page`}
            </Text>

            {/* ── Below the mockup: the app's further sections, restyled to match ── */}
            <SectionHeader title="Sales vs deductions" style={styles.gapTop} />
            <SalesVsExpensesBar
              dayLabel={PERIOD_LABEL[period]}
              sales={data.summary.totalRevenue}
              discounts={data.summary.totalDiscount}
              expenses={data.summary.totalExpenses}
              net={data.summary.totalProfit}
            />

            <SectionHeader
              title="Sales analytics"
              style={styles.gapTop}
              right={<HeadingActions compareActive={compare} onToggleCompare={() => setCompare((v) => !v)} onExport={handleExport} exporting={exporting} />}
            />
            <Text style={[designType.sm, styles.subline, { color: theme.colors.textSecondary }]}>
              {formatDisplayDate(window.from)} – {formatDisplayDate(window.to)} · {branchName ?? 'Branch'}
            </Text>
            <DailyKpiGrid
              kpis={
                [
                  { id: 'today', label: "Today's sales", value: formatCurrency(data.analytics.todaySales, 'analytics.todaySales'), sub: 'As of now', dot: theme.colors.primary },
                  { id: 'total', label: 'Total sales', value: formatCurrency(data.analytics.totalSales, 'analytics.totalSales'), sub: comparisonSub, dot: comparisonDot },
                  { id: 'transactions', label: 'Transactions', value: formatCount(data.analytics.totalTransactions, 'analytics.totalTransactions'), sub: 'This period', dot: theme.colors.info },
                  { id: 'average', label: 'Avg daily', value: formatCurrency(data.analytics.averageDailySales, 'analytics.averageDailySales'), sub: 'Per day', dot: theme.colors.success },
                  {
                    id: 'highest',
                    label: 'Highest day',
                    value: data.analytics.highestDay ? formatCurrency(data.analytics.highestDay.sales, 'analytics.highestDay.sales') : '—',
                    sub: data.analytics.highestDay ? formatDisplayDate(data.analytics.highestDay.date) : 'No data',
                    dot: theme.colors.violet,
                  },
                  {
                    id: 'lowest',
                    label: 'Lowest day',
                    value: data.analytics.lowestDay ? formatCurrency(data.analytics.lowestDay.sales, 'analytics.lowestDay.sales') : '—',
                    sub: data.analytics.lowestDay ? formatDisplayDate(data.analytics.lowestDay.date) : 'No data',
                    dot: theme.colors.danger,
                  },
                ] as DailyKpiItem[]
              }
            />
            {/* Today's window IS the last 7 days (charted above); Week/Month chart their whole window here. */}
            {period !== 'daily' ? (
              data.analytics.daily.length > 0 ? (
                <SalesChart key={`window-${period}`} data={data.analytics.daily} average={data.analytics.averageDailySales} />
              ) : (
                <EmptyState title="No Sales Yet" message="Sales for this period will appear here." />
              )
            ) : null}

            <SectionHeader title="Orders" style={styles.gapTop} />
            <OrdersCard total={data.summary.totalOrders} pending={data.summary.totalPending} cancelled={data.summary.totalCancelled} />

            <SectionHeader title="Stock detail" style={styles.gapTop} />
            <StockFlowChart row={data.stockDay.row} />
            <StockDetailTable
              row={data.stockDay.row}
              date={today}
              agrees={data.stockDay.reconciliation.difference === 0}
              unexplained={data.stockDay.reconciliation.unexplained}
            />

            <SectionHeader title="Stock history · 7 days" style={styles.gapTop} />
            <Text style={[designType.sm, styles.subline, { color: theme.colors.textSecondary }]}>Sold is valued at current prices, not the till total.</Text>
            {data.stockHistory.rows.length > 0 ? (
              // Newest first (today at the top), regardless of what order the server returns —
              // sorted explicitly by date rather than assuming/flipping a particular server order.
              <StockHistoryList rows={[...data.stockHistory.rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))} />
            ) : (
              <EmptyState title="No Stock History" message="Stock movements for the last 7 days will appear here." />
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
