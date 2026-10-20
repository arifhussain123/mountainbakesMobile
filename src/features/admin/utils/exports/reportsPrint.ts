import type { PackingUsageRow, ReportSummary } from '@/api/types';
import { TEXT_COLUMNS, joinLines, kvLine, ruleLine, textTable } from '@/shared/utils/textLayout';
import { PAYMENT_METHOD_LABELS } from './dashboardExport';

/**
 * Reports & Analytics → Print — the web page's print (`ReportsPage`, the
 * whole `print-area`): heading and range, the six stat cards, Payment
 * Methods, and the tab that is open (only the open tab's content exists on
 * the page, so only it prints): Sales Trend, Branch Comparison, Top Products
 * or Packing Materials. Amounts use the page's own `Rs.1,234`.
 */

export type ReportsPrintTab = 'sales' | 'branches' | 'products' | 'packing';

const rs = (n: number) => `Rs.${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const n0 = (n: number) => (Number(n) || 0).toLocaleString('en-US');

export interface ReportsPackingPrint {
  rangeText: string;
  branchLabel: string;
  materialLabel: string;
  totals: { requested: number; approved: number; delivered: number };
  /** The rows loaded on the screen. */
  rows: PackingUsageRow[];
  total: number;
}

export function buildReportsPrintText(s: ReportSummary, tab: ReportsPrintTab, packing?: ReportsPackingPrint): string {
  const w = TEXT_COLUMNS.a4;
  const kv = (k: string, v: string) => kvLine(k, v, w);
  const methods = s.paymentMethodBreakdown ?? [];
  const body: string[] = [];

  if (tab === 'sales') {
    body.push(
      'SALES TREND',
      ...textTable(
        [{ header: 'Date' }, { header: 'Orders', width: 7 }, { header: 'Revenue', width: 13 }, { header: 'Expenses', width: 12 }, { header: 'Profit', width: 12 }],
        (s.dailyData ?? []).map((d) => [d.date.slice(0, 10), n0(d.totalOrders), rs(d.totalRevenue), rs(d.expenses), rs(d.profit)]),
        w,
      ),
    );
  } else if (tab === 'branches') {
    body.push(
      'BRANCH COMPARISON',
      ...textTable(
        [{ header: 'Branch' }, { header: 'Orders', width: 8 }, { header: 'Revenue', width: 14 }, { header: 'Avg. Order', width: 12 }],
        (s.branchData ?? []).map((b) => [b.branchName, n0(b.totalOrders), rs(b.totalRevenue), rs(b.averageOrderValue)]),
        w,
      ),
    );
  } else if (tab === 'products') {
    body.push(
      'TOP 10 PRODUCTS',
      ...textTable(
        [{ header: '#  Product (Category)' }, { header: 'Qty', width: 8 }, { header: 'Revenue', width: 14 }],
        (s.topProducts ?? []).slice(0, 10).map((p, i) => [`${i + 1}. ${p.productName}${p.categoryName ? ` (${p.categoryName})` : ''}`, String(p.totalQty), rs(p.totalRevenue)]),
        w,
      ),
    );
  } else if (packing) {
    body.push(
      'PACKING MATERIALS',
      ...kv('Date', packing.rangeText),
      ...kv('Branch', packing.branchLabel),
      ...kv('Packing Material', packing.materialLabel),
      ...kv('Total Requested', n0(packing.totals.requested)),
      ...kv('Total Approved', n0(packing.totals.approved)),
      ...kv('Total Delivered', n0(packing.totals.delivered)),
      `${n0(packing.total)} ${packing.total === 1 ? 'row' : 'rows'}${packing.rows.length < packing.total ? ` · ${n0(packing.rows.length)} loaded on this screen` : ''}`,
      ...textTable(
        [{ header: 'Date · Branch · Material' }, { header: 'Requested', width: 9 }, { header: 'Approved', width: 9 }, { header: 'Delivered', width: 9 }],
        packing.rows.map((r) => [`${r.date} · ${r.branchName} · ${r.materialName}`, n0(r.requestedQty), n0(r.approvedQty), n0(r.deliveredQty)]),
        w,
      ),
    );
  }

  return joinLines([
    'Reports & Analytics',
    `${s.from?.slice(0, 10) ?? ''} – ${s.to?.slice(0, 10) ?? ''}`,
    '='.repeat(w),
    ...kv('Total Orders', n0(s.totalOrders)),
    ...kv('Revenue', rs(s.totalRevenue)),
    ...kv('Avg. Order Value', rs(s.averageOrderValue)),
    ...kv('Cancelled', String(s.totalCancelled ?? 0)),
    ...kv('Expenses', rs(s.totalExpenses)),
    ...kv('Profit (Sales − Expenses)', rs(s.totalProfit)),
    '',
    'PAYMENT METHODS',
    ruleLine(w),
    ...(methods.length === 0 ? ['No sales in this period'] : methods.flatMap((pm) => kv(`${PAYMENT_METHOD_LABELS[pm.method] ?? pm.method} (${pm.count})`, rs(pm.total)))),
    '',
    ...body,
  ]);
}
