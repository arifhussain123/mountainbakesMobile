import type {
  FinanceDashboardMetric,
  FinanceMonthlyDashboard,
  FinanceMonthlyDashboardQuery,
} from '@/api/types';

/**
 * Shaping for the monthly Finance Dashboard — a port of the web's
 * `frontend/src/components/finance/dashboard/dashboard-model.ts`, so a phone
 * and a desktop showing the same filters print the same rows.
 *
 * No money is DERIVED here. Every amount arrives already summed per (business
 * date, branch[, ledger head]) from `GET /finance/dashboard/monthly`; this file
 * only regroups those rows into the period a table shows (day / week / month)
 * and labels them. The one subtraction, Balance = Company Share − Received, is
 * the rule the server's own summary applies, so a row and the card agree.
 */

export type Granularity = 'daily' | 'weekly' | 'monthly';

export const UNASSIGNED_LABEL = 'Company / unassigned';
export const PRODUCTION_ROW_LABEL = 'Production · Return / Discount';
/** The ledger-head filter's value for the production (return / discount) rows. */
export const PRODUCTION_HEAD_FILTER = '~production';
/** How far back the month picker reaches — the web's MONTHS_BACK. */
export const MONTHS_BACK = 24;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function monthLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return `${MONTHS[m - 1]} ${y}`;
}

/** '2026-09' → 'Sep 26' */
export function monthShort(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return `${MONTHS[m - 1]!.slice(0, 3)} ${String(y).slice(2)}`;
}

/** '2026-09' → 'Sep' */
export function monthAbbr(ym: string): string {
  return MONTHS[Number(ym.slice(5, 7)) - 1]!.slice(0, 3);
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function shiftMonth(ym: string, by: number): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** '2026-09-07' → '07 Sep' */
export function dayLabel(date: string): string {
  return `${date.slice(8, 10)} ${MONTHS[Number(date.slice(5, 7)) - 1]!.slice(0, 3)}`;
}

/** "75.4%" — or "—" when the base is zero, never a division by zero. */
export function pct(a: number, b: number): string {
  return b ? `${((a / b) * 100).toFixed(1)}%` : '—';
}

/** Axis ticks: 1.2M / 350k / 900 — the tooltip carries the exact figure. */
export function compact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}${Math.round(a / 1_000)}k`;
  return `${sign}${Math.round(a)}`;
}

/** A round axis ceiling ≥ n: 1, 2, 2.5, 5 × 10^k — 46,250 → 50,000. 0 stays 0. */
export function niceCeil(n: number): number {
  if (!(n > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(n));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/**
 * What a Balance (Company Share − Received) means, in words — so a negative
 * figure is never carried by red alone. Positive: the branch still owes the
 * company; negative: more was received than the share, i.e. overpaid.
 */
export function balanceMeaning(balance: number | null): 'owed' | 'overpaid' | 'settled' | null {
  if (balance === null) return null;
  if (balance > 0) return 'owed';
  if (balance < 0) return 'overpaid';
  return 'settled';
}

const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST

/** "10:28 pm" in Karachi time — the dashboard's "Updated" stamp, from the server's generatedAt. */
export function karachiTime(iso: string | number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const k = new Date(t + KARACHI_OFFSET_MS);
  const h = k.getUTCHours();
  return `${h % 12 || 12}:${pad(k.getUTCMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface DashboardFilter {
  /** `YYYY-MM` */
  month: string;
  /** 1..31; clamped to the month's length when resolved. */
  dayFrom: number;
  dayTo: number;
  /** null = all branches. */
  branchId: string | null;
}

export function defaultFilter(currentMonth: string): DashboardFilter {
  return { month: currentMonth, dayFrom: 1, dayTo: 31, branchId: null };
}

export interface ResolvedFilter {
  from: number;
  to: number;
  daysInMonth: number;
  fullMonth: boolean;
  query: FinanceMonthlyDashboardQuery;
}

/** The web's day clamping: from ≤ to, both inside the month; a full month sends no from/to at all. */
export function resolveFilter(filter: DashboardFilter): ResolvedFilter {
  const nd = daysInMonth(filter.month);
  const f = Math.max(1, Math.min(filter.dayFrom, nd));
  const t = Math.max(f, Math.min(filter.dayTo, nd));
  const fullMonth = f === 1 && t === nd;
  const query: FinanceMonthlyDashboardQuery = { month: filter.month };
  if (!fullMonth) {
    query.from = `${filter.month}-${pad(f)}`;
    query.to = `${filter.month}-${pad(t)}`;
  }
  if (filter.branchId) query.branchId = filter.branchId;
  return { from: f, to: t, daysInMonth: nd, fullMonth, query };
}

/** The last `MONTHS_BACK` months, newest first. */
export function monthOptions(currentMonth: string): string[] {
  return Array.from({ length: MONTHS_BACK }, (_, i) => shiftMonth(currentMonth, -i));
}

/** "01 to 31", "05 to 12". */
export function dayRangeLabel(r: Pick<ResolvedFilter, 'from' | 'to'>): string {
  return `${pad(r.from)} to ${pad(r.to)}`;
}

/** "October 2026 · All Branches" (+ " · 05–12 Oct" when not the full month) — the web's context line. */
export function contextLabel(month: string, scopeLabel: string, r: Pick<ResolvedFilter, 'from' | 'to' | 'fullMonth'>): string {
  return `${monthLong(month)} · ${scopeLabel}${r.fullMonth ? '' : ` · ${pad(r.from)}–${pad(r.to)} ${monthAbbr(month)}`}`;
}

/** Same name the web downloads: finance-2026-10[-branch-name][-05-12].csv */
export function csvFilename(month: string, scopeLabel: string, branchSelected: boolean, r: Pick<ResolvedFilter, 'from' | 'to' | 'fullMonth'>): string {
  return `finance-${month}${branchSelected ? `-${scopeLabel.replace(/\W+/g, '-').toLowerCase()}` : ''}${r.fullMonth ? '' : `-${pad(r.from)}-${pad(r.to)}`}.csv`;
}

/** Anything at all recorded in the window — the web disables Export and shows "No finance records" otherwise. */
export function hasRecords(data: FinanceMonthlyDashboard): boolean {
  const s = data.summary;
  return s.orders + s.receipts + s.ledgerEntries + s.returnCount + s.discountCount > 0;
}

// ---------------------------------------------------------------------------
// Buckets and names
// ---------------------------------------------------------------------------

function bucketOf(gran: Granularity, date: string): string {
  if (gran === 'monthly') return date.slice(0, 7);
  if (gran === 'weekly') return `${date.slice(0, 7)}-W${Math.ceil(Number(date.slice(8, 10)) / 7)}`;
  return date;
}

/** The inclusive date range a bucket covers, clipped to the selected window. */
export function bucketRange(gran: Granularity, key: string, from: string, to: string): { from: string; to: string } {
  let a: string;
  let b: string;
  if (gran === 'daily') {
    a = key;
    b = key;
  } else if (gran === 'monthly') {
    a = `${key}-01`;
    b = `${key}-${pad(daysInMonth(key))}`;
  } else {
    const ym = key.slice(0, 7);
    const w = Number(key.slice(9));
    a = `${ym}-${pad((w - 1) * 7 + 1)}`;
    b = `${ym}-${pad(Math.min(w * 7, daysInMonth(ym)))}`;
  }
  return { from: a < from ? from : a, to: b > to ? to : b };
}

export function bucketLabel(gran: Granularity, key: string, from: string, to: string): string {
  if (gran === 'monthly') return monthLong(key);
  if (gran === 'daily') return `${dayLabel(key)} ${key.slice(0, 4)}`;
  const r = bucketRange(gran, key, from, to);
  return `Week ${key.slice(9)} · ${r.from.slice(8)}–${dayLabel(r.to)}`;
}

export function branchNamer(data: FinanceMonthlyDashboard) {
  const names = new Map(data.branches.map((b) => [b.id, b.isActive ? b.name : `${b.name} (inactive)`]));
  return (id: string | null) => (id === null ? UNASSIGNED_LABEL : names.get(id) ?? 'Unknown branch');
}

// ---------------------------------------------------------------------------
// Income table
// ---------------------------------------------------------------------------

export interface IncomeRow {
  id: string;
  bucket: string;
  period: string;
  branchId: string | null;
  branch: string;
  demand: number;
  companyShare: number;
  received: number;
  balance: number;
  /** Monthly rows only; null = no records last month (or not a monthly row). */
  lastMonthBalance: number | null;
  orders: number;
  receipts: number;
}

export function incomeRows(data: FinanceMonthlyDashboard, gran: Granularity): IncomeRow[] {
  const name = branchNamer(data);
  const prev = new Map(data.previous.map((p) => [p.branchId, p.balance]));
  const map = new Map<string, IncomeRow>();
  for (const d of data.days) {
    // A day with only production adjustments (return / discount) is an EXPENSE
    // row; it is left out here so the income table never shows all-zero rows.
    if (!d.orders && !d.receipts) continue;
    const bucket = bucketOf(gran, d.date);
    const id = `${bucket}|${d.branchId ?? ''}`;
    let row = map.get(id);
    if (!row) {
      row = {
        id,
        bucket,
        period: bucketLabel(gran, bucket, data.from, data.to),
        branchId: d.branchId,
        branch: name(d.branchId),
        demand: 0,
        companyShare: 0,
        received: 0,
        balance: 0,
        lastMonthBalance: gran === 'monthly' ? prev.get(d.branchId) ?? null : null,
        orders: 0,
        receipts: 0,
      };
      map.set(id, row);
    }
    row.demand += d.demand;
    row.companyShare += d.companyShare;
    row.received += d.received;
    row.orders += d.orders;
    row.receipts += d.receipts;
  }
  // A branch that had a balance last month but no activity this month still
  // owes it — show it on the monthly view rather than dropping the carry.
  if (gran === 'monthly') {
    for (const p of data.previous) {
      const id = `${data.month}|${p.branchId ?? ''}`;
      if (map.has(id) || p.balance === null || p.balance === 0) continue;
      if (data.branchId && p.branchId !== data.branchId) continue;
      map.set(id, {
        id,
        bucket: data.month,
        period: monthLong(data.month),
        branchId: p.branchId,
        branch: name(p.branchId),
        demand: 0,
        companyShare: 0,
        received: 0,
        balance: 0,
        lastMonthBalance: p.balance,
        orders: 0,
        receipts: 0,
      });
    }
  }
  return [...map.values()].map((r) => ({
    ...r,
    demand: round2(r.demand),
    companyShare: round2(r.companyShare),
    received: round2(r.received),
    balance: round2(r.companyShare - r.received),
  }));
}

/** No demand, share or receipt this period — a row that is only last month's carry. */
export function isIdleIncomeRow(r: IncomeRow): boolean {
  return !r.orders && !r.receipts && !r.demand && !r.companyShare && !r.received;
}

// ---------------------------------------------------------------------------
// Expense table
// ---------------------------------------------------------------------------

export interface ExpenseRow {
  id: string;
  bucket: string;
  period: string;
  branchId: string | null;
  branch: string;
  /** null for the production-adjustment row. */
  ledgerHeadId: string | null;
  ledgerHead: string;
  /** Ledger amount; null on the production row (it has none). */
  amount: number | null;
  returns: number | null;
  discount: number | null;
  entries: number;
  kind: 'ledger' | 'production';
}

export function expenseRows(data: FinanceMonthlyDashboard, gran: Granularity): ExpenseRow[] {
  const name = branchNamer(data);
  const map = new Map<string, ExpenseRow>();
  for (const l of data.ledger) {
    const bucket = bucketOf(gran, l.date);
    const id = `${bucket}|${l.branchId ?? ''}|${l.ledgerHeadId}`;
    let row = map.get(id);
    if (!row) {
      row = {
        id,
        bucket,
        period: bucketLabel(gran, bucket, data.from, data.to),
        branchId: l.branchId,
        branch: name(l.branchId),
        ledgerHeadId: l.ledgerHeadId,
        ledgerHead: l.ledgerHeadName,
        amount: 0,
        returns: null,
        discount: null,
        entries: 0,
        kind: 'ledger',
      };
      map.set(id, row);
    }
    row.amount = (row.amount ?? 0) + l.amount;
    row.entries += l.entries;
  }
  for (const d of data.days) {
    if (!d.returnCount && !d.discountCount) continue;
    const bucket = bucketOf(gran, d.date);
    const id = `${bucket}|${d.branchId ?? ''}|${PRODUCTION_HEAD_FILTER}`;
    let row = map.get(id);
    if (!row) {
      row = {
        id,
        bucket,
        period: bucketLabel(gran, bucket, data.from, data.to),
        branchId: d.branchId,
        branch: name(d.branchId),
        ledgerHeadId: null,
        ledgerHead: PRODUCTION_ROW_LABEL,
        amount: null,
        returns: 0,
        discount: 0,
        entries: 0,
        kind: 'production',
      };
      map.set(id, row);
    }
    row.returns = (row.returns ?? 0) + d.returns;
    row.discount = (row.discount ?? 0) + d.discount;
    row.entries += d.returnCount + d.discountCount;
  }
  return [...map.values()].map((r) => ({
    ...r,
    amount: r.amount === null ? null : round2(r.amount),
    returns: r.returns === null ? null : round2(r.returns),
    discount: r.discount === null ? null : round2(r.discount),
  }));
}

// ---------------------------------------------------------------------------
// Table order, search and totals — the web's default (period ascending)
// ---------------------------------------------------------------------------

const nullLast = (a: string | null, b: string | null, an: string, bn: string) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : an.localeCompare(bn));

export function sortIncome(rows: IncomeRow[]): IncomeRow[] {
  return [...rows].sort((a, b) => a.bucket.localeCompare(b.bucket) || nullLast(a.branchId, b.branchId, a.branch, b.branch));
}

export function sortExpense(rows: ExpenseRow[]): ExpenseRow[] {
  return [...rows].sort(
    (a, b) =>
      a.bucket.localeCompare(b.bucket) ||
      nullLast(a.branchId, b.branchId, a.branch, b.branch) ||
      (a.kind === b.kind ? 0 : a.kind === 'ledger' ? -1 : 1) ||
      a.ledgerHead.localeCompare(b.ledgerHead),
  );
}

export function searchIncome(rows: IncomeRow[], search: string): IncomeRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => `${r.branch} ${r.period} ${r.bucket}`.toLowerCase().includes(q));
}

/** `head`: '' = all, a ledger head id, or PRODUCTION_HEAD_FILTER. */
export function searchExpense(rows: ExpenseRow[], search: string, head: string): ExpenseRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (head === PRODUCTION_HEAD_FILTER ? r.kind !== 'production' : head && r.ledgerHeadId !== head) return false;
    return !q || `${r.branch} ${r.ledgerHead} ${r.period} ${r.bucket}`.toLowerCase().includes(q);
  });
}

export interface IncomeTotals {
  demand: number;
  companyShare: number;
  received: number;
  balance: number;
  /** Monthly view only — a daily or weekly row carries no last-month figure. */
  lastMonthBalance: number | null;
}

export function incomeTotals(rows: IncomeRow[], gran: Granularity): IncomeTotals {
  const sum = (k: 'demand' | 'companyShare' | 'received' | 'balance') => round2(rows.reduce((a, r) => a + r[k], 0));
  return {
    demand: sum('demand'),
    companyShare: sum('companyShare'),
    received: sum('received'),
    balance: sum('balance'),
    lastMonthBalance: gran === 'monthly' ? round2(rows.reduce((a, r) => a + (r.lastMonthBalance ?? 0), 0)) : null,
  };
}

export function expenseTotals(rows: ExpenseRow[]): { amount: number; returns: number; discount: number } {
  return {
    amount: round2(rows.reduce((a, r) => a + (r.amount ?? 0), 0)),
    returns: round2(rows.reduce((a, r) => a + (r.returns ?? 0), 0)),
    discount: round2(rows.reduce((a, r) => a + (r.discount ?? 0), 0)),
  };
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

export interface DailyPoint {
  date: string;
  label: string;
  companyShare: number;
  received: number;
  ledger: number;
  returns: number;
  discount: number;
}

/** Every business date of the window, zero-filled, with that day's totals across the scope. */
export function dailySeries(data: FinanceMonthlyDashboard): DailyPoint[] {
  const out: DailyPoint[] = [];
  const byDate = new Map<string, DailyPoint>();
  const start = new Date(`${data.from}T00:00:00Z`).getTime();
  const end = new Date(`${data.to}T00:00:00Z`).getTime();
  for (let t = start; t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    const row = { date, label: date.slice(8, 10), companyShare: 0, received: 0, ledger: 0, returns: 0, discount: 0 };
    out.push(row);
    byDate.set(date, row);
  }
  for (const d of data.days) {
    const r = byDate.get(d.date);
    if (!r) continue;
    r.companyShare += d.companyShare;
    r.received += d.received;
    r.returns += d.returns;
    r.discount += d.discount;
  }
  for (const l of data.ledger) {
    const r = byDate.get(l.date);
    if (r) r.ledger += l.amount;
  }
  return out.map((r) => ({
    ...r,
    companyShare: round2(r.companyShare),
    received: round2(r.received),
    ledger: round2(r.ledger),
    returns: round2(r.returns),
    discount: round2(r.discount),
  }));
}

export interface BranchTotals {
  branchId: string | null;
  branch: string;
  demand: number;
  companyShare: number;
  received: number;
  balance: number;
  ledger: number;
  returns: number;
  discount: number;
}

/** Per branch (null = unassigned, sorted last), alphabetical. */
export function branchTotals(data: FinanceMonthlyDashboard): BranchTotals[] {
  const name = branchNamer(data);
  const map = new Map<string | null, BranchTotals>();
  const get = (b: string | null) => {
    let r = map.get(b);
    if (!r) {
      r = { branchId: b, branch: name(b), demand: 0, companyShare: 0, received: 0, balance: 0, ledger: 0, returns: 0, discount: 0 };
      map.set(b, r);
    }
    return r;
  };
  for (const d of data.days) {
    const r = get(d.branchId);
    r.demand += d.demand;
    r.companyShare += d.companyShare;
    r.received += d.received;
    r.returns += d.returns;
    r.discount += d.discount;
  }
  for (const l of data.ledger) get(l.branchId).ledger += l.amount;
  return [...map.values()]
    .map((r) => ({
      ...r,
      demand: round2(r.demand),
      companyShare: round2(r.companyShare),
      received: round2(r.received),
      balance: round2(r.companyShare - r.received),
      ledger: round2(r.ledger),
      returns: round2(r.returns),
      discount: round2(r.discount),
    }))
    .sort((a, b) => (a.branchId === null ? 1 : b.branchId === null ? -1 : a.branch.localeCompare(b.branch)));
}

export interface LedgerHeadTotal {
  ledgerHeadId: string;
  name: string;
  amount: number;
  entries: number;
}

/** By head, largest first. */
export function ledgerHeadTotals(data: FinanceMonthlyDashboard): LedgerHeadTotal[] {
  const map = new Map<string, LedgerHeadTotal>();
  for (const l of data.ledger) {
    const r = map.get(l.ledgerHeadId) ?? { ledgerHeadId: l.ledgerHeadId, name: l.ledgerHeadName, amount: 0, entries: 0 };
    r.amount += l.amount;
    r.entries += l.entries;
    map.set(l.ledgerHeadId, r);
  }
  return [...map.values()].map((r) => ({ ...r, amount: round2(r.amount) })).sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// CSV — the web's export, byte for byte
// ---------------------------------------------------------------------------

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    if (v === null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

/** Both tables at the chosen granularities — unfiltered by the tables' own search, as on the web. */
export function dashboardCsv(data: FinanceMonthlyDashboard, context: string, incGran: Granularity, expGran: Granularity): string {
  const inc = incomeRows(data, incGran);
  const exp = expenseRows(data, expGran);
  return [
    `Mountain Bakes Finance — ${context}`,
    '',
    'INCOME',
    toCsv(
      ['Period', 'Branch Name', 'Demand Amount', 'Company Share', 'Received Amount', 'Balance', 'Last Month Balance'],
      inc.map((r) => [r.period, r.branch, r.demand, r.companyShare, r.received, r.balance, r.lastMonthBalance]),
    ),
    '',
    'EXPENSES',
    toCsv(
      ['Period', 'Branch Name', 'Ledger Head', 'Amount', 'Return', 'Discount'],
      exp.map((r) => [r.period, r.branch, r.ledgerHead, r.amount, r.returns, r.discount]),
    ),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Drill-down
// ---------------------------------------------------------------------------

export interface DrillTarget {
  metric: FinanceDashboardMetric;
  from: string;
  to: string;
  /** undefined = the dashboard's branch filter; null = unassigned rows only. */
  branchId?: string | null;
  ledgerHeadId?: string;
  /** The line under the title, e.g. "07 Oct 2026 · All Branches". */
  context: string;
}

export const METRIC_INFO: Record<FinanceDashboardMetric, { title: string; rule: string; refLabel: string }> = {
  demand: { title: 'Demand Amount', rule: 'Production-reviewed orders · approved qty × product price', refLabel: 'Demand no.' },
  share: { title: 'Company Share', rule: "Demand × the branch's company share %", refLabel: 'Demand no.' },
  received: { title: 'Received Amount', rule: 'Ledger income on Company Share and Fuel heads, plus Cash Deposits', refLabel: 'Voucher' },
  ledger: { title: 'Ledger Expense', rule: 'Ledger expense entries, credit − debit per head', refLabel: 'Voucher' },
  return: { title: 'Return', rule: 'Accepted production returns · qty × product price', refLabel: 'Reference' },
  discount: { title: 'Discount', rule: 'Approved production discounts', refLabel: 'Demand no.' },
};
