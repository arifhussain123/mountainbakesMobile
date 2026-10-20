import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useProductionOverview } from '@/api';
import type { ProductionDashboardDelta, ProductionDashboardPeriod, ProductionKpiPair, ProductionOrderStatus } from '@/api/types';
import { karachiTime } from '@/features/finance';
import { ProductionDualLineChart, ProductionPlanList } from '@/features/production';
import { useAppTheme } from '@/shared/theme';
import { Card, Dropdown, LoadingSkeleton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import {
  KPI_DEFINITIONS,
  PERIOD_INFO,
  fmtUnits,
  liveProductionColors,
  planCounts,
  rangeLabel,
  shortBranch,
  toggleBranch,
  trendPoints,
} from '../../utils/dashboardGaps';
import { LineAreaChart } from './LiveProductionCharts';
import { ChartLegend, DeltaPill, HeatGrid, KpiRow, SectionKpi, ToneBadge } from './LiveProductionParts';
import { BranchSummarySection, CurrentStockSection, ReceivedDemandSection, RepairedStockSection, ReturnStockSection } from './LiveProductionSections';
import { Banner, DashSection, SmallButton, Toggle } from './parts';

const PERIODS: { value: ProductionDashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const ORDER_STATUS: Partial<Record<ProductionOrderStatus, { label: string; variant: StatusVariant }>> = {
  pending: { label: 'Waiting', variant: 'warning' },
  awaiting_verification: { label: 'Sent', variant: 'info' },
  verified: { label: 'Verified', variant: 'success' },
  approved: { label: 'Delivered', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

/** Change against the same stretch of the previous period, or null with nothing to compare. */
function pctChange(p: ProductionKpiPair | undefined): ProductionDashboardDelta | null {
  if (!p || !p.prev) return null;
  return { value: ((p.cur - p.prev) / p.prev) * 100, unit: '%' };
}

/** Every request the live board makes shares one of these roots, so Refresh reaches all of them. */
const LIVE_ROOTS = ['productionOverview', 'productionDashboardSection', 'productionBranchSummary', 'productionCurrentStock'];

/**
 * Live Production — the web embeds the whole Production Dashboard here, with
 * its own period and branch picker, and so does the phone: the six KPIs (ⓘ
 * reads a figure's definition), the production strip, Demand vs production
 * (by the hour for Today, by the day otherwise), monthly demand vs
 * production, then the five summary sections — Received demand, Branch-wise
 * summary (tap a branch to filter the board), Repaired stock, Return stock,
 * Current stock — each on its own `/production/dashboard/*` request, then the
 * production plan with its covered / from stock / short counts, the branch ×
 * product demand heatmap and the latest branch demands
 * (`GET /production/overview`).
 */
export function LiveProductionSection() {
  const theme = useAppTheme();
  const qc = useQueryClient();
  const colors = liveProductionColors(theme.isDark);
  const [period, setPeriod] = useState<ProductionDashboardPeriod>('week');
  const [branchId, setBranchId] = useState<string | null>(null);
  const q = useProductionOverview(period, branchId);
  const fetching = useIsFetching({ predicate: (query) => LIVE_ROOTS.includes(String(query.queryKey[0])) }) > 0;
  const per = PERIOD_INFO[period];
  const data = q.data;
  const c = data?.cards;
  const w = data?.week;
  const k = w?.kpis;
  const selected = branchId ? data?.branches.find((b) => b.branchId === branchId) : undefined;
  const branchName = selected ? shortBranch(selected.branchName) : branchId ? 'Branch' : null;
  const scope = branchName ?? 'All branches';

  const monthly = useMemo(() => (w?.monthly ?? []).map((m) => ({ label: m.month.slice(5), a: m.demand, b: m.produced })), [w]);
  const trend = useMemo(() => trendPoints(w, period), [w, period]);
  const counts = useMemo(() => planCounts(w?.plan ?? []), [w]);

  const refreshAll = () => {
    for (const root of LIVE_ROOTS) void qc.invalidateQueries({ queryKey: [root] });
  };
  const selectBranch = (id: string) => setBranchId((cur) => toggleBranch(cur, id));

  const demand = k?.demand.cur ?? 0;
  const produced = k?.produced.cur ?? 0;
  // Delivered ÷ demanded, for all branches and for one alike, never capped.
  const rate = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null);
  const fulfilment = rate(k?.delivered.cur ?? 0, demand);
  const prevFulfilment = k ? rate(k.delivered.prev, k.demand.prev) : null;
  const deliveredTo = (w?.branchCompare ?? []).filter((b) => b.delivered > 0).length;

  const strip: { name: string; value: number; negative?: boolean }[] = [
    { name: 'Active branches', value: c?.totalBranches ?? 0 },
    { name: 'Products', value: c?.totalProducts ?? 0 },
    { name: 'Available prod. stock', value: c?.availableProductionStock ?? 0, negative: (c?.availableProductionStock ?? 0) < 0 },
    { name: 'Branch return stock', value: c?.branchReturnStock ?? 0 },
    { name: "Today's production", value: c?.todayProduction ?? 0 },
    { name: 'Weekly production', value: c?.weeklyProduction ?? 0 },
    { name: 'Monthly production', value: c?.monthlyProduction ?? 0 },
  ];

  const sectionProps = { period, branchId, scope, periodName: per.name, versus: per.versus };

  return (
    <DashSection title="Live Production" sub="Orders, output and stock for today, this week or this month, with its own branch picker.">
      <Card style={{ gap: 10 }}>
        <View style={styles.liveRow}>
          <View style={[styles.dot, { backgroundColor: q.error ? theme.colors.danger : theme.colors.success }]} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>
            {q.error && data ? 'Could not refresh' : 'Live'}
            {q.dataUpdatedAt ? ` · updated ${karachiTime(q.dataUpdatedAt)}` : ''}
          </Text>
          <SmallButton label={fetching ? 'Refreshing…' : 'Refresh'} icon="refresh" onPress={refreshAll} />
        </View>
        <Toggle options={PERIODS} value={period} onChange={setPeriod} />
        <Dropdown
          value={branchId ?? ''}
          loading={!data}
          options={[{ value: '', label: 'All branches' }, ...(data?.branches ?? []).map((b) => ({ value: b.branchId, label: shortBranch(b.branchName) }))]}
          onChange={(id) => setBranchId(id || null)}
        />
      </Card>

      {q.error && !data ? (
        <Banner text="Production figures could not be loaded." onRetry={() => void q.refetch()} />
      ) : !data ? (
        <LoadingSkeleton height={260} borderRadius={16} />
      ) : (
        <View style={{ gap: 12, opacity: q.isPlaceholderData ? 0.6 : 1 }}>
          {/* KPIs — company-wide until a branch is picked, then that branch's. */}
          <KpiRow>
            <SectionKpi size="lg" name="Total demand" value={fmtUnits(demand)} note={`units requested ${per.name}`} delta={<DeltaPill delta={pctChange(k?.demand)} versus={per.versus} />} />
            <SectionKpi
              size="lg"
              name="Produced"
              value={fmtUnits(produced)}
              note={branchId ? 'all branches — central pool' : demand > 0 ? `${Math.round((produced / demand) * 100)}% of demand` : `units prepared ${per.name}`}
              delta={<DeltaPill delta={pctChange(k?.produced)} versus={per.versus} />}
              definition={KPI_DEFINITIONS.produced}
            />
            <SectionKpi
              size="lg"
              name="Fulfilment rate"
              value={fulfilment === null ? '—' : `${fulfilment.toFixed(1)}%`}
              note="delivered ÷ demanded"
              delta={
                <DeltaPill delta={fulfilment !== null && prevFulfilment !== null ? { value: fulfilment - prevFulfilment, unit: 'pts' } : null} versus={per.versus} />
              }
              definition={KPI_DEFINITIONS.fulfilmentRate}
            />
            <SectionKpi
              size="lg"
              name="Open orders"
              value={fmtUnits(k?.openOrders.cur ?? 0)}
              note="waiting approval"
              delta={<DeltaPill delta={pctChange(k?.openOrders)} versus={per.versus} invert />}
            />
            <SectionKpi
              size="lg"
              name="Delivered orders"
              value={fmtUnits(k?.deliveredOrders.cur ?? 0)}
              note={branchId ? 'received by this branch' : `to ${deliveredTo} ${deliveredTo === 1 ? 'branch' : 'branches'}`}
              delta={<DeltaPill delta={pctChange(k?.deliveredOrders)} versus={per.versus} />}
            />
            <SectionKpi
              size="lg"
              name="Returned units"
              value={fmtUnits(k?.returns.cur ?? 0)}
              note={demand > 0 ? `${(((k?.returns.cur ?? 0) / demand) * 100).toFixed(1)}% of demand` : 'units accepted back'}
              delta={<DeltaPill delta={pctChange(k?.returns)} versus={per.versus} invert />}
            />
          </KpiRow>

          <Card style={styles.strip}>
            {strip.map((s) => (
              <View key={s.name} style={[styles.stripCell, { borderLeftColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={[styles.stripValue, { color: s.negative ? theme.colors.danger : theme.colors.text }]}>{fmtUnits(s.value)}</Text>
              </View>
            ))}
          </Card>

          <Card>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Demand vs production</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
              {scope} · units per {per.unit} · {w ? rangeLabel(w.from, w.to) : per.name}
              {branchId ? ' · produced is all branches' : ''}
            </Text>
            <ChartLegend
              items={[
                { label: 'Demand', color: colors.demand },
                { label: 'Produced', color: colors.produced, line: true },
              ]}
            />
            {trend.length > 0 ? (
              <LineAreaChart
                labels={trend.map((p) => p.label)}
                series={[
                  { key: 'demand', label: 'Demand', color: colors.demand, values: trend.map((p) => p.demand), area: true },
                  { key: 'produced', label: 'Produced', color: colors.produced, values: trend.map((p) => p.produced), dashed: true },
                ]}
              />
            ) : (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>No data yet</Text>
            )}
          </Card>

          <Card>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Monthly demand vs production</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {scope} · units per month, last 12 months, this one to date{branchId ? ' · produced is all branches' : ''}
            </Text>
            <View style={styles.legend}>
              <Text style={[theme.typography.label, { color: theme.colors.primary }]}>— Demand</Text>
              <Text style={[theme.typography.label, { color: theme.colors.warning }]}>— Produced</Text>
            </View>
            {monthly.length > 1 ? (
              <ProductionDualLineChart points={monthly} colorA={theme.colors.primary} colorB={theme.colors.warning} />
            ) : (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>No data yet</Text>
            )}
          </Card>
        </View>
      )}

      {/* The five summary sections. Each fetches, fails and retries on its own. */}
      <ReceivedDemandSection {...sectionProps} />
      <BranchSummarySection period={period} periodName={per.name} versus={per.versus} selectedId={branchId} onSelect={selectBranch} />
      <RepairedStockSection {...sectionProps} />
      <ReturnStockSection {...sectionProps} />
      <CurrentStockSection branchId={branchId} scope={scope} />

      {data && w ? (
        <View style={{ gap: 12, opacity: q.isPlaceholderData ? 0.6 : 1 }}>
          <Card>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Production plan</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Demand against output and stock on hand, {per.name}
              {branchId ? ` · demand is ${branchName} only, output and stock are the central pool` : ''}
            </Text>
            <View style={styles.badges}>
              <ToneBadge tone="good" label={`${counts.good} covered`} />
              <ToneBadge tone="warn" label={`${counts.warn} from stock`} />
              <ToneBadge tone="bad" label={`${counts.bad} short`} />
            </View>
            {w.plan.length ? (
              <ProductionPlanList rows={w.plan} />
            ) : (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>No data yet</Text>
            )}
          </Card>

          <Card style={{ gap: 8 }}>
            <View>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Branch × product demand</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Units requested per branch, {per.name}. Darker cells are larger orders.</Text>
            </View>
            <HeatGrid
              products={w.heat.products}
              rows={w.heat.rows}
              color={theme.colors.primary}
              selectedId={branchId}
              label={`Units requested per branch and product, ${per.name}`}
            />
          </Card>

          <Card>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Recent branch demands</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Latest submissions from {branchName ?? 'all branches'}</Text>
            {w.recent.length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No demands yet</Text>
            ) : (
              w.recent.map((r) => {
                const st = ORDER_STATUS[r.status] ?? { label: r.status, variant: 'info' as StatusVariant };
                return (
                  <View key={r.id} style={[styles.recent, { borderTopColor: theme.colors.border }]}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 52 }]}>
                      {formatDisplayDate(r.submittedAt.slice(0, 10)).slice(0, 6)}
                    </Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
                        {shortBranch(r.branchName)}
                      </Text>
                      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                        {r.products} {r.products === 1 ? 'product' : 'products'} · {fmtUnits(r.units)} units{r.wasChanged ? ' · changed' : ''}
                      </Text>
                    </View>
                    <StatusBadge label={st.label} variant={st.variant} />
                  </View>
                );
              })
            )}
          </Card>
        </View>
      ) : null}
    </DashSection>
  );
}

const styles = StyleSheet.create({
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, paddingHorizontal: 6 },
  stripCell: { width: '50%', borderLeftWidth: 1, paddingHorizontal: 10, paddingVertical: 2, gap: 2 },
  stripValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', gap: 14, marginTop: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth },
});
