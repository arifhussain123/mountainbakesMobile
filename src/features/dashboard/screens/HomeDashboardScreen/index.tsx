import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReportSummary, useSalesAnalytics, useStockHistoryDay, getBusinessDate } from '@/api';
import { openComingSoon, openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, DateFilter, type DatePeriod, EmptyState, ErrorState, LoadingSkeleton, Screen, SummaryCard } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { BudgetCard, OrdersCard, QuickActions, SalesChart, SalesVsExpensesBar, StockOverviewCard, TopProductsDonut } from '../../components';
import { getAnalyticsWindow } from '../../utils';
import { styles } from './styles';

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

  const isLoading = summary.isLoading || analytics.isLoading || stockDay.isLoading;
  const firstError = summary.error ?? analytics.error ?? stockDay.error;

  const refreshing = summary.isRefetching || analytics.isRefetching || stockDay.isRefetching;
  const onRefresh = () => {
    void summary.refetch();
    void analytics.refetch();
    void stockDay.refetch();
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
            <LoadingSkeleton height={100} />
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={160} />
          </View>
        ) : firstError ? (
          <ErrorState message={mapErrorToMessage(firstError)} onRetry={onRefresh} />
        ) : summary.data && analytics.data && stockDay.data ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.section} contentContainerStyle={{ gap: theme.spacing.sm }}>
              <SummaryCard label="Sales" value={formatCurrency(summary.data.totalRevenue)} subLabel="Today's sales" emphasis />
              <SummaryCard label="Expenses" value={formatCurrency(summary.data.totalExpenses)} />
              <SummaryCard label="Net" value={formatCurrency(summary.data.totalProfit)} subLabel="Sales − Expenses" />
              <SummaryCard label="Orders" value={String(summary.data.totalOrders)} />
              <SummaryCard label="Discounts" value={formatCurrency(summary.data.totalDiscount)} />
            </ScrollView>

            <View style={styles.section}>
              <OrdersCard total={summary.data.totalOrders} pending={summary.data.totalPending} cancelled={summary.data.totalCancelled} />
            </View>

            <View style={styles.section}>
              <QuickActions />
            </View>

            <View style={styles.section}>
              <BudgetCard budget={summary.data.budget} actual={summary.data.totalRevenue} period={period} />
            </View>

            <View style={styles.section}>
              <StockOverviewCard row={stockDay.data.row} />
            </View>

            <View style={styles.section}>
              {analytics.data.daily.length > 0 ? (
                <SalesChart data={analytics.data.daily} />
              ) : (
                <EmptyState title="No Sales Yet" message="Sales for this period will appear here." />
              )}
            </View>

            <View style={styles.section}>
              <TopProductsDonut products={analytics.data.topProducts} />
            </View>

            <View style={styles.section}>
              <SalesVsExpensesBar sales={summary.data.totalRevenue} expenses={summary.data.totalExpenses} net={summary.data.totalProfit} />
            </View>

            {stockDay.data.reconciliation.difference !== 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.warning, marginTop: theme.spacing.md }]}>
                ⚠ Stock Difference Detected — {stockDay.data.reconciliation.difference} units unexplained.
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
