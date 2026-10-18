import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useProductionBranchSummary, useProductionCurrentStock, useProductionOverview } from '@/api';
import type { ProductionDashboardPeriod, ProductionOrderStatus } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import {
  BranchGroupedColumns,
  FilterChip,
  ProductionDualLineChart,
  ProductionHeatmapCard,
  ProductionOrderStatusDonut,
  ProductionPlanList,
  RankedBarList,
  StockColumns,
} from '../../components';
import { COLUMN_PLOT_HEIGHT } from '../../dashboardColumns';
import { styles } from './styles';

const PERIODS: { value: ProductionDashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const RECENT_STATUS_LABEL: Record<ProductionOrderStatus, string> = {
  pending: 'Pending',
  awaiting_verification: 'Sent — Awaiting Verify',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
const RECENT_STATUS_VARIANT: Record<ProductionOrderStatus, StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** `(cur-prev)/prev * 100`, formatted like the mockup's own change pills — null when there is no previous-period figure to compare against. */
function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

function ChangeLabel({ value }: { value: number | null }) {
  const theme = useAppTheme();
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <Text style={[theme.typography.label, { color: positive ? theme.colors.success : theme.colors.danger }]}>
      {positive ? '+' : '−'}
      {Math.abs(value).toFixed(1)}%
    </Text>
  );
}

/**
 * mountainbakesProduction.html screen 01 — Production Dashboard. Composited
 * entirely from `GET /api/production/overview`, which is SQL-aggregated
 * server-side (migrations 112/140/141) — nothing here reduces raw order rows
 * on the client (CLAUDE.md §36). This endpoint already existed in the backend
 * before this slice; it was not built for this pass.
 */
export function ProductionDashboardScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<ProductionDashboardPeriod>('week');
  const [branchId, setBranchId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useProductionOverview(period, branchId);
  // The web dashboard's two column-chart sections: the branch list is every
  // branch (never the filter), current stock is "right now" (never the period).
  const branchSummary = useProductionBranchSummary(period);
  const currentStock = useProductionCurrentStock(branchId);
  const periodWord = period === 'today' ? 'day' : period === 'month' ? 'month' : 'week';

  const monthlyPoints = useMemo(
    () => (data?.week.monthly ?? []).map((m) => ({ label: m.month.slice(5), a: m.demand, b: m.produced })),
    [data],
  );
  const monthlyTotals = useMemo(
    () => (data?.week.monthly ?? []).reduce((acc, m) => ({ demand: acc.demand + m.demand, produced: acc.produced + m.produced }), { demand: 0, produced: 0 }),
    [data],
  );
  const todayDemand = useMemo(() => {
    const week = data?.week;
    if (!week) return 0;
    return data?.demandByDay.find((d) => d.date === week.to)?.qty ?? 0;
  }, [data]);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader
          title="Production Dashboard"
          actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
        />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <AppHeader
          title="Production Dashboard"
          actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
        />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const { week, cards } = data;
  const demandPct = pctChange(week.kpis.demand.cur, week.kpis.demand.prev);
  const producedPct = pctChange(week.kpis.produced.cur, week.kpis.produced.prev);
  const deliveredOrdersPct = pctChange(week.kpis.deliveredOrders.cur, week.kpis.deliveredOrders.prev);
  const returnsPct = pctChange(week.kpis.returns.cur, week.kpis.returns.prev);
  const percentOfDemand = week.kpis.demand.cur > 0 ? Math.round((week.kpis.produced.cur / week.kpis.demand.cur) * 100) : 0;
  const fulfilmentRate =
    week.kpis.demand.cur > 0
      ? Math.min(100, ((week.kpis.produced.cur + cards.availableProductionStock) / week.kpis.demand.cur) * 100)
      : 100;

  const donutSegments = [
    { key: 'pending', value: week.orderStatus.pending, color: theme.colors.warning, label: 'Pending' },
    { key: 'awaitingVerification', value: week.orderStatus.awaitingVerification, color: theme.colors.info, label: 'Awaiting Verify' },
    { key: 'verified', value: week.orderStatus.verified, color: theme.colors.infoAlt, label: 'Verified' },
    { key: 'approved', value: week.orderStatus.approved, color: theme.colors.success, label: 'Approved' },
    { key: 'rejected', value: week.orderStatus.rejected, color: theme.colors.danger, label: 'Rejected' },
  ];

  return (
    <Screen>
      <AppHeader
        title="Production Dashboard"
        subtitle={user?.displayName ?? user?.email ?? undefined}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void branchSummary.refetch();
              void currentStock.refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }>
        {/* Period filter */}
        <View style={[styles.periodRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          {PERIODS.map((p) => (
            <FilterChip key={p.value} label={p.label} active={period === p.value} onPress={() => setPeriod(p.value)} />
          ))}
        </View>

        {/* Branch filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <FilterChip label="All Branches" active={branchId === null} onPress={() => setBranchId(null)} />
            {data.branches.map((b) => (
              <FilterChip key={b.branchId} label={b.branchName} active={branchId === b.branchId} onPress={() => setBranchId(b.branchId)} />
            ))}
          </View>
        </ScrollView>

        {/* Hero: total demand this period */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[theme.typography.label, { color: '#FFFFFF', letterSpacing: 1 }]}>
              TOTAL DEMAND · {period === 'today' ? 'TODAY' : period === 'month' ? 'THIS MONTH' : 'THIS WEEK'}
            </Text>
            <ChangeLabel value={demandPct} />
          </View>
          <Text style={[theme.typography.screenTitle, { color: '#FFFFFF', fontSize: 34, marginTop: 6 }]}>
            {week.kpis.demand.cur} <Text style={{ fontSize: 14, fontWeight: '600' }}>units</Text>
          </Text>
          <View style={styles.heroSubRow}>
            <View style={[styles.heroSubCard, { backgroundColor: '#1C1917' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[theme.typography.label, { color: '#A39A92' }]}>Produced</Text>
                <ChangeLabel value={producedPct} />
              </View>
              <Text style={[theme.typography.cardTitle, { color: '#F5F1EC', marginTop: 2 }]}>{week.kpis.produced.cur}</Text>
              <Text style={[theme.typography.label, { color: '#857B73' }]}>{percentOfDemand}% of demand</Text>
            </View>
            <View style={[styles.heroSubCard, { backgroundColor: '#1C1917' }]}>
              <Text style={[theme.typography.label, { color: '#A39A92' }]}>Fulfilment rate</Text>
              <Text style={[theme.typography.cardTitle, { color: '#F5F1EC', marginTop: 2 }]}>{fulfilmentRate.toFixed(1)}%</Text>
              <Text style={[theme.typography.label, { color: '#857B73' }]}>incl. available stock</Text>
            </View>
          </View>
        </View>

        {/* 3 stat boxes */}
        <View style={styles.statGrid}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Open orders</Text>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: 4 }]}>{week.kpis.openOrders.cur}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>waiting approval</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Delivered</Text>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: 4 }]}>{week.kpis.deliveredOrders.cur}</Text>
            <ChangeLabel value={deliveredOrdersPct} />
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Returned</Text>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: 4 }]}>{week.kpis.returns.cur}</Text>
            <ChangeLabel value={returnsPct} />
          </View>
        </View>

        {/* Order status donut */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Order status</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {branchId ? data.branches.find((b) => b.branchId === branchId)?.branchName ?? 'Selected branch' : 'All branches'}, this{' '}
            {period === 'today' ? 'day' : period === 'month' ? 'month' : 'week'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}>
            <ProductionOrderStatusDonut segments={donutSegments} />
            <View style={{ flex: 1, gap: 7 }}>
              {donutSegments.map((s) => (
                <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
                  <Text style={[theme.typography.label, { color: theme.colors.text, flex: 1 }]}>{s.label}</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.footerRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Changed by production</Text>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{week.orderStatus.changed}</Text>
          </View>
        </Card>

        {/* Monthly demand vs production */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Monthly demand vs production</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            All branches · last 12 months · current month to date
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 12, height: 2, backgroundColor: theme.colors.primary }} />
              <Text style={[theme.typography.label, { color: theme.colors.primary }]}>Demand {monthlyTotals.demand.toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 12, height: 2, backgroundColor: theme.colors.warning }} />
              <Text style={[theme.typography.label, { color: theme.colors.warning }]}>Produced {monthlyTotals.produced.toLocaleString()}</Text>
            </View>
          </View>
          {monthlyPoints.length > 1 ? (
            <ProductionDualLineChart points={monthlyPoints} colorA={theme.colors.primary} colorB={theme.colors.warning} />
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>Not enough history yet.</Text>
          )}
        </Card>

        {/* Demand vs production — today */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Demand vs production</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            All branches · units · {formatDisplayDate(week.to)}
          </Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            {[
              { label: 'Demand', value: todayDemand, color: theme.colors.primary },
              { label: 'Produced', value: cards.todayProduction, color: theme.colors.warning },
            ].map((row) => {
              const max = Math.max(1, todayDemand, cards.todayProduction);
              return (
                <View key={row.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[theme.typography.label, { color: theme.colors.text }]}>{row.label}</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{row.value}</Text>
                  </View>
                  <View style={{ marginTop: 5, height: 8, borderRadius: 4, backgroundColor: theme.colors.border }}>
                    <View style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: row.color }} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Branch-wise summary — the web dashboard's column chart */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Branch-wise summary</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Units demanded, delivered and returned this {periodWord}, highest demand first. Tap a branch to filter the dashboard.
          </Text>
          {branchSummary.isLoading ? (
            <LoadingSkeleton height={COLUMN_PLOT_HEIGHT} />
          ) : branchSummary.error && !branchSummary.data ? (
            <ErrorState message={mapErrorToMessage(branchSummary.error)} onRetry={() => void branchSummary.refetch()} />
          ) : (branchSummary.data?.series.length ?? 0) === 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>No active branches.</Text>
          ) : (
            <BranchGroupedColumns
              rows={branchSummary.data!.series}
              selectedId={branchId}
              onSelect={(id) => setBranchId(id === branchId ? null : id)}
            />
          )}
        </Card>

        {/* Current stock — the web dashboard's column chart */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Current stock</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Right now, whatever the period · production stock under branch stock, largest first
          </Text>
          {currentStock.isLoading ? (
            <LoadingSkeleton height={COLUMN_PLOT_HEIGHT} />
          ) : currentStock.error && !currentStock.data ? (
            <ErrorState message={mapErrorToMessage(currentStock.error)} onRetry={() => void currentStock.refetch()} />
          ) : (currentStock.data?.series.length ?? 0) === 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>No products in stock records.</Text>
          ) : (
            <StockColumns rows={currentStock.data!.series} threshold={currentStock.data!.breakdown.threshold} />
          )}
        </Card>

        {/* Top 10 requested products */}
        {week.plan.length > 0 ? (
          <Card style={{ marginTop: theme.spacing.md }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Top 10 requested products</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
              All branches · units demanded this {period === 'today' ? 'day' : period === 'month' ? 'month' : 'week'}
            </Text>
            <RankedBarList
              rows={week.plan.map((p) => ({ key: p.productId ?? p.productName, label: p.productName, value: p.demand }))}
            />
          </Card>
        ) : null}

        {/* Production plan */}
        {week.plan.length > 0 ? (
          <Card style={{ marginTop: theme.spacing.md }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Production plan</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Demand against output and stock on hand, this {period === 'today' ? 'day' : period === 'month' ? 'month' : 'week'}
            </Text>
            <ProductionPlanList rows={week.plan} />
          </Card>
        ) : null}

        {/* Branch × product heatmap */}
        {week.heat.rows.length > 0 ? (
          <Card style={{ marginTop: theme.spacing.md }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Branch × product demand</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
              Units per branch, this {period === 'today' ? 'day' : period === 'month' ? 'month' : 'week'}. Darker cells are larger orders.
            </Text>
            <ProductionHeatmapCard heat={week.heat} branchId={branchId} />
          </Card>
        ) : null}

        {/* Recent branch demands */}
        {week.recent.length > 0 ? (
          <Card style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xl }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Recent branch demands</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
              Latest submissions from all branches
            </Text>
            {week.recent.map((r) => (
              <View key={r.id} style={[styles.recentRow, { borderTopColor: theme.colors.border }]}>
                <View style={{ width: 44 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                    {formatDisplayDate(r.submittedAt.slice(0, 10)).slice(0, 6)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                    {r.branchName}
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                    {r.products} product{r.products === 1 ? '' : 's'} · {r.units} units
                  </Text>
                </View>
                <StatusBadge label={RECENT_STATUS_LABEL[r.status] ?? r.status} variant={RECENT_STATUS_VARIANT[r.status] ?? 'neutral'} />
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
