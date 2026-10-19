import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getBusinessDate,
  getBusinessMonthStart,
  useDailySaleRecords,
  useFinanceDashboard,
  usePendingApprovals,
  useProductionBranchStock,
  useProductionOrders,
  useSalesAnalytics,
} from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { PaymentMethodsCard, SalesChart, SectionHeading, TopProductsBars } from '@/features/dashboard';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer, Routes, useTabBarHeight } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import { useAuthStore } from '@/state';
import { SummaryTiles } from '../components';

type Navigate = (name: string, params?: unknown) => void;

/**
 * Super Admin's overview, all branches. Every figure is a server aggregate the
 * other roles already read — `/sales-analytics` (month to date, by business
 * date), today's Daily Sale Records (one per branch), the finance today strip,
 * the demand list and the branch stock matrix. Nothing new is computed here
 * beyond counting and adding those rows.
 */
export function AdminDashboardScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const go = navigation.navigate as unknown as Navigate;
  const goDrawer = (stack: string) => (navigation.getParent()?.navigate as unknown as Navigate | undefined)?.(stack);

  const today = getBusinessDate();
  const monthStart = getBusinessMonthStart();
  const analyticsQ = useSalesAnalytics(monthStart, today, false, 5);
  const todayRecordsQ = useDailySaleRecords({ from: today, to: today });
  const financeQ = useFinanceDashboard({ from: today, to: today });
  const ordersQ = useProductionOrders();
  const stockQ = useProductionBranchStock();
  const approvalsQ = usePendingApprovals();

  const byBranch = useMemo(
    () => [...(todayRecordsQ.data?.records ?? [])].sort((a, b) => b.autoTotalSale - a.autoTotalSale),
    [todayRecordsQ.data],
  );
  const todayTotal = byBranch.reduce((n, r) => n + (Number(r.autoTotalSale) || 0), 0);
  const todayOrders = byBranch.reduce((n, r) => n + (Number(r.orderCount) || 0), 0);
  const maxBranch = Math.max(1, ...byBranch.map((r) => r.autoTotalSale));

  const demands = ordersQ.data?.orders ?? [];
  const waitingProduction = demands.filter((o) => o.status === 'pending' || o.status === 'verified').length;
  const awaitingBranch = demands.filter((o) => o.status === 'awaiting_verification').length;
  const negativeStock = useMemo(() => {
    const s = stockQ.data;
    if (!s) return 0;
    let n = 0;
    for (const row of s.rows) for (const b of s.branches) if ((row.byBranch[b.branchId] ?? 0) < 0) n += 1;
    return n;
  }, [stockQ.data]);

  const refreshing = analyticsQ.isRefetching || todayRecordsQ.isRefetching || financeQ.isRefetching;
  const refreshAll = () => {
    void analyticsQ.refetch();
    void todayRecordsQ.refetch();
    void financeQ.refetch();
    void ordersQ.refetch();
    void stockQ.refetch();
    void approvalsQ.refetch();
  };
  const a = analyticsQ.data;
  const f = financeQ.data;

  return (
    <Screen>
      <AppHeader
        title="Admin Dashboard"
        subtitle={`${user?.displayName ?? user?.email ?? 'Super Admin'} · all branches`}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: 14, paddingBottom: theme.spacing.lg + tabBarHeight }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.colors.primary} />}>
        {/* Hero: today's sales across every branch */}
        <View style={[styles.hero, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg }]}>
          <Text style={[theme.typography.label, { color: '#FFFFFF', letterSpacing: 1 }]}>TODAY'S SALES · ALL BRANCHES · {formatDisplayDate(today).toUpperCase()}</Text>
          {todayRecordsQ.isLoading ? (
            <Text style={[theme.typography.screenTitle, { color: '#FFFFFF', marginTop: 6 }]}>…</Text>
          ) : (
            <>
              <Text style={[theme.typography.screenTitle, { color: '#FFFFFF', fontSize: 32, lineHeight: 40, marginTop: 6 }]}>{formatCurrency(todayTotal)}</Text>
              <Text style={[theme.typography.bodySmall, { color: '#FFFFFF', opacity: 0.9 }]}>
                {formatCount(todayOrders)} orders · {formatCount(byBranch.filter((r) => r.autoTotalSale > 0).length)} of {formatCount(byBranch.length)} branches selling
              </Text>
            </>
          )}
        </View>
        {todayRecordsQ.error ? <ErrorState message={mapErrorToMessage(todayRecordsQ.error)} onRetry={() => void todayRecordsQ.refetch()} /> : null}

        {/* Work waiting on someone */}
        <View style={styles.tileGrid}>
          <LinkTile label="Demands waiting for Production" value={ordersQ.data ? formatCount(waitingProduction) : '—'} tone={waitingProduction > 0 ? 'warning' : undefined} onPress={() => go(Routes.SUPER_ADMIN_ORDERS_TAB)} />
          <LinkTile label="Sent, awaiting branch verify" value={ordersQ.data ? formatCount(awaitingBranch) : '—'} onPress={() => go(Routes.SUPER_ADMIN_ORDERS_TAB)} />
          <LinkTile label="Finance approvals pending" value={approvalsQ.data ? formatCount(approvalsQ.data.length) : '—'} tone={(approvalsQ.data?.length ?? 0) > 0 ? 'warning' : undefined} />
          <LinkTile label="Negative branch stock lines" value={stockQ.data ? formatCount(negativeStock) : '—'} tone={negativeStock > 0 ? 'danger' : undefined} onPress={() => go(Routes.SUPER_ADMIN_BRANCH_STOCK_TAB)} />
        </View>

        {/* Today by branch */}
        <SectionHeading text="Today by" accent="Branch" />
        <Card>
          {todayRecordsQ.isLoading ? <LoadingSkeleton height={120} /> : null}
          {!todayRecordsQ.isLoading && byBranch.length === 0 ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No sales recorded yet today.</Text>
          ) : null}
          {byBranch.map((r) => (
            <Pressable key={r.branchId} onPress={() => goDrawer(Routes.SUPER_ADMIN_DAILY_SALE)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
              <View style={styles.branchRow}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                  {r.branchName}
                </Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(r.autoTotalSale)}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.colors.border }]}>
                <View style={[styles.barFill, { width: `${Math.max(2, (r.autoTotalSale / maxBranch) * 100)}%`, backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                {formatCount(r.orderCount)} orders · company share {formatCurrency(r.companyShare)}
              </Text>
            </Pressable>
          ))}
        </Card>

        {/* Finance today */}
        <SectionHeading text="Finance" accent="Today" />
        {financeQ.error ? (
          <ErrorState message={mapErrorToMessage(financeQ.error)} onRetry={() => void financeQ.refetch()} />
        ) : f ? (
          <SummaryTiles
            tiles={[
              { label: 'Income', value: formatCurrency(f.todayIncome), tone: 'success' },
              { label: 'Expenses', value: formatCurrency(f.todayExpenses), tone: 'danger' },
              { label: 'Cash in hand', value: formatCurrency(f.cashInHand) },
              { label: 'Bank balance', value: formatCurrency(f.bankBalance) },
            ]}
          />
        ) : (
          <LoadingSkeleton height={120} />
        )}

        {/* Month to date */}
        <SectionHeading text="This" accent="Month" />
        {analyticsQ.error ? (
          <ErrorState message={mapErrorToMessage(analyticsQ.error)} onRetry={() => void analyticsQ.refetch()} />
        ) : a ? (
          <>
            <SummaryTiles
              tiles={[
                { label: 'Sales, month to date', value: formatCurrency(a.totalSales) },
                { label: 'Paid orders', value: formatCount(a.totalTransactions) },
                { label: 'Average a day', value: formatCurrency(a.averageDailySales) },
                { label: 'Best day', value: a.highestDay ? formatCurrency(a.highestDay.sales) : '—' },
              ]}
            />
            {a.daily.length > 0 ? (
              <Card>
                <SalesChart data={a.daily} average={a.averageDailySales} />
              </Card>
            ) : null}
            {a.topProducts.length > 0 ? (
              <>
                <SectionHeading text="Top" accent="Products" />
                <Card>
                  <TopProductsBars products={a.topProducts} />
                </Card>
              </>
            ) : null}
            {a.paymentMethods.length > 0 ? (
              <>
                <SectionHeading text="Payment" accent="Methods" />
                <PaymentMethodsCard methods={a.paymentMethods} />
              </>
            ) : null}
          </>
        ) : (
          <LoadingSkeleton height={220} />
        )}
      </ScrollView>
    </Screen>
  );
}

function LinkTile({ label, value, tone, onPress }: { label: string; value: string; tone?: 'warning' | 'danger'; onPress?: () => void }) {
  const theme = useAppTheme();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'warning' ? theme.colors.warning : theme.colors.text;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${value}`} style={styles.tile}>
      <Card style={{ padding: 12, flex: 1 }}>
        <Text style={[theme.typography.kpi, { color }]}>{value}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%' },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { height: 6, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});
