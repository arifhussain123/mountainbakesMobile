import { useMemo } from 'react';
import { Text } from 'react-native';
import type { FinanceMonthlyDashboard } from '@/api/types';
import { FinanceBarList, FinancePanel, dayLabel, formatMoney2, monthLong } from '@/features/finance';
import { useAppTheme } from '@/shared/theme';
import { branchDemandRows, dailyDemand, demandComparison, pctOf, plural, weeklyReturnsDiscount } from '../../utils/dashboardModel';
import { DailyDemandChart, WeeklyReturnDiscountChart } from './ProductionCharts';
import { Banner, DashSection, KpiGrid, KpiTile, type DrillTo } from './parts';

/**
 * Production Summary — branch demand reviewed by Production, from the same
 * `/finance/dashboard/monthly` response as the Finance Summary, so the two
 * cannot disagree. The web's `ProductionSummary`.
 */
export function ProductionSummarySection({ data, context, drillTo }: { data: FinanceMonthlyDashboard; context: string; drillTo: DrillTo }) {
  const theme = useAppTheme();
  const s = data.summary;
  const daily = useMemo(() => dailyDemand(data), [data]);
  const weeks = useMemo(() => weeklyReturnsDiscount(data), [data]);
  const branches = useMemo(() => branchDemandRows(data), [data]);
  const cmp = useMemo(() => demandComparison(data), [data]);
  const prevMonth = monthLong(data.previousMonth);
  const scopeOnly = context.split(' · ').slice(1).join(' · ');

  return (
    <DashSection title="Production Summary" sub={`Branch demand reviewed by Production · ${context}`}>
      <KpiGrid>
        <KpiTile
          label="Demand Amount"
          value={formatMoney2(s.demand)}
          sub="Approved qty × product price"
          icon="factory"
          tone="neutral"
          onPress={s.orders ? () => drillTo('demand') : undefined}
        />
        <KpiTile
          label="Company Share"
          value={formatMoney2(s.companyShare)}
          sub={`${pctOf(s.companyShare, s.demand)} of demand`}
          icon="banknote"
          tone="share"
          onPress={s.orders ? () => drillTo('share') : undefined}
        />
        <KpiTile
          label="Approved Demands"
          value={s.orders.toLocaleString('en-US')}
          sub={`${data.branches.filter((b) => b.isActive).length} active branches`}
          icon="inbox-check"
          tone="accent"
        />
        <KpiTile
          label="Average Daily Demand"
          value={cmp ? formatMoney2(cmp.currentAvg) : '—'}
          sub={cmp ? 'Per elapsed day of the range' : 'No day of the range has passed yet'}
          icon="trending-up"
          tone="neutral"
        />
        <KpiTile
          label="Return"
          value={formatMoney2(s.returns)}
          sub={`${plural(s.returnCount, 'accepted return')} · ${pctOf(s.returns, s.demand)}`}
          icon="rotate-ccw"
          tone="returns"
          onPress={s.returnCount ? () => drillTo('return') : undefined}
        />
        <KpiTile
          label="Discount"
          value={formatMoney2(s.discount)}
          sub={`${plural(s.discountCount, 'approved discount')} · ${pctOf(s.discount, s.demand)}`}
          icon="percent"
          tone="discount"
          onPress={s.discountCount ? () => drillTo('discount') : undefined}
        />
      </KpiGrid>

      {s.unpricedLines > 0 ? (
        <Banner
          tone="warning"
          text={`${s.unpricedLines} delivered line${s.unpricedLines === 1 ? ' has' : 's have'} no product price and ${s.unpricedLines === 1 ? 'is' : 'are'} valued at Rs. 0 in Demand and Company Share. Set the price under Products to include ${s.unpricedLines === 1 ? 'it' : 'them'}.`}
        />
      ) : null}

      <FinancePanel
        title="Daily Approved Demand"
        style={{ marginBottom: 0 }}
        aside={<Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Tap a day for its demands</Text>}>
        {cmp ? (
          cmp.changePct === null ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 8 }]}>No approved demand in {prevMonth} to compare against.</Text>
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
              <Text style={{ fontWeight: '800', color: cmp.changePct < 0 ? theme.colors.danger : theme.colors.success }}>
                {cmp.changePct >= 0 ? '+' : '−'}
                {Math.abs(cmp.changePct).toFixed(1)}%
              </Text>{' '}
              daily average against {prevMonth} ({formatMoney2(cmp.previousAvg)} a day)
            </Text>
          )
        ) : null}
        <DailyDemandChart
          key={`${data.from}${data.to}${data.branchId}`}
          data={daily}
          onDay={(d) => drillTo('demand', { from: d, to: d, context: `${dayLabel(d)} ${d.slice(0, 4)} · ${scopeOnly}` })}
        />
      </FinancePanel>

      <FinancePanel title="Demand by Branch" style={{ marginBottom: 0 }}>
        <FinanceBarList
          emptyMessage="No approved demand in this date range."
          rows={branches.map((b) => ({
            key: b.branchId ?? '~unassigned',
            label: b.branch,
            caption: `${plural(b.orders, 'demand')} · ${pctOf(b.demand, s.demand)}`,
            captionBelow: true,
            value: b.demand,
            color: theme.colors.primary,
            onPress: () => drillTo('demand', { branchId: b.branchId, context: `${monthLong(data.month)} · ${b.branch}` }),
          }))}
        />
      </FinancePanel>

      <FinancePanel title="Return & Discount · Weekly" style={{ marginBottom: 0 }}>
        <WeeklyReturnDiscountChart key={`${data.from}${data.to}${data.branchId}`} data={weeks} />
      </FinancePanel>
    </DashSection>
  );
}
