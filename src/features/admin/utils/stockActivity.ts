import type { BranchStockHistoryRow, BranchStockSummaryRow, StockRow } from '@/api';

/**
 * Pure helpers behind Super Admin's Branch Stock tab — the web
 * `/stock-control` page (`AdminBranchStockPage`, `BranchStockHistoryCard`,
 * `AllBranchesStockSummary`).
 */

type Movement = Pick<BranchStockHistoryRow, 'adjustmentQty' | 'returnedQty' | 'adjustmentAmount' | 'returnedAmount'>;

/** Ret / Adj — returns and corrections netted and signed, so Previous + New − Sold + Ret/Adj = Remaining. */
export const otherQty = (r: Movement): number => r.adjustmentQty - r.returnedQty;
export const otherAmount = (r: Movement): number => r.adjustmentAmount - r.returnedAmount;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → 'Thu 21 Aug', built from the parts so no timezone can shift the day. */
export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

/** 'YYYY-MM-DD' moved by `delta` calendar days — string in, string out, no local-timezone parsing. */
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** The ledger search: product name or stock code, case-insensitive. */
export function filterStockRows(rows: StockRow[], search: string): StockRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => r.productName.toLowerCase().includes(q) || (r.stockCode ?? '').toLowerCase().includes(q));
}

export interface StockActivityTotals {
  openingQty: number;
  openingAmount: number;
  newQty: number;
  newAmount: number;
  soldQty: number;
  soldAmount: number;
  otherQty: number;
  otherAmount: number;
  balanceQty: number;
  balanceAmount: number;
}

/**
 * The company-wide Total row. Previous and Remaining sum too: they are balances
 * at one instant across DIFFERENT branches, so their sum is real stock held.
 */
export function totalBranchSummary(rows: BranchStockSummaryRow[]): StockActivityTotals {
  return rows.reduce<StockActivityTotals>(
    (acc, r) => ({
      openingQty: acc.openingQty + r.openingQty,
      openingAmount: acc.openingAmount + r.openingAmount,
      newQty: acc.newQty + r.newQty,
      newAmount: acc.newAmount + r.newAmount,
      soldQty: acc.soldQty + r.soldQty,
      soldAmount: acc.soldAmount + r.soldAmount,
      otherQty: acc.otherQty + otherQty(r),
      otherAmount: acc.otherAmount + otherAmount(r),
      balanceQty: acc.balanceQty + r.balanceQty,
      balanceAmount: acc.balanceAmount + r.balanceAmount,
    }),
    { openingQty: 0, openingAmount: 0, newQty: 0, newAmount: 0, soldQty: 0, soldAmount: 0, otherQty: 0, otherAmount: 0, balanceQty: 0, balanceAmount: 0 },
  );
}

/** A history/summary row in the shape the activity card renders. */
export function toActivityFigures(r: BranchStockHistoryRow | BranchStockSummaryRow): StockActivityTotals {
  return {
    openingQty: r.openingQty,
    openingAmount: r.openingAmount,
    newQty: r.newQty,
    newAmount: r.newAmount,
    soldQty: r.soldQty,
    soldAmount: r.soldAmount,
    otherQty: otherQty(r),
    otherAmount: otherAmount(r),
    balanceQty: r.balanceQty,
    balanceAmount: r.balanceAmount,
  };
}
