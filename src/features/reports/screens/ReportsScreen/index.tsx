import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getBusinessDate, useReportSummary, useSalesAnalytics, usePackingUsage } from '@/api';
import { PaymentMethodsCard } from '@/features/dashboard/components';
import { getAnalyticsWindow } from '@/features/dashboard/utils';
import { goBack } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Card, EmptyState, ErrorState, Icon, LoadingSkeleton, Screen, StatCard, type DatePeriod, DateFilter } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { DailySalesLineChart, PackingUsageCard, RevenueHeroCard, TopProductsList } from '../../components';
import { styles } from './styles';

const TABS = ['trend', 'topProducts', 'packing'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { trend: 'Daily Sales', topProducts: 'Top Products', packing: 'Packing' };

/** An export format this screen doesn't generate files for yet — surfaced so the TODO is visible, not silently dropped. */
function handleExportStub(format: 'PDF' | 'Excel' | 'CSV' | 'Print') {
  // TODO: wire to a real report export/print pipeline once one exists (see mobile-api-contract.md).
  Alert.alert('Coming Soon', `${format} export isn't wired up yet.`);
}

/** branchApp.md screen 23 — Reports & Analytics. Trend/Top Products/Packing reuse the dashboard's own analytics. */
export function ReportsScreen() {
  const theme = useAppTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>('trend');
  const [period, setPeriod] = useState<DatePeriod>('daily');

  const today = useMemo(() => getBusinessDate(), []);
  const window = useMemo(() => getAnalyticsWindow(period, today), [period, today]);

  const summary = useReportSummary(period);
  const analytics = useSalesAnalytics(window.from, window.to);
  const packing = usePackingUsage(window.from, window.to);

  const activeQuery = tab === 'packing' ? packing : analytics;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching || summary.isRefetching}
            onRefresh={() => {
              void activeQuery.refetch();
              void summary.refetch();
            }}
          />
        }>
        {/* ── Header: back button + export actions, eyebrow + big title (design lines 1096-1100) ── */}
        <View style={styles.headerTopRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            style={[styles.backButton, { backgroundColor: theme.colors.cardFill }]}>
            <Icon name="chevron-left" color={theme.colors.text} size={16} />
          </Pressable>
          <View style={styles.exportRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export as PDF"
              onPress={() => handleExportStub('PDF')}
              style={[styles.exportPill, { backgroundColor: theme.colors.cardFill }]}>
              <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>PDF</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export as Excel"
              onPress={() => handleExportStub('Excel')}
              style={[styles.exportPill, { backgroundColor: theme.colors.cardFill }]}>
              <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Excel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export as CSV"
              onPress={() => handleExportStub('CSV')}
              style={[styles.exportPill, { backgroundColor: theme.colors.cardFill }]}>
              <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>CSV</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Print report"
              onPress={() => handleExportStub('Print')}
              style={[styles.printPill, { backgroundColor: theme.colors.primary }]}>
              <Icon name="printer" color={theme.colors.primaryText} size={13} />
              <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>Print</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primary, marginTop: theme.spacing.md }]}>Branch Reports</Text>
        <Text style={[theme.typography.screenTitle, styles.bigTitle, { color: theme.colors.text, fontSize: 30, marginTop: 6 }]}>
          Reports &{'\n'}
          <Text style={{ color: theme.colors.primary }}>Analytics</Text>
        </Text>

        {/* ── Date range + period toggle (design line 1100) ── */}
        <View style={[styles.dateRangeRow, { marginTop: theme.spacing.md }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {formatDisplayDate(window.from)} – {formatDisplayDate(window.to)}
          </Text>
          <View style={styles.periodToggleWrap}>
            <DateFilter value={period} onChange={setPeriod} />
          </View>
        </View>

        {summary.isLoading || activeQuery.isLoading ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <LoadingSkeleton height={160} />
          </View>
        ) : null}
        {summary.error ? (
          <ErrorState message={mapErrorToMessage(summary.error)} onRetry={() => void summary.refetch()} />
        ) : null}

        {summary.data ? (
          <>
            {/* ── Revenue hero card (design lines 1102-1108) ── */}
            <View style={{ marginTop: theme.spacing.md }}>
              <RevenueHeroCard
                revenue={summary.data.totalRevenue}
                orders={summary.data.totalOrders}
                profit={summary.data.totalProfit}
                expenses={summary.data.totalExpenses}
              />
            </View>

            {/* ── Avg. Order Value / Cancelled (design lines 1109-1112) ── */}
            <View style={[styles.kpiGrid, { marginTop: theme.spacing.sm }]}>
              <Card style={[styles.kpiCard, { borderColor: theme.colors.cardBorder, padding: theme.spacing.md }]}>
                <View style={styles.kpiCardTopRow}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Avg. Order Value</Text>
                  <Icon name="hash" size={15} color={theme.colors.textSecondary} />
                </View>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 6, fontSize: 18 }]}>
                  {formatCurrency(summary.data.averageOrderValue)}
                </Text>
              </Card>
              <Card style={[styles.kpiCard, { borderColor: theme.colors.cardBorder, padding: theme.spacing.md }]}>
                <View style={styles.kpiCardTopRow}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Cancelled</Text>
                  <Icon name="rotate-ccw" size={15} color={theme.colors.textSecondary} />
                </View>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 6, fontSize: 18 }]}>
                  {summary.data.totalCancelled}
                </Text>
              </Card>
            </View>

            {/* ── Payment methods (design lines 1113-1117) ── */}
            {analytics.data ? (
              <View style={{ marginTop: theme.spacing.sm }}>
                <PaymentMethodsCard methods={analytics.data.paymentMethods} />
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── Tabs: Daily Sales / Top Products / Packing (design line 1118) ── */}
        <View style={[styles.tabsRow, { marginTop: theme.spacing.md }]}>
          {TABS.map((option) => {
            const active = option === tab;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(option)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? theme.colors.primary : 'transparent',
                    borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                  },
                ]}>
                <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
                  {TAB_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: theme.spacing.sm }}>
          {activeQuery.error ? <ErrorState message={mapErrorToMessage(activeQuery.error)} onRetry={() => void activeQuery.refetch()} /> : null}

          {tab === 'trend' && analytics.data ? (
            analytics.data.daily.length > 0 ? (
              <DailySalesLineChart data={analytics.data.daily} />
            ) : (
              <EmptyState title="No Sales Yet" message="Sales for this window will appear here." />
            )
          ) : null}

          {tab === 'topProducts' && analytics.data ? (
            analytics.data.topProducts.length > 0 ? (
              <TopProductsList products={analytics.data.topProducts} />
            ) : (
              <EmptyState title="No Sales Yet" message="Top products for this window will appear here." />
            )
          ) : null}

          {tab === 'packing' ? (
            packing.data ? (
              <View>
                <Card style={{ marginBottom: theme.spacing.md }}>
                  <View style={styles.totalsRow}>
                    <StatCard label="Requested" value={String(packing.data.totals.requested)} />
                    <StatCard label="Approved" value={String(packing.data.totals.approved)} valueColor={theme.colors.success} />
                    <StatCard label="Delivered" value={String(packing.data.totals.delivered)} valueColor={theme.colors.primary} />
                  </View>
                </Card>
                {packing.data.usage.length === 0 ? (
                  <View style={[styles.packingPlaceholder, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg + 4 }]}>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                      Packing material usage for this period
                    </Text>
                  </View>
                ) : (
                  packing.data.usage.map((row) => (
                    <PackingUsageCard key={`${row.date}-${row.packingMaterialId ?? row.materialName}`} row={row} />
                  ))
                )}
              </View>
            ) : null
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
