import { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
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
import { useThemeToggleAction } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer, useTabBarHeight } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, DateFilter, type DatePeriod, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAuthStore } from '@/state';
import {
  DailyKpiGrid,
  HeadingActions,
  HeroSalesCard,
  LabeledListCard,
  OrdersCard,
  PaymentMethodsCard,
  SalesChart,
  SalesVsExpensesBar,
  SectionHeading,
  StockDetailTable,
  StockFlowChart,
  StockGrid,
  StockHistoryList,
  TopProductsBars,
  type DailyKpiItem,
  type LabeledListRow,
} from '../../components';
import { getAnalyticsWindow } from '../../utils';
import { styles } from './styles';

const PERIOD_LABEL: Record<DatePeriod, string> = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' };

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
  const themeToggleAction = useThemeToggleAction();
  const bellAction = useNotificationBellAction();
  const branchName = useAuthStore((state) => state.user?.branchName ?? undefined);
  const branchId = useAuthStore((state) => state.user?.branchId ?? 'unassigned');
  const [period, setPeriod] = useState<DatePeriod>('daily');
  const [compare, setCompare] = useState(false);
  const [exporting, setExporting] = useState(false);
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
  const cacheKey = `dashboard:${branchId}:${period}:${today}`;
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
        : `${comparison.changePct >= 0 ? '+' : ''}${comparison.changePct.toFixed(1)}% vs previous period`;
  const comparisonDot = !compare || !comparison ? theme.colors.secondary : comparison.direction === 'down' ? theme.colors.danger : theme.colors.success;

  return (
    <Screen>
      <AppHeader
        title={greeting()}
        subtitle={branchName ?? 'No branch assigned'}
        actions={[bellAction, themeToggleAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      {showingCache ? (
        <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())} · Offline
          </Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, paddingBottom: theme.spacing.lg + tabBarHeight }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <DateFilter value={period} onChange={setPeriod} />

        {isLoading && !data ? (
          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={160} />
          </View>
        ) : firstError && !data ? (
          <ErrorState message={mapErrorToMessage(firstError)} onRetry={onRefresh} />
        ) : data ? (
          <>
            {/* ── Hero Sales card (design lines 107-113) ── */}
            <View style={styles.section}>
              <HeroSalesCard
                periodLabel={PERIOD_LABEL[period]}
                salesSub={`${data.summary.totalOrders} orders`}
                sales={data.summary.totalRevenue}
                netAmount={data.summary.totalProfit}
                orders={data.summary.totalOrders}
                pending={data.summary.totalPending}
                cancelled={data.summary.totalCancelled}
              />
            </View>

            {/* ── Deductions · Today (design lines 114-117) ── */}
            <View style={styles.section}>
              <LabeledListCard
                title="Deductions · Today"
                emptyMessage="No deductions recorded for this period."
                rows={(
                  [
                    data.summary.totalDiscount > 0
                      ? { id: 'discounts', label: 'Discounts', sub: 'Applied today', value: formatCurrency(data.summary.totalDiscount), color: theme.colors.danger }
                      : null,
                    data.summary.totalExpenses > 0
                      ? { id: 'expenses', label: 'Expenses', sub: 'Logged today', value: formatCurrency(data.summary.totalExpenses), color: theme.colors.danger }
                      : null,
                  ].filter(Boolean) as LabeledListRow[]
                )}
              />
            </View>

            {/* ── Last 7 Days (design lines 118-121) ── */}
            <View style={styles.section}>
              <LabeledListCard
                title="Last 7 Days"
                emptyMessage="Sales for the last 7 days will appear here."
                rows={data.analytics.daily.slice(-7).map(
                  (point): LabeledListRow => ({
                    id: point.date,
                    label: formatDisplayDate(point.date),
                    sub: `${point.transactions} orders`,
                    value: formatCurrency(point.sales),
                  }),
                )}
              />
            </View>

            {/* ── Sales vs Deductions (design lines 122-128) ── */}
            <View style={styles.section}>
              <SalesVsExpensesBar
                dayLabel={formatDisplayDate(today)}
                sales={data.summary.totalRevenue}
                discounts={data.summary.totalDiscount}
                expenses={data.summary.totalExpenses}
                net={data.summary.totalProfit}
              />
            </View>

            {/* ── Daily Sales (design lines 130-152) ── */}
            <SectionHeading
              text="Daily"
              accent="Sales"
              right={<HeadingActions compareActive={compare} onToggleCompare={() => setCompare((v) => !v)} onExport={handleExport} exporting={exporting} />}
            />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              {formatDisplayDate(window.from)} – {formatDisplayDate(window.to)} · {branchName ?? 'Branch'}
            </Text>

            <View style={styles.section}>
              <DailyKpiGrid
                kpis={(
                  [
                    { id: 'today', label: "Today's Sales", value: formatCurrency(data.analytics.todaySales), sub: 'As of now', dot: theme.colors.primary },
                    { id: 'total', label: 'Total Sales', value: formatCurrency(data.analytics.totalSales), sub: comparisonSub, dot: comparisonDot },
                    { id: 'transactions', label: 'Transactions', value: String(data.analytics.totalTransactions), sub: 'This period', dot: theme.colors.info },
                    { id: 'average', label: 'Avg Daily', value: formatCurrency(data.analytics.averageDailySales), sub: 'Per day', dot: theme.colors.success },
                    {
                      id: 'highest',
                      label: 'Highest Day',
                      value: data.analytics.highestDay ? formatCurrency(data.analytics.highestDay.sales) : '—',
                      sub: data.analytics.highestDay ? formatDisplayDate(data.analytics.highestDay.date) : 'No data',
                      dot: theme.colors.violet,
                    },
                    {
                      id: 'lowest',
                      label: 'Lowest Day',
                      value: data.analytics.lowestDay ? formatCurrency(data.analytics.lowestDay.sales) : '—',
                      sub: data.analytics.lowestDay ? formatDisplayDate(data.analytics.lowestDay.date) : 'No data',
                      dot: theme.colors.danger,
                    },
                  ] as DailyKpiItem[]
                )}
              />
            </View>

            <View style={styles.section}>
              {data.analytics.daily.length > 0 ? (
                <SalesChart data={data.analytics.daily} average={data.analytics.averageDailySales} />
              ) : (
                <EmptyState title="No Sales Yet" message="Sales for this period will appear here." />
              )}
            </View>

            <View style={styles.section}>
              <TopProductsBars products={data.analytics.topProducts} />
            </View>

            {/* ── Orders Today (design lines 154-166) ── */}
            <SectionHeading text="Orders" accent="Today" />
            <View style={styles.section}>
              <OrdersCard total={data.summary.totalOrders} pending={data.summary.totalPending} cancelled={data.summary.totalCancelled} />
            </View>

            <View style={styles.section}>
              <PaymentMethodsCard methods={data.analytics.paymentMethods} />
            </View>

            {/* ── Branch Stock (design lines 168-187) ── */}
            <SectionHeading text="Branch" accent="Stock" />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              Valued at current prices · {formatDisplayDate(today)}
            </Text>

            <View style={styles.section}>
              <StockGrid row={data.stockDay.row} difference={data.stockDay.reconciliation.difference} />
            </View>

            <View style={styles.section}>
              <StockFlowChart row={data.stockDay.row} />
            </View>

            <View style={styles.section}>
              <StockDetailTable
                row={data.stockDay.row}
                date={today}
                agrees={data.stockDay.reconciliation.difference === 0}
                unexplained={data.stockDay.reconciliation.unexplained}
              />
            </View>

            {/* ── Stock History 7 Days (design lines 189-201) ── */}
            <SectionHeading text="Stock History" accent="7 Days" />
            <Text
              style={[
                theme.typography.bodySmall,
                { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
              ]}>
              Sold is valued at current prices, not the till total.
            </Text>
            <View style={styles.section}>
              {data.stockHistory.rows.length > 0 ? (
                // Newest first (today at the top), regardless of what order the server returns —
                // sorted explicitly by date rather than assuming/flipping a particular server order.
                <StockHistoryList rows={[...data.stockHistory.rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))} />
              ) : (
                <EmptyState title="No Stock History" message="Stock movements for the last 7 days will appear here." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
