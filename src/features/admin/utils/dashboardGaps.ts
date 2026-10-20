import { format, isValid, parseISO } from 'date-fns';
import type {
  FinanceDashboardMetric,
  ProductionCurrentStockRow,
  ProductionDashboardBucket,
  ProductionDashboardDelta,
  ProductionDashboardPeriod,
  ProductionDemandStatus,
  ProductionOverviewWeek,
  ProductionPlanRow,
  ProductionReturnReason,
} from '@/api/types';
import { dashboardChartColors } from '@/features/production/dashboardColumns';

/**
 * Rules behind the Super Admin dashboard's second pass — the parts of the
 * web's embedded Production Dashboard (`components/production/ProductionDashboard.tsx`
 * and `production/dashboard/*`) and of the Finance drill-down
 * (`finance/dashboard/RecordsDrawer.tsx`) the phone did not show yet. Pure
 * and React-free so they are unit-tested; the components only draw.
 */

// ─── Formatting ──────────────────────────────────────────────────────────────

/** 16,873 — the web dashboard's `fmt`. */
export const fmtUnits = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

/** 98.3%, or — with nothing to divide by — the web's `pct`. */
export const pctLabel = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : `${n.toFixed(1)}%`);

export const shortBranch = (name: string | null | undefined) => (name ?? '').replace('Mountain Bakes ', '');

export const PERIOD_INFO: Record<ProductionDashboardPeriod, { name: string; versus: string; unit: string }> = {
  today: { name: 'today', versus: 'yesterday', unit: 'hour' },
  week: { name: 'this week', versus: 'the same days of last week', unit: 'day' },
  month: { name: 'this month', versus: 'the same days of last month', unit: 'day' },
};

export const BUCKET_UNIT: Record<ProductionDashboardBucket, string> = { hour: 'hour', day: 'day', week: 'week' };

/** "Oct 12 to Oct 18", or one date when the window is one day — the web's `rangeLabel`. */
export function rangeLabel(from: string, to: string): string {
  const a = parseISO(from);
  const b = parseISO(to);
  if (!isValid(a) || !isValid(b)) return `${from} to ${to}`;
  return from === to ? format(a, 'MMM d') : `${format(a, 'MMM d')} to ${format(b, 'MMM d')}`;
}

/** Axis label for a series key: `2026-10-14T09` → 9a, `2026-10-14` → Wed 14, by week → w/c Oct 14. */
export function bucketLabel(key: string, bucket: ProductionDashboardBucket): string {
  const d = parseISO(bucket === 'hour' ? `${key}:00` : key);
  if (!isValid(d)) return key;
  if (bucket === 'hour') return format(d, 'haaaaa');
  if (bucket === 'week') return `w/c ${format(d, 'MMM d')}`;
  return format(d, 'EEE d');
}

/** "Today 10:30", "Oct 12, 09:15", or "Never" — when a branch last sent a demand. */
export function whenLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return 'Never';
  const d = parseISO(iso);
  if (!isValid(d)) return '—';
  return format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') ? `Today ${format(d, 'HH:mm')}` : format(d, 'MMM d, HH:mm');
}

// ─── Live Production: trend, plan, deltas ────────────────────────────────────

export interface TrendPoint {
  label: string;
  demand: number;
  produced: number;
}

/**
 * The Demand vs production trend. Today is one business day, so a per-day
 * series would be a single point: it is drawn by the hour instead. Every other
 * period is one point per day.
 */
export function trendPoints(week: Pick<ProductionOverviewWeek, 'hourly' | 'trend'> | undefined, period: ProductionDashboardPeriod): TrendPoint[] {
  if (!week) return [];
  if (period === 'today') {
    return (week.hourly ?? []).map((h) => {
      const d = parseISO(h.hour);
      return { label: isValid(d) ? format(d, 'haaaaa') : h.hour, demand: h.demand, produced: h.produced };
    });
  }
  return (week.trend ?? []).map((p) => {
    const d = parseISO(p.date);
    return { label: isValid(d) ? format(d, period === 'month' ? 'MMM d' : 'EEE d') : p.date, demand: p.demand, produced: p.produced };
  });
}

export type PlanTone = 'good' | 'warn' | 'bad';

/**
 * Output plus what is on the shelf, against demand. Covered: the period's own
 * output meets demand. From stock: it only does with the shelf added. Short:
 * not even then, by the amount shown.
 */
export function planCoverage(r: Pick<ProductionPlanRow, 'demand' | 'produced' | 'stock'>): { pct: number; balance: number; tone: PlanTone; label: string } {
  const balance = r.produced + r.stock - r.demand;
  const pct = r.demand > 0 ? Math.round(((r.produced + r.stock) / r.demand) * 100) : 100;
  if (r.produced >= r.demand) return { pct, balance, tone: 'good', label: 'Covered' };
  if (balance >= 0) return { pct, balance, tone: 'warn', label: 'From stock' };
  return { pct, balance, tone: 'bad', label: `Short ${fmtUnits(-balance)}` };
}

/** The Production plan's three badges: covered / from stock / short. */
export function planCounts(rows: Pick<ProductionPlanRow, 'demand' | 'produced' | 'stock'>[]): Record<PlanTone, number> {
  return rows.reduce(
    (acc, r) => {
      acc[planCoverage(r).tone] += 1;
      return acc;
    },
    { good: 0, warn: 0, bad: 0 } as Record<PlanTone, number>,
  );
}

/**
 * A delta pill's text and colour. `invert` for figures where a rise is the bad
 * direction (returns, rejected, open orders). Null draws nothing.
 */
export function deltaDisplay(delta: ProductionDashboardDelta | null | undefined, invert = false): { text: string; tone: 'good' | 'bad' | 'flat' } | null {
  if (!delta || !Number.isFinite(delta.value)) return null;
  const up = delta.value >= 0;
  const flat = delta.value === 0;
  const text = `${up && !flat ? '+' : ''}${delta.value.toFixed(1)}${delta.unit === 'pts' ? ' pts' : '%'}`;
  return { text, tone: flat ? 'flat' : (invert ? !up : up) ? 'good' : 'bad' };
}

/** The tapped branch filters the dashboard; tapping it again shows every branch. */
export function toggleBranch(current: string | null, id: string): string | null {
  return current === id ? null : id;
}

/** A heat cell's fill strength — eased, so many small figures still tell apart beside one large one. */
export function heatCell(value: number, max: number, base = 0.08, span = 0.88): { alpha: number; strong: boolean } {
  if (!(value > 0)) return { alpha: 0, strong: false };
  const t = Math.pow(value / Math.max(max, 1), 0.55);
  return { alpha: base + span * t, strong: t > 0.55 };
}

/** Current stock rows after the product search and the "Low stock only" switch (out of stock counts as low). */
export function filterStockRows(rows: ProductionCurrentStockRow[], search: string, lowOnly: boolean): ProductionCurrentStockRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => (!lowOnly || r.state !== 'ok') && (!q || r.productName.toLowerCase().includes(q)));
}

// ─── Live Production: colours and labels ─────────────────────────────────────

/** The web's `--dash-*` colours the production charts below add to `dashboardChartColors`. */
const EXTRA = {
  light: { produced: '#7E3E1B', repaired: '#009589', waiting: '#7D6BB0', verified: '#2A669F', other: '#2A669F', none: '#C9C4BC' },
  dark: { produced: '#B58D47', repaired: '#009B8F', waiting: '#866EC5', verified: '#32669A', other: '#4984BF', none: '#5E554C' },
} as const;

export function liveProductionColors(isDark: boolean) {
  return { ...dashboardChartColors(isDark), ...(isDark ? EXTRA.dark : EXTRA.light) };
}
export type LiveProductionColors = ReturnType<typeof liveProductionColors>;

/** Demand by order status, stacked from the bottom in this order (the web's `DEMAND_STACK_ORDER`). */
export const DEMAND_STACK_ORDER: ProductionDemandStatus[] = ['approved', 'verified', 'awaiting_verification', 'pending', 'rejected'];

export const DEMAND_STATUS_LABELS: Record<ProductionDemandStatus, string> = {
  pending: 'Waiting',
  awaiting_verification: 'Sent',
  verified: 'Verified',
  approved: 'Delivered',
  rejected: 'Rejected',
};

export function demandStatusColor(status: ProductionDemandStatus, c: LiveProductionColors): string {
  return { approved: c.delivered, verified: c.verified, awaiting_verification: c.demand, pending: c.waiting, rejected: c.outOfStock }[status];
}

export function returnReasonColor(reason: ProductionReturnReason, c: LiveProductionColors): string {
  return { expired: c.returned, damaged: c.demand, unsold: c.delivered, other: c.other, none: c.none }[reason];
}

/** What a KPI means — the web's hover `definition`, word for word. Tap the ⓘ to read it. */
export const KPI_DEFINITIONS = {
  produced: 'Units prepared into Production Stock (prepare movements), by business date. The same figure as the production strip below.',
  fulfilmentRate:
    'Delivered ÷ demanded: units branches received (orders they verified, or Production delivered) out of the units they asked for, same orders, same period. Not capped at 100%. It used to add the shelf stock in, which measured supply, not fulfilment.',
  fulfilment:
    'Delivered ÷ demanded: units branches received (orders they verified, or Production delivered) out of the units they asked for, same orders, same period. Not capped at 100%.',
  unitsReceived: 'Units on every demand branches sent in this period, whatever happened to it after. Cancelled demands are left out.',
  pendingVerification: 'Orders Production has sent that the branch has not yet confirmed receiving.',
  unitsRepaired: 'Units of accepted returns that Production marked Repaired when accepting them.',
  repairRate: 'Repaired ÷ returned: of the units accepted back this period, the share marked Repaired.',
  backToStock:
    'Units transferred from Branch Return Stock into Production Stock this period. A transfer is not tied to the return it came from, so this counts every transfer, repaired or not.',
  unitsReturned: "Units of branch returns Production accepted, by the return's business date. Pending and rejected returns are left out.",
  returnRate: 'Returned ÷ delivered: units accepted back out of units delivered to branches in the same period and scope.',
  returnOnHand: 'Units in Branch Return Stock right now, waiting to be transferred into Production Stock.',
  productionStock: 'Available in the central pool: what is on the shelf less what branches have already been promised. Can be negative.',
} as const;

/** The Low-stock SKUs definition names the server's threshold. */
export const lowStockDefinition = (threshold: number) =>
  `Production plus branch stock above 0 but under ${threshold} units (LOW_STOCK_THRESHOLD, the same alert level the branches use).`;

// ─── Records drill-down ──────────────────────────────────────────────────────

/** Which record store a row's reference (PV/RV number or demand number) opens — the web's `REFERENCE_KIND`. */
export const RECORD_REFERENCE_KIND: Record<FinanceDashboardMetric, 'voucher' | 'demand' | null> = {
  demand: 'demand',
  share: 'demand',
  discount: 'demand',
  received: 'voucher',
  ledger: 'voucher',
  return: null,
};

/** The drawer's info block — the web `METRIC_INFO`'s Source / Included / Date field (Calculation is FINANCE_METRIC_INFO.rule's long form). */
export const RECORD_INFO: Record<FinanceDashboardMetric, { source: string; rule: string; status: string; date: string }> = {
  demand: {
    source: 'Production orders reviewed by Production (awaiting verification, verified, approved)',
    rule: 'Σ approved quantity × current product price, per order',
    status: 'Production-reviewed demand only — pending, rejected and cancelled excluded',
    date: 'Order business date',
  },
  share: {
    source: 'The same approved Production demand',
    rule: "Order demand × the branch's company share % (branch override, else Finance Settings) — the rule every production slip bills on",
    status: 'Production-reviewed demand only',
    date: 'Order business date',
  },
  received: {
    source: 'Finance Ledger income on the Company Share and Fuel heads, plus approved Cash Deposit postings',
    rule: 'Σ debit − credit, so a reversal nets out; deleted entries excluded',
    status: 'Posted to the ledger (entries exist only once approved)',
    date: 'Ledger entry date',
  },
  ledger: {
    source: 'Finance Ledger expense entries (company expenses). Branch shop expenses never reach the ledger.',
    rule: 'Σ credit − debit per ledger head; deleted entries excluded',
    status: 'Posted to the ledger (entries exist only once approved)',
    date: 'Ledger entry date',
  },
  return: {
    source: 'Production returns from branches',
    rule: 'Returned quantity × current product price',
    status: 'Accepted by Production only',
    date: 'Return business date',
  },
  discount: {
    source: 'Production (branch) discounts claimed against a demand',
    rule: 'Claim amount as approved',
    status: 'Approved by Production only',
    date: 'Discount business date',
  },
};

/** "26–50 of 112 records", "No records". */
export function recordsRangeText(page: number, pageSize: number, total: number): string {
  if (!total) return 'No records';
  return `${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total} records`;
}

/** "Created by A · Approved by B", or the web's fallback when neither is recorded. */
export function recordAuditLine(createdBy: string | null | undefined, approvedBy: string | null | undefined): string {
  return [createdBy && `Created by ${createdBy}`, approvedBy && `Approved by ${approvedBy}`].filter(Boolean).join(' · ') || 'No creator / approver recorded';
}

/** A voucher's / demand's load failure in the web dialog's words; Retry only where retrying can help. */
export function recordDetailError(error: unknown, kind: 'voucher' | 'demand'): { message: string; retry: boolean } {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) {
    return {
      message: kind === 'voucher' ? 'This voucher could not be found. It may have been deleted.' : 'This demand could not be found. It may have been cancelled or deleted.',
      retry: false,
    };
  }
  if (status === 403) return { message: `You do not have permission to view this ${kind}.`, retry: false };
  return { message: `This ${kind} could not be loaded.`, retry: true };
}

/** A demand's status in the web DemandDetailDialog's words. */
export const DEMAND_DETAIL_STATUS: Record<string, string> = {
  pending: 'Pending',
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified — Awaiting Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
