import type { ProductionOrder, StockRow } from '@/api';

export interface StockTotals {
  opening: number;
  newQty: number;
  sold: number;
  returned: number;
  adjustment: number;
  balance: number;
  waitingDemand: number;
  expectedBalance: number;
}

export interface StockRowWithDemand extends StockRow {
  waitingDemand: number;
  expectedBalance: number;
}

/**
 * The web Stock page's own filter (`frontend/src/shared/utils/stock.ts`), ported
 * verbatim: `adjustment` is deliberately excluded — the balance identity makes
 * adjustment-only-nonzero impossible when every other figure is zero, so
 * checking it adds nothing. Don't "fix" this by adding it.
 */
export function hasStockActivity(row: Pick<StockRow, 'opening' | 'newQty' | 'sold' | 'returned' | 'balance'>): boolean {
  return row.opening !== 0 || row.newQty !== 0 || row.sold !== 0 || row.returned !== 0 || row.balance !== 0;
}

/**
 * "Products with no stock and no movement today are not listed" — the Stock
 * screen's own listing rule. Generic over `T` (rather than fixed to
 * `StockRow`) so filtering a `StockRowWithDemand[]` keeps the extra
 * waiting-demand fields on the results instead of widening them away.
 */
export function filterListedRows<T extends Pick<StockRow, 'opening' | 'newQty' | 'sold' | 'returned' | 'balance'>>(rows: T[]): T[] {
  return rows.filter(hasStockActivity);
}

/**
 * A product is "held" for Stock Check purposes when its balance is non-zero —
 * NOT `balance > 0`. A negative balance is itself a ledger fault the web
 * deliberately keeps visible so a physical count can catch it; matching the
 * web here on purpose even though it reads differently from a literal
 * "balance > 0" spec.
 */
export function isHeldForStockCheck(row: Pick<StockRow, 'balance'>): boolean {
  return row.balance !== 0;
}

const WAITING_ORDER_STATUSES = new Set(['pending', 'awaiting_verification']);

/**
 * Units Production has yet to hand over, per product — summed across every
 * item of every one of the branch's own production orders still `pending` or
 * `awaiting_verification`. Ported from the web's `demandLines.ts`
 * `waitingDemandByProduct()`: `approvedQty ?? qty` is the "effective" quantity
 * once Production has revised a line down (or up) from what the branch asked.
 * This is NOT the backend's `branchDemand` (a shared production-pool claim) —
 * a different concept entirely; don't substitute one for the other.
 */
export function computeWaitingDemand(orders: ProductionOrder[]): Map<string, number> {
  const byProduct = new Map<string, number>();
  for (const order of orders) {
    if (!WAITING_ORDER_STATUSES.has(order.status)) continue;
    for (const item of order.items) {
      const effectiveQty = item.approvedQty ?? item.qty;
      byProduct.set(item.productId, (byProduct.get(item.productId) ?? 0) + effectiveQty);
    }
  }
  return byProduct;
}

/** Attaches `waitingDemand`/`expectedBalance` to each row — `expectedBalance = balance + waitingDemand`. */
export function withExpectedBalance(rows: StockRow[], waitingDemandByProduct: Map<string, number>): StockRowWithDemand[] {
  return rows.map((row) => {
    const waitingDemand = waitingDemandByProduct.get(row.productId) ?? 0;
    return { ...row, waitingDemand, expectedBalance: row.balance + waitingDemand };
  });
}

/** Sums every figure across the given (already-filtered) rows — the summary strip's totals respect the active filter/search, same as the web's footer row. */
export function computeTotals(rows: StockRowWithDemand[]): StockTotals {
  return rows.reduce<StockTotals>(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      newQty: acc.newQty + row.newQty,
      sold: acc.sold + row.sold,
      returned: acc.returned + row.returned,
      adjustment: acc.adjustment + row.adjustment,
      balance: acc.balance + row.balance,
      waitingDemand: acc.waitingDemand + row.waitingDemand,
      expectedBalance: acc.expectedBalance + row.expectedBalance,
    }),
    { opening: 0, newQty: 0, sold: 0, returned: 0, adjustment: 0, balance: 0, waitingDemand: 0, expectedBalance: 0 },
  );
}

// ─── Stock Check classification ────────────────────────────────────────────

export type StockCheckVerdict = 'matched' | 'short' | 'over' | 'notCounted';

export interface StockCheckClassification {
  productId: string;
  productName: string;
  balance: number;
  counted: number | null;
  diff: number | null;
  verdict: StockCheckVerdict;
}

/**
 * Empty-string counts mean "not counted" and must stay distinct from an
 * explicit `0` count — a real, valid count of zero units on the shelf.
 */
export function parseCountInput(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyCount(row: Pick<StockRow, 'productId' | 'productName' | 'balance'>, countedRaw: string | undefined): StockCheckClassification {
  const counted = parseCountInput(countedRaw);
  if (counted === null) {
    return { productId: row.productId, productName: row.productName, balance: row.balance, counted: null, diff: null, verdict: 'notCounted' };
  }
  const diff = counted - row.balance;
  const verdict: StockCheckVerdict = diff === 0 ? 'matched' : diff < 0 ? 'short' : 'over';
  return { productId: row.productId, productName: row.productName, balance: row.balance, counted, diff, verdict };
}

export interface StockCheckSummary {
  matched: number;
  short: number;
  over: number;
  notCounted: number;
}

export function summarizeClassifications(classifications: StockCheckClassification[]): StockCheckSummary {
  return classifications.reduce<StockCheckSummary>(
    (acc, c) => {
      acc[c.verdict] += 1;
      return acc;
    },
    { matched: 0, short: 0, over: 0, notCounted: 0 },
  );
}
