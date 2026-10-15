import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { getBusinessDate, useReportSummary, useSalesAnalytics, useStockHistoryDay, useStockHistorySeries } from '@/api';
import { openComingSoon, openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, DateFilter, type DatePeriod, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import {
  DailyKpiGrid,
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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function HomeDashboardScreen() {
  const theme = useAppTheme();
  const branchName = useAuthStore((state) => state.user?.branchName ?? undefined);
  const [period, setPeriod] = useState<DatePeriod>('daily');

  const today = useMemo(() => getBusinessDate(), []);
  const window = useMemo(() => getAnalyticsWindow(period, today), [period, today]);

  const summary = useReportSummary(period);
  const analytics = useSalesAnalytics(window.from, window.to);
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

  return (
    <Screen>
      <AppHeader
        title={greeting()}
        subtitle={branchName ?? 'No branch assigned'}
        actions={[
          { icon: 'bell', onPress: () => openComingSoon('Notifications'), accessibilityLabel: 'Notifications' },
          { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' },
        ]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <DateFilter value={period} onChange={setPeriod} />

        {isLoading ? (
          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={160} />
          </View>
        ) : firstError ? (
          <ErrorState message={mapErrorToMessage(firstError)} onRetry={onRefresh} />
        ) : summary.data && analytics.data && stockDay.data && stockHistory.data ? (
          <>
            {/* ── Hero Sales card (design lines 107-113) ── */}
            <View style={styles.section}>
              <HeroSalesCard
                periodLabel={PERIOD_LABEL[period]}
                salesSub={`${summary.data.totalOrders} orders`}
                sales={summary.data.totalRevenue}
                netAmount={summary.data.totalProfit}
                orders={summary.data.totalOrders}
                pending={summary.data.totalPending}
                cancelled={summary.data.totalCancelled}
              />
            </View>

            {/* ── Deductions · Today (design lines 114-117) ── */}
            <View style={styles.section}>
              <LabeledListCard
                title="Deductions · Today"
                emptyMessage="No deductions recorded for this period."
                rows={(
                  [
                    summary.data.totalDiscount > 0
                      ? { id: 'discounts', label: 'Discounts', sub: 'Applied today', value: formatCurrency(summary.data.totalDiscount), color: theme.colors.danger }
                      : null,
                    summary.data.totalExpenses > 0
                      ? { id: 'expenses', label: 'Expenses', sub: 'Logged today', value: formatCurrency(summary.data.totalExpenses), color: theme.colors.danger }
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
                rows={analytics.data.daily.slice(-7).map(
                  (point): LabeledListRow => ({
                    id: point.date,
                    label: formatDisplayDate(point.date),
                    sub: `${point.orders} orders`,
                    value: formatCurrency(point.revenue),
                  }),
                )}
              />
            </View>

            {/* ── Sales vs Deductions (design lines 122-128) ── */}
            <View style={styles.section}>
              <SalesVsExpensesBar
                dayLabel={formatDisplayDate(today)}
                sales={summary.data.totalRevenue}
                discounts={summary.data.totalDiscount}
                expenses={summary.data.totalExpenses}
                net={summary.data.totalProfit}
              />
            </View>

            {/* ── Daily Sales (design lines 130-152) ── */}
            <SectionHeading text="Daily" accent="Sales" />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              {formatDisplayDate(window.from)} – {formatDisplayDate(window.to)} · {branchName ?? 'Branch'}
            </Text>

            <View style={styles.section}>
              <DailyKpiGrid
                kpis={(
                  [
                    { id: 'today', label: "Today's Sales", value: formatCurrency(analytics.data.todaySales), sub: 'As of now', dot: theme.colors.primary },
                    { id: 'total', label: 'Total Sales', value: formatCurrency(analytics.data.totalSales), sub: 'This period', dot: theme.colors.secondary },
                    { id: 'transactions', label: 'Transactions', value: String(analytics.data.totalTransactions), sub: 'This period', dot: theme.colors.info },
                    { id: 'average', label: 'Avg Daily', value: formatCurrency(analytics.data.averageDailySales), sub: 'Per day', dot: theme.colors.success },
                    {
                      id: 'highest',
                      label: 'Highest Day',
                      value: analytics.data.highestDay ? formatCurrency(analytics.data.highestDay.revenue) : '—',
                      sub: analytics.data.highestDay ? formatDisplayDate(analytics.data.highestDay.date) : 'No data',
                      dot: theme.colors.violet,
                    },
                    {
                      id: 'lowest',
                      label: 'Lowest Day',
                      value: analytics.data.lowestDay ? formatCurrency(analytics.data.lowestDay.revenue) : '—',
                      sub: analytics.data.lowestDay ? formatDisplayDate(analytics.data.lowestDay.date) : 'No data',
                      dot: theme.colors.danger,
                    },
                  ] as DailyKpiItem[]
                )}
              />
            </View>

            <View style={styles.section}>
              {analytics.data.daily.length > 0 ? (
                <SalesChart data={analytics.data.daily} />
              ) : (
                <EmptyState title="No Sales Yet" message="Sales for this period will appear here." />
              )}
            </View>

            <View style={styles.section}>
              <TopProductsBars products={analytics.data.topProducts} />
            </View>

            {/* ── Orders Today (design lines 154-166) ── */}
            <SectionHeading text="Orders" accent="Today" />
            <View style={styles.section}>
              <OrdersCard total={summary.data.totalOrders} pending={summary.data.totalPending} cancelled={summary.data.totalCancelled} />
            </View>

            <View style={styles.section}>
              <PaymentMethodsCard methods={analytics.data.paymentMethods} />
            </View>

            {/* ── Branch Stock (design lines 168-187) ── */}
            <SectionHeading text="Branch" accent="Stock" />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              Valued at current prices · {formatDisplayDate(today)}
            </Text>

            <View style={styles.section}>
              <StockGrid row={stockDay.data.row} difference={stockDay.data.reconciliation.difference} />
            </View>

            <View style={styles.section}>
              <StockFlowChart row={stockDay.data.row} />
            </View>

            <View style={styles.section}>
              <StockDetailTable
                row={stockDay.data.row}
                date={today}
                agrees={stockDay.data.reconciliation.difference === 0}
                unexplained={stockDay.data.reconciliation.unexplained}
              />
            </View>

            {/* ── Stock History 7 Days (design lines 189-201) ── */}
            <SectionHeading text="Stock History" accent="7 Days" />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              Sold is valued at current prices, not the till total.
            </Text>
            <View style={styles.section}>
              {stockHistory.data.rows.length > 0 ? (
                <StockHistoryList rows={[...stockHistory.data.rows].reverse()} />
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
