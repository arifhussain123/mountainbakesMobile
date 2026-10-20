import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  useProductionBranchSummary,
  useProductionCurrentStock,
  useProductionReceivedDemand,
  useProductionRepairedStock,
  useProductionReturnStock,
} from '@/api';
import type { ProductionBranchSummaryRow, ProductionDashboardPeriod } from '@/api/types';
import { BranchGroupedColumns, ProductionOrderStatusDonut, StockColumns } from '@/features/production/components';
import { useAppTheme } from '@/shared/theme';
import { SearchBar } from '@/shared/ui';
import {
  BUCKET_UNIT,
  DEMAND_STACK_ORDER,
  DEMAND_STATUS_LABELS,
  KPI_DEFINITIONS,
  bucketLabel,
  demandStatusColor,
  filterStockRows,
  fmtUnits,
  liveProductionColors,
  lowStockDefinition,
  pctLabel,
  rangeLabel,
  returnReasonColor,
  shortBranch,
  whenLabel,
} from '../../utils/dashboardGaps';
import { LineAreaChart, StackedColumnChart } from './LiveProductionCharts';
import { Caption, ChartLegend, DeltaPill, HeatGrid, KpiRow, RankedUnits, SectionKpi, SectionShell, Sparkline } from './LiveProductionParts';

/**
 * The web Production Dashboard's five summary sections
 * (`production/dashboard/*Section.tsx`), each on its own request
 * (`/api/production/dashboard/*`), failing and retrying on its own. Every
 * figure is summed on the server.
 */

export interface SectionProps {
  period: ProductionDashboardPeriod;
  branchId: string | null;
  /** "All branches", or the branch the board is filtered to. */
  scope: string;
  /** "this week", for empty states. */
  periodName: string;
  /** "the same days of last week", for the delta pills. */
  versus: string;
}

function useColors() {
  return liveProductionColors(useAppTheme().isDark);
}

export function ReceivedDemandSection({ period, branchId, scope, periodName, versus }: SectionProps) {
  const c = useColors();
  const q = useProductionReceivedDemand(period, branchId);
  const d = q.data;
  return (
    <SectionShell
      title="Received demand"
      subtitle={d ? `${scope} · units per ${BUCKET_UNIT[d.bucket]} · ${rangeLabel(d.window.from, d.window.to)}` : `${scope} · ${periodName}`}
      query={q}
      empty={!!d && d.kpis.orders === 0}
      emptyText={`No demand received ${periodName}`}
      kpis={() =>
        d && (
          <KpiRow>
            <SectionKpi
              name="Units received"
              value={fmtUnits(d.kpis.units ?? 0)}
              delta={<DeltaPill delta={d.comparePrevious.units} versus={versus} />}
              definition={KPI_DEFINITIONS.unitsReceived}
            />
            <SectionKpi name="Demand orders received" value={fmtUnits(d.kpis.orders ?? 0)} delta={<DeltaPill delta={d.comparePrevious.orders} versus={versus} />} />
            <SectionKpi
              name="Avg units per order"
              value={d.kpis.avgUnits === null ? '—' : fmtUnits(d.kpis.avgUnits)}
              delta={<DeltaPill delta={d.comparePrevious.avgUnits} versus={versus} />}
            />
            <SectionKpi
              name="Pending verification"
              value={fmtUnits(d.kpis.pendingVerification ?? 0)}
              delta={<DeltaPill delta={d.comparePrevious.pendingVerification} versus={versus} invert />}
              definition={KPI_DEFINITIONS.pendingVerification}
              note="orders sent, not yet verified"
            />
            <SectionKpi name="Rejected" value={fmtUnits(d.kpis.rejected ?? 0)} delta={<DeltaPill delta={d.comparePrevious.rejected} versus={versus} invert />} note="orders" />
          </KpiRow>
        )
      }>
      {() =>
        d && (
          <>
            <ChartLegend items={[...DEMAND_STACK_ORDER].reverse().map((s) => ({ label: DEMAND_STATUS_LABELS[s], color: demandStatusColor(s, c) }))} />
            <StackedColumnChart
              labels={d.series.map((p) => bucketLabel(p.bucket, d.bucket))}
              stacks={DEMAND_STACK_ORDER.map((s) => ({
                key: s,
                label: DEMAND_STATUS_LABELS[s],
                color: demandStatusColor(s, c),
                values: d.series.map((p) => p.byStatus?.[s]?.units ?? 0),
              }))}
            />
            <Caption text="Top 5 products" />
            <RankedUnits rows={d.breakdown.topProducts} color={c.demand} />
          </>
        )
      }
    </SectionShell>
  );
}

function BranchCard({ b, selected, dimmed, onSelect }: { b: ProductionBranchSummaryRow; selected: boolean; dimmed: boolean; onSelect: () => void }) {
  const theme = useAppTheme();
  const c = useColors();
  const idle = b.demanded === 0;
  const name = shortBranch(b.branchName);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}: ${idle ? 'no demand this period' : `${fmtUnits(b.demanded)} demanded, ${fmtUnits(b.delivered)} delivered, ${fmtUnits(b.returned)} returned`}. ${
        selected ? 'Showing this branch; tap to show all branches.' : 'Tap to filter the dashboard to this branch.'
      }`}
      onPress={onSelect}
      style={[
        styles.branchCard,
        {
          borderColor: selected ? theme.colors.text : theme.colors.cardBorder,
          borderWidth: selected ? 2 : 1,
          backgroundColor: idle && !selected ? theme.colors.background : theme.colors.cardFill,
          borderRadius: theme.radii.lg,
          opacity: dimmed ? 0.5 : 1,
        },
      ]}>
      <View style={styles.branchHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
            {name}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Last demand {whenLabel(b.lastSubmittedAt)}</Text>
        </View>
        {b.spark ? <Sparkline values={b.spark} color={c.demand} /> : null}
      </View>
      {idle ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '600' }]}>No demand this period</Text>
      ) : (
        <>
          <View style={styles.branchFigures}>
            {(
              [
                ['Demanded', b.demanded, c.demand],
                ['Delivered', b.delivered, c.delivered],
                ['Returned', b.returned, c.returned],
              ] as const
            ).map(([label, v, color]) => (
              <View key={label} style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.branchLabel}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
                </View>
                <Text style={[styles.branchValue, { color: theme.colors.text }]}>{fmtUnits(v)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.branchBarRow}>
            <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
              <View style={{ width: `${Math.min(b.fulfilment ?? 0, 100)}%`, height: '100%', borderRadius: 3, backgroundColor: c.delivered }} />
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{pctLabel(b.fulfilment)}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function BranchSummarySection({
  period,
  periodName,
  versus,
  selectedId,
  onSelect,
}: Pick<SectionProps, 'period' | 'periodName' | 'versus'> & { selectedId: string | null; onSelect: (branchId: string) => void }) {
  // Every branch by definition, so it never takes the branch filter.
  const q = useProductionBranchSummary(period);
  const d = q.data;
  const k = d?.kpis;
  const cmp = d?.comparePrevious;
  return (
    <SectionShell
      title="Branch-wise summary"
      subtitle={
        d ? `Every active branch · units ${periodName} · ${rangeLabel(d.window.from, d.window.to)} · tap a branch to filter the dashboard` : `Every active branch · ${periodName}`
      }
      query={q}
      empty={!!d && d.series.length === 0}
      emptyText="No active branches"
      kpis={() =>
        d && (
          <KpiRow>
            <SectionKpi name="Active branches" value={fmtUnits(k?.activeBranches ?? d.series.length)} />
            <SectionKpi name="Branches with demand" value={fmtUnits(k?.branchesWithDemand ?? 0)} delta={<DeltaPill delta={cmp?.branchesWithDemand} versus={versus} />} />
            <SectionKpi name="Units demanded" value={fmtUnits(k?.demanded ?? 0)} delta={<DeltaPill delta={cmp?.demanded} versus={versus} />} />
            <SectionKpi name="Units delivered" value={fmtUnits(k?.delivered ?? 0)} delta={<DeltaPill delta={cmp?.delivered} versus={versus} />} />
            <SectionKpi
              name="Fulfilment"
              value={pctLabel(k?.fulfilment ?? null)}
              delta={<DeltaPill delta={cmp?.fulfilment} versus={versus} />}
              definition={KPI_DEFINITIONS.fulfilment}
            />
          </KpiRow>
        )
      }>
      {() =>
        d && (
          <>
            <View style={{ gap: 8 }}>
              {d.series.map((b) => (
                <BranchCard
                  key={b.branchId}
                  b={b}
                  selected={selectedId === b.branchId}
                  dimmed={!!selectedId && selectedId !== b.branchId}
                  onSelect={() => onSelect(b.branchId)}
                />
              ))}
            </View>
            <BranchGroupedColumns rows={d.series} selectedId={selectedId} onSelect={onSelect} />
          </>
        )
      }
    </SectionShell>
  );
}

export function RepairedStockSection({ period, branchId, scope, periodName, versus }: SectionProps) {
  const theme = useAppTheme();
  const c = useColors();
  const q = useProductionRepairedStock(period, branchId);
  const d = q.data;
  const returnedInPeriod = d ? d.series.reduce((s, p) => s + p.returned, 0) : 0;
  return (
    <SectionShell
      title="Repaired stock"
      subtitle={d ? `${scope} · units per ${BUCKET_UNIT[d.bucket]} · ${rangeLabel(d.window.from, d.window.to)}` : `${scope} · ${periodName}`}
      query={q}
      empty={!!d && returnedInPeriod === 0 && (d.kpis.backToStock ?? 0) === 0}
      emptyText={`No returns ${periodName}, so nothing to repair`}
      kpis={() =>
        d && (
          <KpiRow>
            <SectionKpi
              name="Units repaired"
              value={fmtUnits(d.kpis.repaired ?? 0)}
              delta={<DeltaPill delta={d.comparePrevious.repaired} versus={versus} />}
              definition={KPI_DEFINITIONS.unitsRepaired}
            />
            <SectionKpi
              name="Repair rate"
              value={pctLabel(d.kpis.repairRate)}
              delta={<DeltaPill delta={d.comparePrevious.repairRate} versus={versus} />}
              definition={KPI_DEFINITIONS.repairRate}
            />
            <SectionKpi
              name="Top repaired product"
              value={d.breakdown.topProduct?.productName ?? '—'}
              note={d.breakdown.topProduct ? `${fmtUnits(d.breakdown.topProduct.units)} units` : 'nothing repaired'}
            />
            <SectionKpi
              name="Sent back to stock"
              value={fmtUnits(d.kpis.backToStock ?? 0)}
              delta={<DeltaPill delta={d.comparePrevious.backToStock} versus={versus} />}
              note={branchId ? 'all branches — Return Stock is one pool' : 'Return Stock → Production Stock'}
              definition={KPI_DEFINITIONS.backToStock}
            />
          </KpiRow>
        )
      }>
      {() =>
        d && (
          <>
            <ChartLegend
              items={[
                { label: 'Repaired', color: c.repaired },
                { label: 'Returned', color: c.returned, line: true },
              ]}
            />
            <LineAreaChart
              labels={d.series.map((p) => bucketLabel(p.bucket, d.bucket))}
              series={[
                { key: 'repaired', label: 'Repaired', color: c.repaired, values: d.series.map((p) => p.repaired), area: true },
                { key: 'returned', label: 'Returned', color: c.returned, values: d.series.map((p) => p.returned), dashed: true },
              ]}
            />
            <Caption text="Top 10 repaired products" />
            {d.breakdown.topProducts.length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                No returns were marked Repaired {periodName}. Choose Repaired when accepting a return to record one.
              </Text>
            ) : (
              <RankedUnits rows={d.breakdown.topProducts} color={c.repaired} />
            )}
          </>
        )
      }
    </SectionShell>
  );
}

export function ReturnStockSection({ period, branchId, scope, periodName, versus }: SectionProps) {
  const theme = useAppTheme();
  const c = useColors();
  const q = useProductionReturnStock(period, branchId);
  const d = q.data;
  return (
    <SectionShell
      title="Return stock"
      subtitle={d ? `${scope} · units accepted back per ${BUCKET_UNIT[d.bucket]} · ${rangeLabel(d.window.from, d.window.to)}` : `${scope} · ${periodName}`}
      query={q}
      empty={!!d && (d.kpis.returned ?? 0) === 0}
      emptyText={`No returns ${periodName}`}
      kpis={() =>
        d && (
          <KpiRow>
            <SectionKpi
              name="Units returned"
              value={fmtUnits(d.kpis.returned ?? 0)}
              delta={<DeltaPill delta={d.comparePrevious.returned} versus={versus} invert />}
              definition={KPI_DEFINITIONS.unitsReturned}
            />
            <SectionKpi
              name="Return rate"
              value={pctLabel(d.kpis.returnRate)}
              delta={<DeltaPill delta={d.comparePrevious.returnRate} versus={versus} invert />}
              definition={KPI_DEFINITIONS.returnRate}
              note="of delivered"
            />
            <SectionKpi name="Return stock on hand" value={fmtUnits(d.kpis.onHand ?? 0)} note="live · one pool, all branches" definition={KPI_DEFINITIONS.returnOnHand} />
            <SectionKpi
              name="Top returning branch"
              value={d.breakdown.topBranch ? shortBranch(d.breakdown.topBranch.branchName) : '—'}
              note={d.breakdown.topBranch ? `${fmtUnits(d.breakdown.topBranch.units)} units` : 'no returns'}
            />
            <SectionKpi
              name="Top returned product"
              value={d.breakdown.topProduct?.productName ?? '—'}
              note={d.breakdown.topProduct ? `${fmtUnits(d.breakdown.topProduct.units)} units` : 'no returns'}
            />
          </KpiRow>
        )
      }>
      {() => {
        if (!d) return null;
        const total = d.kpis.returned ?? 0;
        const slices = d.breakdown.byReason.map((r) => ({ key: r.reason, label: r.label, value: r.units, color: returnReasonColor(r.reason, c) }));
        const lead = [...slices].sort((a, b) => b.value - a.value)[0];
        return (
          <>
            <Caption text="By reason" />
            <View style={styles.donutRow}>
              <ProductionOrderStatusDonut segments={slices} centerLabel="units" />
              <View style={{ flex: 1, gap: 7 }}>
                {slices.map((s) => (
                  <View key={s.key} style={styles.reasonRow}>
                    <View style={[styles.dot, { backgroundColor: s.color }]} />
                    <Text numberOfLines={1} style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>
                      {s.label}
                    </Text>
                    <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{fmtUnits(s.value)}</Text>
                    <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 36, textAlign: 'right' }]}>
                      {total > 0 ? `${Math.round((s.value / total) * 100)}%` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
              Sorted from the free-text reason by keyword{lead && lead.value > 0 ? `; ${lead.label.toLowerCase()} leads` : ''}.
            </Text>
            <Caption text={`Returned per ${BUCKET_UNIT[d.bucket]}`} />
            <LineAreaChart
              labels={d.series.map((p) => bucketLabel(p.bucket, d.bucket))}
              series={[{ key: 'returned', label: 'Returned', color: c.returned, values: d.series.map((p) => p.returned) }]}
              dots
            />
            <Caption text="Branch × top 5 returned products" />
            <HeatGrid
              products={d.breakdown.heat.products}
              rows={d.breakdown.heat.rows}
              color={c.returned}
              selectedId={branchId}
              label={`Units returned per branch for the ${d.breakdown.heat.products.length} most-returned products, ${rangeLabel(d.window.from, d.window.to)}`}
            />
          </>
        );
      }}
    </SectionShell>
  );
}

/** Stock right now. It ignores the period switch, and says so. */
export function CurrentStockSection({ branchId, scope }: Pick<SectionProps, 'branchId' | 'scope'>) {
  const theme = useAppTheme();
  const q = useProductionCurrentStock(branchId);
  const d = q.data;
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const threshold = d?.breakdown.threshold ?? 5;
  const rows = useMemo(() => filterStockRows(d?.series ?? [], search, lowOnly), [d, search, lowOnly]);
  const asOf = d?.generatedAt ? new Date(d.generatedAt) : null;
  const asOfText = asOf && !Number.isNaN(asOf.getTime()) ? `, as of ${String(asOf.getHours()).padStart(2, '0')}:${String(asOf.getMinutes()).padStart(2, '0')}` : '';

  return (
    <SectionShell
      title="Current stock"
      subtitle={`Live${asOfText} · production stock + ${branchId ? `${scope}'s` : "all branches'"} shelves · not affected by the period`}
      query={q}
      empty={!!d && d.series.length === 0}
      emptyText="No active products"
      kpis={() =>
        d && (
          <KpiRow>
            <SectionKpi name="Total production stock" value={fmtUnits(d.kpis.production)} definition={KPI_DEFINITIONS.productionStock} />
            <SectionKpi name="Total branch stock" value={fmtUnits(d.kpis.branch)} note={branchId ? scope : 'all branches'} />
            <SectionKpi name="SKUs in stock" value={fmtUnits(d.kpis.inStock)} note={`of ${fmtUnits(d.breakdown.products)} products`} />
            <SectionKpi name="Low-stock SKUs" value={fmtUnits(d.kpis.low)} note={`under ${threshold} units`} definition={lowStockDefinition(threshold)} />
            <SectionKpi name="Out-of-stock SKUs" value={fmtUnits(d.kpis.out)} note="nothing anywhere" />
          </KpiRow>
        )
      }>
      {() => (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search products" />
          <View style={styles.switchRow}>
            <Switch
              value={lowOnly}
              onValueChange={setLowOnly}
              accessibilityLabel="Low stock only"
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            />
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '600' }]}>Low stock only</Text>
          </View>
          {rows.length === 0 ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 24 }]}>
              {lowOnly ? 'Nothing is running low' : 'No products match'}
            </Text>
          ) : (
            <StockColumns rows={rows} threshold={threshold} />
          )}
        </>
      )}
    </SectionShell>
  );
}

const styles = StyleSheet.create({
  branchCard: { padding: 12, gap: 10 },
  branchHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  branchFigures: { flexDirection: 'row', gap: 6 },
  branchLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  branchBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  dot: { width: 8, height: 8, borderRadius: 2 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
