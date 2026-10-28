import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, useFinanceDashboard, useFinanceMonthlyDashboard } from '@/api';
import type { FinanceDashboardMetric, FinanceMonthlyDashboard } from '@/api/types';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { Routes, openDrawer, useTabBarHeight, type FinanceHomeStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAppTheme } from '@/shared/theme';
import { useAuthStore } from '@/state';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import {
  branchNamer,
  branchTotals,
  contextLabel,
  csvFilename,
  dailySeries,
  dashboardCsv,
  dayLabel,
  defaultFilter,
  hasRecords,
  karachiTime,
  ledgerHeadTotals,
  monthLong,
  resolveFilter,
  type DashboardFilter,
  type DrillTarget,
  type Granularity,
} from '../../utils/dashboardModel';
import { BranchExpenseChart, BranchIncomeChart, DailyShareReceivedChart, ExpenseTrendChart, MonthlyTrendChart } from './charts';
import { FilterCard, FilterSheet, stepMonth } from './filters';
import { LazyProvider, LazySection, useLazyScroll } from './LazySection';
import { ExpenseKpis, IncomeKpis, IncomeVsExpense, Reconciliation, SummaryCarousel, TodayStrip } from './sections';
import { ExpenseTable, IncomeTable } from './tables';

type Nav = NativeStackNavigationProp<FinanceHomeStackParamList>;

/**
 * Finance → Dashboard: the web's monthly Finance Dashboard
 * (frontend/.../finance/dashboard/FinanceMonthlyDashboard.tsx), laid out as
 * design UIandUX/mountainbakesFinance.html screen 01.
 *
 * One request drives every card, chart and table — `GET
 * /finance/dashboard/monthly` for the filtered month — so no two sections can
 * show different periods; the Today strip is the one company-wide exception
 * (`GET /finance/dashboard` for today). Every amount is the server's; this
 * screen only regroups and labels (`dashboardModel.ts`), so it matches the web
 * figure for figure. Any tappable figure opens its source records.
 */
export function FinanceDashboardScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  // An Accountant has no Daily Ledger; Income & Expense lists the entries awaiting approval.
  const approvalsTab = useAuthStore((st) => st.user?.role) === 'accountant' ? Routes.FINANCE_INCOME_EXPENSE_TAB : Routes.FINANCE_LEDGER_TAB;
  const tabBarHeight = useTabBarHeight();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const { isOffline } = useNetworkStatus();
  const lazy = useLazyScroll();

  // Business date, not the phone's calendar — the day rolls at 02:00 Karachi.
  const today = getBusinessDate();
  const currentMonth = today.slice(0, 7);
  const [filter, setFilter] = useState<DashboardFilter>(() => defaultFilter(currentMonth));
  const [incGran, setIncGran] = useState<Granularity>('monthly');
  const [expGran, setExpGran] = useState<Granularity>('monthly');
  const sheetRef = useRef<BottomSheetModal>(null);

  const resolved = resolveFilter(filter);
  const monthly = useFinanceMonthlyDashboard(resolved.query);
  const cash = useFinanceDashboard({ from: today, to: today });

  // ── Offline: the last loaded result for each filter ─────────────────────────
  const cacheKey = `financeMonthlyDashboard:${JSON.stringify(resolved.query)}`;
  const [cached, setCached] = useState<{ data: FinanceMonthlyDashboard; updatedAt: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<FinanceMonthlyDashboard>(cacheKey).then((r) => {
      if (!cancelled) setCached(r);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  const live = monthly.data && !monthly.isPlaceholderData ? monthly.data : null;
  useEffect(() => {
    if (live) void setCachedResponse(cacheKey, live);
  }, [cacheKey, live]);

  const showingCache = !live && !!cached && (isOffline || !!monthly.error);
  const data = showingCache ? cached!.data : monthly.data;
  const updating = monthly.isPlaceholderData && !!monthly.data;
  const scoped = !!filter.branchId;

  const name = data ? branchNamer(data) : null;
  const scopeLabel = !filter.branchId ? 'All Branches' : name ? name(filter.branchId) : 'Selected branch';
  const context = contextLabel(filter.month, scopeLabel, resolved);
  const updatedAt = showingCache ? karachiTime(cached!.updatedAt) : data ? karachiTime(data.generatedAt) : '';
  const subtitle = `${monthLong(filter.month)} · ${scopeLabel} · ${resolved.fullMonth ? 'Full month' : `Days ${String(resolved.from).padStart(2, '0')}–${String(resolved.to).padStart(2, '0')}`}${updatedAt ? ` · Updated ${updatedAt}` : ''}`;

  const daily = useMemo(() => (data ? dailySeries(data) : []), [data]);
  const branches = useMemo(() => (data ? branchTotals(data) : []), [data]);
  const heads = useMemo(() => (data ? ledgerHeadTotals(data) : []), [data]);

  const drill = useCallback(
    (metric: FinanceDashboardMetric, extra: Partial<DrillTarget> = {}) => {
      if (!data) return;
      navigation.navigate(Routes.FINANCE_DASHBOARD_RECORDS, {
        target: { metric, from: data.from, to: data.to, context, ...extra },
        dashboardBranchId: filter.branchId,
      });
    },
    [data, navigation, context, filter.branchId],
  );

  const refresh = () => {
    void monthly.refetch();
    void cash.refetch();
  };

  const exportCsv = async () => {
    if (!data) return;
    const filename = csvFilename(filter.month, scopeLabel, scoped, resolved);
    try {
      await Share.share({ title: filename, message: dashboardCsv(data, context, incGran, expGran) });
    } catch (e) {
      Alert.alert('Export failed', mapErrorToMessage(e));
    }
  };

  const reset = () => {
    setFilter(defaultFilter(currentMonth));
    setIncGran('monthly');
    setExpGran('monthly');
  };

  const any = data ? hasRecords(data) : false;

  return (
    <Screen>
      <AppHeader title="Finance Dashboard" subtitle={subtitle} actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <ScrollView
        onScroll={lazy.onScroll}
        scrollEventThrottle={64}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, paddingBottom: theme.spacing.lg + tabBarHeight }}
        refreshControl={<RefreshControl refreshing={monthly.isRefetching && !updating} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <FilterCard
          filter={filter}
          currentMonth={currentMonth}
          branchName={scopeLabel}
          onOpen={() => sheetRef.current?.present()}
          onStepMonth={(by) => setFilter((f) => ({ ...f, month: stepMonth(f.month, by, currentMonth), dayFrom: 1, dayTo: 31 }))}
          onExport={() => void exportCsv()}
          onReset={reset}
          exportDisabled={!data || !any}
        />

        <TodayStrip cash={cash.data} loading={cash.isLoading} onApprovals={() => navigation.getParent()?.navigate(approvalsTab)} />

        {showingCache ? (
          <View style={[styles.pill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Offline · Updated {karachiTime(cached!.updatedAt)}</Text>
          </View>
        ) : monthly.error && data ? (
          <View style={[styles.pill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.warning }]}>
            <Text style={[theme.typography.label, { color: theme.colors.warning }]}>Could not refresh. Showing figures loaded at {karachiTime(data.generatedAt)}</Text>
          </View>
        ) : null}

        {!data ? (
          monthly.error ? (
            <ErrorState message={mapErrorToMessage(monthly.error)} onRetry={refresh} />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              <LoadingSkeleton height={230} borderRadius={16} />
              <LoadingSkeleton height={220} borderRadius={16} />
              <LoadingSkeleton height={180} borderRadius={16} />
              <LoadingSkeleton height={240} borderRadius={16} />
            </View>
          )
        ) : !any ? (
          <EmptyState title="No Finance Records" message={`Nothing was recorded for ${context}.`} actionLabel="Reset filters" onAction={reset} />
        ) : (
          <LazyProvider value={lazy.value}>
            <View style={{ opacity: updating ? 0.55 : 1 }}>
              <SummaryCarousel data={data} scoped={scoped} drill={drill} />

              {data.summary.unpricedLines > 0 ? (
                <View style={[styles.warn, { borderColor: theme.colors.warning, borderRadius: theme.radii.md }]}>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.warning }]}>
                    {data.summary.unpricedLines} delivered {data.summary.unpricedLines === 1 ? 'line has' : 'lines have'} no product price and{' '}
                    {data.summary.unpricedLines === 1 ? 'is' : 'are'} valued at Rs. 0 in Demand and Company Share. Set the price under Products to include{' '}
                    {data.summary.unpricedLines === 1 ? 'it' : 'them'}.
                  </Text>
                </View>
              ) : null}

              <IncomeVsExpense data={data} drill={drill} />
              <Reconciliation data={data} />
              <IncomeKpis data={data} context={context} drill={drill} />

              <LazySection placeholderHeight={300}>
                <DailyShareReceivedChart
                  key={`${data.from}${data.to}${data.branchId}`}
                  data={daily}
                  onViewDemands={(d) => drill('share', { from: d, to: d, context: `${dayLabel(d)} ${d.slice(0, 4)} · ${scopeLabel}` })}
                />
              </LazySection>
              <LazySection placeholderHeight={280}>
                <MonthlyTrendChart key={data.month} data={data.trend} current={data.month} />
              </LazySection>
              {!scoped ? (
                <LazySection placeholderHeight={260}>
                  <BranchIncomeChart rows={branches} onBranch={(b) => drill('share', { branchId: b.branchId, context: `${monthLong(data.month)} · ${b.branch}` })} />
                </LazySection>
              ) : null}

              <LazySection placeholderHeight={320}>
                <ExpenseKpis data={data} heads={heads} context={context} scoped={scoped} drill={drill} />
              </LazySection>
              <LazySection placeholderHeight={280}>
                <ExpenseTrendChart key={`${data.from}${data.to}${data.branchId}`} data={daily} />
              </LazySection>
              {!scoped ? (
                <LazySection placeholderHeight={240}>
                  <BranchExpenseChart rows={branches} />
                </LazySection>
              ) : null}

              <LazySection placeholderHeight={400}>
                <IncomeTable data={data} gran={incGran} onGran={setIncGran} drill={drill} />
              </LazySection>
              <LazySection placeholderHeight={400}>
                <ExpenseTable data={data} heads={heads} gran={expGran} onGran={setExpGran} drill={drill} />
              </LazySection>
            </View>
          </LazyProvider>
        )}
      </ScrollView>

      <FilterSheet
        ref={sheetRef}
        value={filter}
        currentMonth={currentMonth}
        branches={data?.branches ?? cached?.data.branches ?? []}
        onClose={() => sheetRef.current?.dismiss()}
        onApply={(f) => {
          setFilter(f);
          sheetRef.current?.dismiss();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  warn: { borderWidth: 1, padding: 12, marginBottom: 12 },
});
