import type { BranchSalesGroup, FinanceMonthlyDashboard } from '@/api/types';
import { branchNamer, bucketRange, dayLabel, daysInMonth } from '@/features/finance/utils/dashboardModel';

/**
 * Shaping for the Super Admin dashboard — a port of the web's
 * `frontend/src/components/dashboard/admin/admin-model.ts`. No money is
 * derived: every amount is a server sum from `/finance/dashboard/monthly`,
 * `/sales-analytics` or the orders aggregate; these functions only regroup
 * those rows (per branch, per day, per week) and label them.
 */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "1 order", "3 orders" — with thousands separators, as the web's `plural`. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** "75.4%" — or "—" when the base is zero. */
export function pctOf(a: number, b: number): string {
  return b ? `${((a / b) * 100).toFixed(1)}%` : '—';
}

function shiftDay(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Live sales — paid sales per branch for a chosen period
// ---------------------------------------------------------------------------

export type SalesPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const SALES_PERIODS: { value: SalesPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Date' },
];

/**
 * The business dates a period covers (`today` is the business date). The week
 * starts on Monday; week and month run to today. A custom range is put in
 * order and clamped to today.
 */
export function salesPeriodRange(period: SalesPeriod, today: string, custom?: { from: string; to: string }): { from: string; to: string } {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = shiftDay(today, -1);
      return { from: y, to: y };
    }
    case 'week': {
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
      return { from: shiftDay(today, -((dow + 6) % 7)), to: today };
    }
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'custom': {
      const a = custom?.from || today;
      const b = custom?.to || a;
      const [from, to] = a <= b ? [a, b] : [b, a];
      return { from: from > today ? today : from, to: to > today ? today : to };
    }
  }
}

/** "Today's Sales", "This Week's Sales", "Sales · 03 Oct – 09 Oct 2026". */
export function salesPeriodLabel(period: SalesPeriod, from: string, to: string): string {
  if (period === 'today') return "Today's Sales";
  if (period === 'yesterday') return "Yesterday's Sales";
  if (period === 'week') return "This Week's Sales";
  if (period === 'month') return "This Month's Sales";
  return from === to ? `Sales · ${dayLabel(from)} ${from.slice(0, 4)}` : `Sales · ${dayLabel(from)} – ${dayLabel(to)} ${to.slice(0, 4)}`;
}

/** "07 Oct 2026" or "01 Oct – 07 Oct 2026". */
export function dateRangeText(from: string, to: string): string {
  return from === to ? `${dayLabel(from)} ${from.slice(0, 4)}` : `${dayLabel(from)} – ${dayLabel(to)} ${to.slice(0, 4)}`;
}

export interface LiveSaleRow {
  branchId: string;
  branch: string;
  sales: number;
  orders: number;
}

/**
 * One card per branch that sold in the period. Groups are merged by branch id
 * (a renamed branch's orders can carry an old name); a branch at Rs. 0 gets no
 * card; an inactive branch is suffixed; a branch missing from the list keeps
 * its money under the name its orders carry. Largest first.
 */
export function liveSaleRows(branches: { id: string; name: string; isActive?: boolean }[], groups: BranchSalesGroup[]): LiveSaleRow[] {
  const sold = new Map<string, { name: string; sales: number; orders: number }>();
  for (const g of groups) {
    if (!g.branchId) continue;
    const prev = sold.get(g.branchId) ?? { name: g.branchName, sales: 0, orders: 0 };
    prev.sales += g.sales;
    prev.orders += g.orders;
    sold.set(g.branchId, prev);
  }
  const rows: LiveSaleRow[] = [];
  for (const b of branches) {
    const s = sold.get(b.id);
    sold.delete(b.id);
    if (!s?.sales) continue;
    rows.push({ branchId: b.id, branch: b.isActive === false ? `${b.name} (inactive)` : b.name, sales: round2(s.sales), orders: s.orders });
  }
  for (const [id, s] of sold) {
    if (!s.sales) continue;
    rows.push({ branchId: id, branch: s.name || 'Unknown branch', sales: round2(s.sales), orders: s.orders });
  }
  return rows.sort((a, b) => b.sales - a.sales || a.branch.localeCompare(b.branch));
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export interface DailyDemandPoint {
  date: string;
  label: string;
  /** null for a day after today — it has not happened. */
  demand: number | null;
  orders: number;
}

/** Approved demand per business date of the window — dense; a quiet day is 0, a future day null. */
export function dailyDemand(data: FinanceMonthlyDashboard): DailyDemandPoint[] {
  const byDate = new Map(datesBetween(data.from, data.to).map((date) => [date, { date, label: date.slice(8, 10), demand: 0, orders: 0 }]));
  for (const d of data.days) {
    const r = byDate.get(d.date);
    if (!r) continue;
    r.demand += d.demand;
    r.orders += d.orders;
  }
  return [...byDate.values()].map((r) => ({ ...r, demand: r.date > data.businessDate ? null : round2(r.demand) }));
}

export interface WeekReturnsDiscount {
  key: string;
  label: string;
  from: string;
  to: string;
  returns: number;
  discount: number;
}

/** Return and discount per week of the month (days 1–7, 8–14, …), clipped to the window; weeks not yet started are left off. */
export function weeklyReturnsDiscount(data: FinanceMonthlyDashboard): WeekReturnsDiscount[] {
  const weekOf = (date: string) => `${date.slice(0, 7)}-W${Math.ceil(Number(date.slice(8, 10)) / 7)}`;
  const weeks = new Map<string, WeekReturnsDiscount>();
  for (const date of datesBetween(data.from, data.to)) {
    if (date > data.businessDate) break;
    const key = weekOf(date);
    if (weeks.has(key)) continue;
    const r = bucketRange('weekly', key, data.from, data.to);
    weeks.set(key, { key, label: r.from === r.to ? dayLabel(r.from) : `${r.from.slice(8)}–${dayLabel(r.to)}`, ...r, returns: 0, discount: 0 });
  }
  for (const d of data.days) {
    const w = weeks.get(weekOf(d.date));
    if (!w) continue;
    w.returns += d.returns;
    w.discount += d.discount;
  }
  return [...weeks.values()].map((w) => ({ ...w, returns: round2(w.returns), discount: round2(w.discount) }));
}

export interface DemandComparison {
  currentAvg: number;
  previousAvg: number;
  /** null when the previous month had no demand. */
  changePct: number | null;
  previousMonth: string;
}

/**
 * The window's daily average against last month's whole-month average.
 * Averages, not totals: a month to date holds fewer days. Null when no day of
 * the window has happened yet.
 */
export function demandComparison(data: FinanceMonthlyDashboard): DemandComparison | null {
  const end = data.to < data.businessDate ? data.to : data.businessDate;
  if (end < data.from) return null;
  const elapsed = datesBetween(data.from, end).length;
  const current = data.days.reduce((s, d) => (d.date <= end ? s + d.demand : s), 0);
  const prev = data.trend.find((m) => m.month === data.previousMonth)?.demand ?? 0;
  const currentAvg = current / elapsed;
  const previousAvg = prev / daysInMonth(data.previousMonth);
  return {
    currentAvg: round2(currentAvg),
    previousAvg: round2(previousAvg),
    changePct: previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : null,
    previousMonth: data.previousMonth,
  };
}

export interface BranchDemandRow {
  branchId: string | null;
  branch: string;
  demand: number;
  orders: number;
}

/**
 * Demand and demand count per branch with any demand in the window — the
 * web's `branchSummaryRows(data).filter((r) => r.demand > 0)`: alphabetical,
 * the unassigned row last.
 */
export function branchDemandRows(data: FinanceMonthlyDashboard): BranchDemandRow[] {
  const name = branchNamer(data);
  const by = new Map<string | null, BranchDemandRow>();
  for (const d of data.days) {
    const r = by.get(d.branchId) ?? { branchId: d.branchId, branch: name(d.branchId), demand: 0, orders: 0 };
    r.demand += d.demand;
    r.orders += d.orders;
    by.set(d.branchId, r);
  }
  return [...by.values()]
    .map((r) => ({ ...r, demand: round2(r.demand) }))
    .filter((r) => r.demand > 0)
    .sort((a, b) => (a.branchId === null ? 1 : b.branchId === null ? -1 : a.branch.localeCompare(b.branch)));
}

// ---------------------------------------------------------------------------
// Login history
// ---------------------------------------------------------------------------

export type LoginDatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'month';

export const LOGIN_DATE_OPTIONS: { value: LoginDatePreset; label: string }[] = [
  { value: 'all', label: 'Any Date' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: '7 Days' },
  { value: 'month', label: 'This Month' },
];

export const LOGIN_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'super_admin', label: 'Admin' },
  { value: 'branch_manager', label: 'Branch' },
  { value: 'production_user', label: 'Production' },
  { value: 'finance_admin', label: 'Finance Admin' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'finance_auditor', label: 'Finance Auditor' },
];

/** Business dates the API filters login history on. */
export function loginDateWindow(preset: LoginDatePreset, today: string): { from?: string; to?: string } {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday':
      return { from: shiftDay(today, -1), to: shiftDay(today, -1) };
    case 'last7':
      return { from: shiftDay(today, -6), to: today };
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    default:
      return {};
  }
}

/** '3h 42m', '18m', '45s', '—'. */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${pad2(minutes)}m`;
  return `${minutes}m`;
}

/** 'Samsung SM-A155F (Mobile)', 'Desktop', '—'. */
export function formatDeviceKind(s: { deviceType: string | null; deviceName?: string | null }): string {
  const kind = s.deviceType && s.deviceType !== 'unknown' ? s.deviceType.charAt(0).toUpperCase() + s.deviceType.slice(1) : null;
  if (s.deviceName && kind) return `${s.deviceName} (${kind})`;
  return s.deviceName || kind || '—';
}

export const SESSION_STATE_LABELS: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
  ended: 'Signed out',
  expired: 'Tab closed',
  revoked: 'Signed out by admin',
};
