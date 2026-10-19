import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useProductionOverview } from '@/api';
import type { ProductionDashboardPeriod, ProductionKpiPair, ProductionOrderStatus } from '@/api/types';
import { karachiTime } from '@/features/finance';
import { ProductionDualLineChart, ProductionPlanList } from '@/features/production';
import { useAppTheme } from '@/shared/theme';
import { Card, Dropdown, LoadingSkeleton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { Banner, DashSection, SmallButton, Toggle } from './parts';

const PERIODS: { value: ProductionDashboardPeriod; label: string; name: string; versus: string }[] = [
  { value: 'today', label: 'Today', name: 'today', versus: 'yesterday' },
  { value: 'week', label: 'This week', name: 'this week', versus: 'the same days of last week' },
  { value: 'month', label: 'This month', name: 'this month', versus: 'the same days of last month' },
];

const ORDER_STATUS: Partial<Record<ProductionOrderStatus, { label: string; variant: StatusVariant }>> = {
  pending: { label: 'Waiting', variant: 'warning' },
  awaiting_verification: { label: 'Sent', variant: 'info' },
  verified: { label: 'Verified', variant: 'success' },
  approved: { label: 'Delivered', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const shortBranch = (name: string) => name.replace('Mountain Bakes ', '');

/** Change against the same stretch of the previous period, or null with nothing to compare. */
function pctChange(p: ProductionKpiPair | undefined): number | null {
  if (!p || !p.prev) return null;
  return ((p.cur - p.prev) / p.prev) * 100;
}

/**
 * Live Production — the web embeds the whole Production Dashboard here, with
 * its own period and branch picker. On a phone this is its head: the six KPIs,
 * the production strip, monthly demand vs production, the production plan and
 * the latest branch demands, from the same `GET /production/overview`. The
 * full board stays on the Production role's dashboard.
 */
export function LiveProductionSection() {
  const theme = useAppTheme();
  const [period, setPeriod] = useState<ProductionDashboardPeriod>('week');
  const [branchId, setBranchId] = useState<string | null>(null);
  const q = useProductionOverview(period, branchId);
  const per = PERIODS.find((p) => p.value === period) ?? PERIODS[1]!;
  const data = q.data;
  const c = data?.cards;
  const w = data?.week;
  const k = w?.kpis;
  const selected = branchId ? data?.branches.find((b) => b.branchId === branchId) : undefined;
  const branchName = selected ? shortBranch(selected.branchName) : branchId ? 'Branch' : null;
  const scope = branchName ?? 'All branches';

  const monthly = useMemo(() => (w?.monthly ?? []).map((m) => ({ label: m.month.slice(5), a: m.demand, b: m.produced })), [w]);

  const demand = k?.demand.cur ?? 0;
  const produced = k?.produced.cur ?? 0;
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

  const kpis: { name: string; value: string; note: string; delta: number | null; unit: '%' | 'pts'; invert?: boolean }[] = [
    { name: 'Total demand', value: fmt(demand), note: `units requested ${per.name}`, delta: pctChange(k?.demand), unit: '%' },
    {
      name: 'Produced',
      value: fmt(produced),
      note: branchId ? 'all branches — central pool' : demand > 0 ? `${Math.round((produced / demand) * 100)}% of demand` : `units prepared ${per.name}`,
      delta: pctChange(k?.produced),
      unit: '%',
    },
    {
      name: 'Fulfilment rate',
      value: fulfilment === null ? '—' : `${fulfilment.toFixed(1)}%`,
      note: 'delivered ÷ demanded',
      delta: fulfilment !== null && prevFulfilment !== null ? fulfilment - prevFulfilment : null,
      unit: 'pts',
    },
    { name: 'Open orders', value: fmt(k?.openOrders.cur ?? 0), note: 'waiting approval', delta: pctChange(k?.openOrders), unit: '%', invert: true },
    {
      name: 'Delivered orders',
      value: fmt(k?.deliveredOrders.cur ?? 0),
      note: branchId ? 'received by this branch' : `to ${deliveredTo} ${deliveredTo === 1 ? 'branch' : 'branches'}`,
      delta: pctChange(k?.deliveredOrders),
      unit: '%',
    },
    {
      name: 'Returned units',
      value: fmt(k?.returns.cur ?? 0),
      note: demand > 0 ? `${(((k?.returns.cur ?? 0) / demand) * 100).toFixed(1)}% of demand` : 'units accepted back',
      delta: pctChange(k?.returns),
      unit: '%',
      invert: true,
    },
  ];

  return (
    <DashSection title="Live Production" sub="Orders, output and stock for today, this week or this month, with its own branch picker.">
      <Card style={{ gap: 10 }}>
        <View style={styles.liveRow}>
          <View style={[styles.dot, { backgroundColor: q.error ? theme.colors.danger : theme.colors.success }]} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>
            {q.error && data ? 'Could not refresh' : 'Live'}
            {q.dataUpdatedAt ? ` · updated ${karachiTime(q.dataUpdatedAt)}` : ''}
          </Text>
          <SmallButton label={q.isFetching ? 'Refreshing…' : 'Refresh'} icon="refresh" onPress={() => void q.refetch()} />
        </View>
        <Toggle options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={period} onChange={setPeriod} />
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
          <View style={styles.grid}>
            {kpis.map((kp) => (
              <View key={kp.name} style={[styles.kpi, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>{kp.name}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.kpiValue, { color: theme.colors.text }]}>
                  {kp.value}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{kp.note}</Text>
                <Delta value={kp.delta} unit={kp.unit} invert={kp.invert} versus={per.versus} />
              </View>
            ))}
          </View>

          <Card style={styles.strip}>
            {strip.map((s) => (
              <View key={s.name} style={[styles.stripCell, { borderLeftColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={[styles.stripValue, { color: s.negative ? theme.colors.danger : theme.colors.text }]}>{fmt(s.value)}</Text>
              </View>
            ))}
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

          <Card>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Production plan</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Demand against output and stock on hand, {per.name}
              {branchId ? ` · demand is ${branchName} only, output and stock are the central pool` : ''}
            </Text>
            {w!.plan.length ? (
              <ProductionPlanList rows={w!.plan} />
            ) : (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>No data yet</Text>
            )}
          </Card>

          <Card>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Recent branch demands</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Latest submissions from {branchName ?? 'all branches'}</Text>
            {w!.recent.length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No demands yet</Text>
            ) : (
              w!.recent.map((r) => {
                const st = ORDER_STATUS[r.status] ?? { label: r.status, variant: 'info' as StatusVariant };
                return (
                  <View key={r.id} style={[styles.recent, { borderTopColor: theme.colors.border }]}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 52 }]}>
                      {formatDisplayDate(r.submittedAt.slice(0, 10)).slice(0, 6)}
                    </Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
                        {shortBranch(r.branchName ?? '')}
                      </Text>
                      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                        {r.products} {r.products === 1 ? 'product' : 'products'} · {fmt(r.units)} units{r.wasChanged ? ' · changed' : ''}
                      </Text>
                    </View>
                    <StatusBadge label={st.label} variant={st.variant} />
                  </View>
                );
              })
            )}
          </Card>
        </View>
      )}
    </DashSection>
  );
}

function Delta({ value, unit, invert, versus }: { value: number | null; unit: '%' | 'pts'; invert?: boolean; versus: string }) {
  const theme = useAppTheme();
  if (value === null || !Number.isFinite(value)) return <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>No comparison</Text>;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
      <Text style={{ fontWeight: '700', color: good ? theme.colors.success : theme.colors.danger }}>
        {value >= 0 ? '+' : '−'}
        {Math.abs(value).toFixed(1)}
        {unit === '%' ? '%' : ' pts'}
      </Text>{' '}
      vs {versus}
    </Text>
  );
}

const styles = StyleSheet.create({
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexBasis: '45%', flexGrow: 1, minWidth: 0, borderWidth: 1, padding: 12, gap: 3 },
  kpiValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  strip: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, paddingHorizontal: 6 },
  stripCell: { width: '50%', borderLeftWidth: 1, paddingHorizontal: 10, paddingVertical: 2, gap: 2 },
  stripValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', gap: 14, marginTop: 8 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth },
});
