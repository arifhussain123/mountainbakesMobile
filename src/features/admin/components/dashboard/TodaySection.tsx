import type { ProductionCurrentStockSection, ProductionOverview, ReportSummary } from '@/api/types';
import { dayLabel, formatMoney2 } from '@/features/finance';
import { plural } from '../../utils/dashboardModel';
import { Banner, DashSection, KpiGrid, KpiTile } from './parts';

interface Source<T> {
  data: T | undefined;
  failed: boolean;
}

/**
 * "Today" — the web's TodaySnapshot. Three requests, none summed here: the
 * daily report summary (sales, shop expenses, profit, pending), Production's
 * overview (waiting orders, active branches) and its current-stock section
 * (low / out of stock). Each tile says "…" while its request is in flight and
 * "—" if it failed, so one slow source never blanks the others.
 */
export function TodaySection({
  businessDate,
  scope,
  today,
  production,
  stock,
  onRetry,
}: {
  businessDate: string;
  scope: string;
  today: Source<ReportSummary>;
  production: Source<ProductionOverview>;
  stock: Source<ProductionCurrentStockSection>;
  onRetry: () => void;
}) {
  const t = today.data;
  const c = production.data?.cards;
  const k = stock.data?.kpis;
  const v = (ok: boolean, failed: boolean, value: () => string) => (ok ? value() : failed ? '—' : '…');
  const anyFailed = (today.failed && !t) || (production.failed && !c) || (stock.failed && !k);

  return (
    <DashSection title="Today" sub={`Business day ${dayLabel(businessDate)} ${businessDate.slice(0, 4)} · ${scope}`}>
      {anyFailed ? <Banner text="Some of today's figures could not be loaded and show as —." onRetry={onRetry} /> : null}
      <KpiGrid>
        <KpiTile
          label="Today's Sales"
          value={v(!!t, today.failed, () => formatMoney2(t!.totalRevenue))}
          sub={t ? `${plural(t.totalOrders, 'order')} · staff sales excluded` : 'Point-of-sale orders'}
          icon="sales"
          tone="accent"
        />
        <KpiTile
          label="Today's Shop Expenses"
          value={v(!!t, today.failed, () => formatMoney2(t!.totalExpenses))}
          sub="Recorded by the branches today"
          icon="receipt"
          tone="ledger"
        />
        <KpiTile
          label="Today's Profit"
          value={v(!!t, today.failed, () => formatMoney2(t!.totalProfit))}
          negative={!!t && t.totalProfit < 0}
          sub="Sales less shop expenses · production cost not included"
          icon="trending-up"
          tone="received"
        />
        <KpiTile
          label="Pending Orders"
          value={v(!!t, today.failed, () => t!.totalPending.toLocaleString('en-US'))}
          sub="Point-of-sale orders still pending today"
          icon="cart"
          tone="neutral"
        />
        <KpiTile
          label="Waiting Production Orders"
          value={v(!!c, production.failed, () => c!.waitingOrders.toLocaleString('en-US'))}
          sub="Branch demands not yet taken up by Production"
          icon="factory"
          tone="share"
        />
        <KpiTile
          label="Active Branches"
          value={v(!!c, production.failed, () => c!.totalBranches.toLocaleString('en-US'))}
          sub="Branches open for orders"
          icon="store"
          tone="received"
        />
        <KpiTile
          label="Low-Stock Products"
          value={v(!!k, stock.failed, () => k!.low.toLocaleString('en-US'))}
          sub={k ? `${plural(k.out, 'product')} out of stock · under ${stock.data!.breakdown.threshold} units` : 'Production plus branch stock'}
          icon="box"
          tone="returns"
        />
      </KpiGrid>
    </DashSection>
  );
}
