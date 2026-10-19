import { useMemo } from 'react';
import { View } from 'react-native';
import { getBusinessDate, useFinanceDashboard } from '@/api';
import type { FinanceMonthlyDashboard } from '@/api/types';
import {
  BranchExpenseChart,
  BranchIncomeChart,
  DailyShareReceivedChart,
  ExpenseKpis,
  ExpenseTable,
  ExpenseTrendChart,
  IncomeKpis,
  IncomeTable,
  IncomeVsExpense,
  MonthlyTrendChart,
  Reconciliation,
  SummaryCarousel,
  TodayStrip,
  branchTotals,
  dailySeries,
  dayLabel,
  ledgerHeadTotals,
  monthLong,
  type FinanceGranularity,
} from '@/features/finance';
import { Banner, DashSection, type DrillTo } from './parts';

/**
 * Finance Summary — the Finance Dashboard's own cards, charts and tables,
 * fed the Admin Dashboard's `/finance/dashboard/monthly` response (the web
 * reuses `FinanceDashboardBody` the same way), so a figure here and on the
 * Finance Dashboard cannot disagree. The cash strip is today's position,
 * company-wide, under the Finance Dashboard's own query key.
 */
export function FinanceSummarySection({
  data,
  scoped,
  context,
  incGran,
  setIncGran,
  expGran,
  setExpGran,
  drillTo,
  onApprovals,
}: {
  data: FinanceMonthlyDashboard;
  scoped: boolean;
  context: string;
  incGran: FinanceGranularity;
  setIncGran: (g: FinanceGranularity) => void;
  expGran: FinanceGranularity;
  setExpGran: (g: FinanceGranularity) => void;
  drillTo: DrillTo;
  onApprovals: () => void;
}) {
  const today = getBusinessDate();
  const cash = useFinanceDashboard({ from: today, to: today });
  const s = data.summary;
  const daily = useMemo(() => dailySeries(data), [data]);
  const branches = useMemo(() => branchTotals(data), [data]);
  const heads = useMemo(() => ledgerHeadTotals(data), [data]);
  const scopeOnly = context.split(' · ').slice(1).join(' · ');

  return (
    <DashSection title="Finance Summary" sub={`Company Share, Finance Ledger receipts and company expenses · ${context}`}>
      <View>
        <TodayStrip cash={cash.data} loading={cash.isLoading} onApprovals={onApprovals} />
        <SummaryCarousel data={data} scoped={scoped} drill={drillTo} />
        {s.unpricedLines > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Banner
              tone="warning"
              text={`${s.unpricedLines} delivered line${s.unpricedLines === 1 ? ' has' : 's have'} no product price and ${s.unpricedLines === 1 ? 'is' : 'are'} valued at Rs. 0 in Demand and Company Share — the same way the production slip values them. Set the price under Products to include them.`}
            />
          </View>
        ) : null}
        <IncomeVsExpense data={data} drill={drillTo} />
        <IncomeKpis data={data} context={context} drill={drillTo} />
        <DailyShareReceivedChart
          key={`${data.from}${data.to}${data.branchId}`}
          data={daily}
          onViewDemands={(d) => drillTo('share', { from: d, to: d, context: `${dayLabel(d)} ${d.slice(0, 4)} · ${scopeOnly}` })}
        />
        <MonthlyTrendChart key={data.month} data={data.trend} current={data.month} />
        <Reconciliation data={data} />
        {!scoped ? <BranchIncomeChart rows={branches} onBranch={(b) => drillTo('share', { branchId: b.branchId, context: `${monthLong(data.month)} · ${b.branch}` })} /> : null}
        <ExpenseKpis data={data} heads={heads} context={context} scoped={scoped} drill={drillTo} />
        <ExpenseTrendChart key={`exp${data.from}${data.to}${data.branchId}`} data={daily} />
        {!scoped ? <BranchExpenseChart rows={branches} /> : null}
        <IncomeTable data={data} gran={incGran} onGran={setIncGran} drill={drillTo} />
        <ExpenseTable data={data} heads={heads} gran={expGran} onGran={setExpGran} drill={drillTo} />
      </View>
    </DashSection>
  );
}
