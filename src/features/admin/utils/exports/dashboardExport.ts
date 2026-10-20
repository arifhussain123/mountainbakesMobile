import type { FinanceMonthlyDashboard, ReportSummary, SalesAnalytics } from '@/api/types';
import {
  branchTotals,
  expenseRows,
  incomeRows,
  monthLong,
  toCsv,
  type BranchTotals,
  type Granularity,
} from '@/features/finance/utils/dashboardModel';
import { formatMoney2 } from '@/features/finance/utils/financeFormat';
import { TEXT_COLUMNS, joinLines, kvLine, ruleLine, textTable } from '@/shared/utils/textLayout';

/**
 * The Admin Dashboard's Export CSV and Print — the web's `adminCsv`
 * (`components/dashboard/admin/admin-model.ts`) byte for byte, and the page's
 * printed sections (Today, the month's tiles, Sales Overview, Finance
 * Summary) as a text document. Every amount is a server sum; rows are only
 * regrouped here.
 */

/** The web's PAYMENT_METHOD_LABELS. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
  staff: 'Staff',
  card: 'Card',
  online: 'Online',
};

const paymentLabel = (m: string) => PAYMENT_METHOD_LABELS[m] ?? m;

export interface BranchSummaryRow extends BranchTotals {
  lastMonthBalance: number | null;
  orders: number;
}

/**
 * The web's `branchSummaryRows`: every branch with figures in the window,
 * then every active branch without any (at zero) — within the branch filter.
 */
export function branchSummaryRows(data: FinanceMonthlyDashboard): BranchSummaryRow[] {
  const prev = new Map(data.previous.map((p) => [p.branchId, p.balance]));
  const orders = new Map<string | null, number>();
  for (const d of data.days) orders.set(d.branchId, (orders.get(d.branchId) ?? 0) + d.orders);
  const rows: BranchSummaryRow[] = branchTotals(data).map((b) => ({
    ...b,
    lastMonthBalance: prev.get(b.branchId) ?? null,
    orders: orders.get(b.branchId) ?? 0,
  }));
  const seen = new Set(rows.map((r) => r.branchId));
  for (const b of data.branches) {
    if (!b.isActive || seen.has(b.id)) continue;
    if (data.branchId && data.branchId !== b.id) continue;
    rows.push({
      branchId: b.id,
      branch: b.name,
      demand: 0,
      companyShare: 0,
      received: 0,
      balance: 0,
      ledger: 0,
      returns: 0,
      discount: 0,
      lastMonthBalance: prev.get(b.id) ?? null,
      orders: 0,
    });
  }
  return rows;
}

export interface AdminDashboardExportInput {
  /** "October 2026 · All Branches" (+ " · 01–07 Oct" for a day range). */
  context: string;
  finance: FinanceMonthlyDashboard;
  sales: SalesAnalytics | null;
  incGran: Granularity;
  expGran: Granularity;
}

/** Everything the page shows, one block per section, in the page's own order — the web's `adminCsv`. */
export function adminDashboardCsv({ context, finance, sales, incGran, expGran }: AdminDashboardExportInput): string {
  const s = finance.summary;
  const blocks: string[] = [`Mountain Bakes Admin Dashboard — ${context}`];
  if (sales) {
    blocks.push(
      'SALES',
      toCsv(
        ['Total Sales', 'Transactions', 'Average Daily Sales', 'Staff Sales (unpaid)'],
        [[sales.totalSales, sales.totalTransactions, sales.averageDailySales, sales.staffTotal ?? 0]],
      ),
      'PAYMENT METHODS',
      toCsv(['Method', 'Transactions', 'Amount'], sales.paymentMethods.map((p) => [paymentLabel(p.method), p.count, p.total])),
      'TOP SELLING PRODUCTS',
      toCsv(
        ['Rank', 'Product', 'Category', 'Qty Sold', 'Sales'],
        sales.topProducts.map((p, i) => [i + 1, p.productName, p.categoryName, p.qty, p.sales]),
      ),
    );
  }
  blocks.push(
    'BRANCH SUMMARY',
    toCsv(
      [
        'Branch',
        'Demand Amount',
        'Company Share',
        'Received Amount',
        'Balance',
        'Ledger Expense',
        'Return',
        'Discount',
        `Last Month Balance (${monthLong(finance.previousMonth)})`,
      ],
      [
        ...branchSummaryRows(finance).map((r) => [r.branch, r.demand, r.companyShare, r.received, r.balance, r.ledger, r.returns, r.discount, r.lastMonthBalance]),
        ['Total', s.demand, s.companyShare, s.received, s.balance, s.ledgerExpense, s.returns, s.discount, s.lastMonthBalance],
      ],
    ),
    'INCOME',
    toCsv(
      ['Period', 'Branch Name', 'Demand Amount', 'Company Share', 'Received Amount', 'Balance', 'Last Month Balance'],
      incomeRows(finance, incGran).map((r) => [r.period, r.branch, r.demand, r.companyShare, r.received, r.balance, r.lastMonthBalance]),
    ),
    'EXPENSES',
    toCsv(
      ['Period', 'Branch Name', 'Ledger Head', 'Amount', 'Return', 'Discount'],
      expenseRows(finance, expGran).map((r) => [r.period, r.branch, r.ledgerHead, r.amount, r.returns, r.discount]),
    ),
  );
  return blocks.join('\n\n');
}

/** The web's CSV file name: `admin-dashboard-2026-10[-branch][-01-07].csv`. */
export function adminDashboardCsvName(month: string, scopeLabel: string | null, range: { from: number; to: number } | null): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `admin-dashboard-${month}${scopeLabel ? `-${scopeLabel.replace(/\W+/g, '-').toLowerCase()}` : ''}${range ? `-${pad(range.from)}-${pad(range.to)}` : ''}.csv`;
}

export interface AdminDashboardToday {
  /** "Business day 20 Oct 2026 · All Branches". */
  heading: string;
  summary: ReportSummary | null;
  waitingOrders: number | null;
  activeBranches: number | null;
  lowStock: number | null;
}

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
const count = (n: number) => n.toLocaleString('en-US');
const orDash = (n: number | null | undefined, f: (v: number) => string) => (n === null || n === undefined ? '—' : f(n));

/**
 * Print — the dashboard as a text report, in the page's order. The web's
 * print leaves off its working screens (Live Production, Login History) and
 * so does this; Live Sales — All Branches has its own request inside its
 * section and is not repeated here.
 */
export function adminDashboardPrintText(input: AdminDashboardExportInput & { today: AdminDashboardToday | null; updatedAt: string | null }): string {
  const { context, finance, sales, incGran, expGran, today } = input;
  const w = TEXT_COLUMNS.a4;
  const s = finance.summary;
  const m = formatMoney2;
  const kv = (k: string, v: string) => kvLine(k, v, w);
  const section = (title: string, sub?: string) => ['', '='.repeat(w), title.toUpperCase(), ...(sub ? [sub] : []), ruleLine(w)];
  const t = today?.summary ?? null;
  const prevMonth = monthLong(finance.previousMonth);

  const branchBlock = (r: { branch: string; demand: number; companyShare: number; received: number; balance: number; ledger: number; returns: number; discount: number; lastMonthBalance: number | null }) => [
    r.branch,
    ...kv('  Demand Amount', m(r.demand)),
    ...kv('  Company Share', m(r.companyShare)),
    ...kv('  Received Amount', m(r.received)),
    ...kv('  Balance', m(r.balance)),
    ...kv('  Ledger Expense', m(r.ledger)),
    ...kv('  Return', m(r.returns)),
    ...kv('  Discount', m(r.discount)),
    ...kv(`  Last Month Balance (${prevMonth})`, orDash(r.lastMonthBalance, m)),
  ];

  return joinLines([
    'Mountain Bakes — Admin Dashboard',
    `Sales, branch, production & finance summary · ${context}`,
    ...(input.updatedAt ? [`Updated ${input.updatedAt}`] : []),

    ...(today
      ? [
          ...section('Today', today.heading),
          ...kv("Today's Sales", t ? `${m(t.totalRevenue)} (${count(t.totalOrders)} ${t.totalOrders === 1 ? 'order' : 'orders'})` : '—'),
          ...kv("Today's Shop Expenses", t ? m(t.totalExpenses) : '—'),
          ...kv("Today's Profit", t ? m(t.totalProfit) : '—'),
          ...kv('Pending Orders', t ? count(t.totalPending) : '—'),
          ...kv('Waiting Production Orders', orDash(today.waitingOrders, count)),
          ...kv('Active Branches', orDash(today.activeBranches, count)),
          ...kv('Low-Stock Products', orDash(today.lowStock, count)),
        ]
      : []),

    ...section(monthLong(finance.month), `Sales, Company Share and Finance Ledger · ${context}`),
    ...kv('Total Sales', sales ? `${m(sales.totalSales)} (${count(sales.totalTransactions)} transactions)` : '—'),
    ...kv('Company Share', `${m(s.companyShare)} (${pct(s.companyShare, s.demand)} of ${m(s.demand)} demand)`),
    ...kv('Received', `${m(s.received)} (${pct(s.received, s.companyShare)} of company share)`),
    ...kv('Balance', s.lastMonthBalance === null ? `${m(s.balance)} (no records in ${prevMonth})` : `${m(s.balance)} (${prevMonth}: ${m(s.lastMonthBalance)})`),

    ...(sales
      ? [
          ...section('Sales Overview', `Point-of-sale orders · ${context}`),
          ...kv('Total Sales', m(sales.totalSales)),
          ...kv('Transactions', count(sales.totalTransactions)),
          ...kv('Average Sale', sales.totalTransactions ? m(sales.totalSales / sales.totalTransactions) : '—'),
          ...kv('Average Daily Sales', m(sales.averageDailySales)),
          ...kv('Staff Sales (unpaid)', m(sales.staffTotal ?? 0)),
          '',
          'PAYMENT METHODS',
          ...textTable(
            [{ header: 'Method' }, { header: 'Transactions', width: 12 }, { header: 'Amount', width: 18 }],
            sales.paymentMethods.map((p) => [paymentLabel(p.method), count(p.count), m(p.total)]),
            w,
          ),
          '',
          'TOP SELLING PRODUCTS',
          ...textTable(
            [{ header: '#  Product (Category)' }, { header: 'Qty Sold', width: 9 }, { header: 'Sales', width: 18 }],
            sales.topProducts.map((p, i) => [`${i + 1}. ${p.productName}${p.categoryName ? ` (${p.categoryName})` : ''}`, count(p.qty), m(p.sales)]),
            w,
          ),
        ]
      : []),

    ...section('Branch Summary', context),
    ...branchSummaryRows(finance).flatMap(branchBlock),
    ...branchBlock({ branch: 'Total', ledger: s.ledgerExpense, ...s }),

    ...section('Income', `${incGran} · ${context}`),
    ...incomeRows(finance, incGran).flatMap((r) => [
      `${r.period} · ${r.branch}`,
      ...kv('  Demand Amount', m(r.demand)),
      ...kv('  Company Share', m(r.companyShare)),
      ...kv('  Received Amount', m(r.received)),
      ...kv('  Balance', m(r.balance)),
      ...kv('  Last Month Balance', orDash(r.lastMonthBalance, m)),
    ]),

    ...section('Expenses', `${expGran} · ${context}`),
    ...expenseRows(finance, expGran).flatMap((r) => [
      `${r.period} · ${r.branch} · ${r.ledgerHead}`,
      ...kv('  Amount', orDash(r.amount, m)),
      ...kv('  Return', orDash(r.returns, m)),
      ...kv('  Discount', orDash(r.discount, m)),
    ]),
  ]);
}
