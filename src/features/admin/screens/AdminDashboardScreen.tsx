import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getBusinessDate,
  queryKeys,
  useAdminSalesAnalytics,
  useAdminTodaySummary,
  useFinanceMonthlyDashboard,
  useProductionCurrentStock,
  useProductionOverview,
} from '@/api';
import type { FinanceDashboardMetric, FinanceMonthlyDashboardQuery } from '@/api/types';
import { useAppearanceHeaderActions } from '@/features/appearance';
import {
  branchNamer,
  daysInMonth,
  karachiTime,
  monthAbbr,
  monthLong,
  type FinanceDrillTarget,
  type FinanceGranularity,
} from '@/features/finance';
import { useNotificationBellAction } from '@/features/notifications';
import { Routes, openDrawer, useTabBarHeight } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, LoadingSkeleton, Screen } from '@/shared/ui';
import {
  Banner,
  DashSection,
  FilterCard,
  FinanceSummarySection,
  HeadlineKpis,
  LiveProductionSection,
  LiveSalesSection,
  LoginHistoryCard,
  ProductionSummarySection,
  RecordsSheet,
  SalesOverview,
  StatePanel,
  TodaySection,
  type DashboardFilterChange,
  type TopLimit,
} from '../components/dashboard';
import { pad2 } from '../utils/dashboardModel';

type Navigate = (name: string, params?: unknown) => void;

/**
 * Super Admin → Dashboard: the web's Admin Dashboard
 * (`frontend/src/components/dashboard/AdminDashboard.tsx`), top to bottom —
 * Today, Live Sales — All Branches, the selected month's tiles, Sales
 * Overview, Live Production, Production Summary, Finance Summary and Login
 * History. Read-only.
 *
 * Two requests drive the month-scoped figures, and the month / branch / day
 * range feed both, so no section shows a different period from its
 * neighbours: `/finance/dashboard/monthly` (Production demand and Finance
 * Ledger — the same response the Finance Dashboard renders) and
 * `/sales-analytics` (point of sale). Today's tiles and Live Sales have
 * requests of their own and do not wait for the month. Every figure is summed
 * on the server; nothing is added up here.
 */
export function AdminDashboardScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation();
  const go = navigation.navigate as unknown as Navigate;
  const qc = useQueryClient();

  // Business date, not the phone's calendar — the day rolls at 02:00 Karachi.
  const today = getBusinessDate();
  const currentMonth = today.slice(0, 7);

  const [month, setMonth] = useState(currentMonth);
  const [dayFrom, setDayFrom] = useState(1);
  const [dayTo, setDayTo] = useState(31);
  const [branchId, setBranchId] = useState('');
  const [incGran, setIncGran] = useState<FinanceGranularity>('monthly');
  const [expGran, setExpGran] = useState<FinanceGranularity>('monthly');
  const [topLimit, setTopLimit] = useState<TopLimit>(5);
  const [drill, setDrill] = useState<FinanceDrillTarget | null>(null);

  const nd = daysInMonth(month);
  const f = Math.min(dayFrom, nd);
  const t = Math.max(f, Math.min(dayTo, nd));
  const fullMonth = f === 1 && t === nd;
  const from = `${month}-${pad2(f)}`;
  const to = `${month}-${pad2(t)}`;

  const finQuery: FinanceMonthlyDashboardQuery = { month };
  if (!fullMonth) {
    finQuery.from = from;
    finQuery.to = to;
  }
  if (branchId) finQuery.branchId = branchId;
  const fin = useFinanceMonthlyDashboard(finQuery);
  const salesQ = useAdminSalesAnalytics({ from, to, topLimit, branchId: branchId || null });
  // Today's business day whatever month is selected; only the branch filter applies.
  const todayQ = useAdminTodaySummary(branchId || null);
  const prodToday = useProductionOverview('today', branchId || null);
  const stockQ = useProductionCurrentStock(branchId || null);

  const data = fin.data;
  const sales = salesQ.data ?? null;

  const setFilter = (next: DashboardFilterChange) => {
    if (next.month !== undefined) {
      setMonth(next.month);
      setDayFrom(1);
      setDayTo(31);
    }
    if (next.branchId !== undefined) setBranchId(next.branchId);
    if (next.from !== undefined) setDayFrom(next.from);
    if (next.to !== undefined) setDayTo(next.to);
  };
  const reset = () => {
    setFilter({ month: currentMonth, branchId: '' });
    setIncGran('monthly');
    setExpGran('monthly');
  };

  const name = data ? branchNamer(data) : null;
  const scopeLabel = !branchId ? 'All Branches' : name ? name(branchId) : 'Selected branch';
  const context = `${monthLong(month)} · ${scopeLabel}${fullMonth ? '' : ` · ${pad2(f)}–${pad2(t)} ${monthAbbr(month)}`}`;
  const drillTo = (metric: FinanceDashboardMetric, extra: Partial<FinanceDrillTarget> = {}) => {
    if (data) setDrill({ metric, from: data.from, to: data.to, context, ...extra });
  };

  const s = data?.summary;
  const financeRecords = !!s && s.orders + s.receipts + s.ledgerEntries + s.returnCount + s.discountCount > 0;
  const salesRecords = !!sales && sales.totalTransactions + sales.staffCount > 0;
  // Empty only once BOTH answers are in: a month with sales but no demand is not empty.
  const salesSettled = !!sales || !!salesQ.error;
  const isEmpty = !!data && !financeRecords && salesSettled && !salesRecords;
  // Dim only while a new month/branch/range stands on the previous figures.
  const updating = (fin.isPlaceholderData || salesQ.isPlaceholderData) && !!data;

  const refreshing = (fin.isRefetching && !fin.isPlaceholderData) || (salesQ.isRefetching && !salesQ.isPlaceholderData) || todayQ.isRefetching;
  const refresh = () => {
    void fin.refetch();
    void salesQ.refetch();
    void todayQ.refetch();
    void prodToday.refetch();
    void stockQ.refetch();
    void qc.invalidateQueries({ queryKey: ['branchSales'] });
    void qc.invalidateQueries({ queryKey: ['productionOverview'] });
    void qc.invalidateQueries({ queryKey: queryKeys.financeDashboard({ from: today, to: today }) });
  };

  return (
    <Screen>
      <AppHeader
        title="Admin Dashboard"
        subtitle={`Sales, branch, production & finance summary · ${context}`}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, gap: theme.spacing.xl, paddingBottom: theme.spacing.lg + tabBarHeight }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <View style={{ gap: 6 }}>
          <FilterCard
            month={month}
            currentMonth={currentMonth}
            branchId={branchId}
            branches={data?.branches ?? null}
            dayFrom={f}
            dayTo={t}
            daysInMonth={nd}
            onChange={setFilter}
          />
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]} accessibilityLiveRegion="polite">
            {updating ? 'Updating…' : data ? `Updated ${karachiTime(data.generatedAt)}` : ' '}
          </Text>
        </View>

        {/* Today & live sales: not month-scoped */}
        <TodaySection
          businessDate={today}
          scope={scopeLabel}
          today={{ data: todayQ.data, failed: !!todayQ.error }}
          production={{ data: prodToday.data, failed: !!prodToday.error }}
          stock={{ data: stockQ.data, failed: !!stockQ.error }}
          onRetry={() => {
            if (todayQ.error) void todayQ.refetch();
            if (prodToday.error) void prodToday.refetch();
            if (stockQ.error) void stockQ.refetch();
          }}
        />
        <LiveSalesSection today={today} />

        {/* The selected month */}
        {!data && fin.error ? (
          <StatePanel
            title="Dashboard data could not be loaded."
            body={`The figures for ${context} did not load. Nothing is shown so stale figures aren’t mistaken for current ones.`}
            actionLabel="Retry"
            onAction={refresh}
          />
        ) : !data || (!financeRecords && !salesSettled) ? (
          <View style={{ gap: theme.spacing.md }} accessibilityLabel="Loading dashboard">
            <LoadingSkeleton height={220} borderRadius={16} />
            <LoadingSkeleton height={260} borderRadius={16} />
          </View>
        ) : isEmpty ? (
          <StatePanel
            title="No records found for the selected month and branch."
            body={`${context} has no sales, no approved Production demand, returns or discounts, and no Finance Ledger entries. Figures are hidden rather than shown as Rs. 0.`}
            actionLabel="Reset filters"
            onAction={reset}
          />
        ) : (
          <View style={{ gap: theme.spacing.xl, opacity: updating ? 0.6 : 1 }}>
            {fin.error ? <Banner text={`Could not refresh. Showing figures loaded at ${karachiTime(data.generatedAt)}.`} onRetry={refresh} /> : null}
            <DashSection title={monthLong(month)} sub={`Sales, Company Share and Finance Ledger · ${context}`}>
              <HeadlineKpis data={data} sales={sales} salesFailed={!!salesQ.error && !sales} drillTo={drillTo} />
            </DashSection>
            <SalesOverview
              sales={sales}
              loading={salesQ.isPending}
              failed={!!salesQ.error}
              onRetry={() => void salesQ.refetch()}
              topLimit={topLimit}
              onTopLimit={setTopLimit}
              subtitle={context}
            />
          </View>
        )}

        {/* Production: the live board has its own period and branch picker and does not wait for the month. */}
        <LiveProductionSection />
        {data && !isEmpty ? (
          <View style={{ opacity: updating ? 0.6 : 1 }}>
            <ProductionSummarySection data={data} context={context} drillTo={drillTo} />
          </View>
        ) : null}

        {data && !isEmpty ? (
          <View style={{ opacity: updating ? 0.6 : 1 }}>
            <FinanceSummarySection
              data={data}
              scoped={!!branchId}
              context={context}
              incGran={incGran}
              setIncGran={setIncGran}
              expGran={expGran}
              setExpGran={setExpGran}
              drillTo={drillTo}
              onApprovals={() => go(Routes.SUPER_ADMIN_LEDGER_STACK)}
            />
          </View>
        ) : null}

        {/* Not month-scoped: the login record a super admin audits. */}
        <LoginHistoryCard onOpenSecurity={() => go(Routes.SUPER_ADMIN_SECURITY)} />
      </ScrollView>

      <RecordsSheet target={drill} dashboardBranchId={branchId || null} onClose={() => setDrill(null)} />
    </Screen>
  );
}
