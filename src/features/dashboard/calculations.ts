import type { BranchStockHistoryRow } from '@/api';

/**
 * `part` as a percentage of `whole`, or `null` when `whole` is zero/negative —
 * never a fabricated 0%. Mirrors the web client's `share()` (branch-v2/model.ts)
 * used for Expenses %/Discounts % of Sales and the Payment Methods mix.
 */
export function sharePct(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null;
}

/**
 * `value` as a percentage of `max`, clamped to [0, 100] and 0 for a
 * non-positive value/max — the shared-scale bar width used by "Sales vs
 * Deductions", Top Products, and Stock Flow. Mirrors the web's `barPct()`.
 */
export function barScalePct(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0;
  return Math.min(100, (value / max) * 100);
}

/** Orders counted as neither pending nor cancelled, never negative. */
export function completedOrders(total: number, pending: number, cancelled: number): number {
  return Math.max(0, total - pending - cancelled);
}

/** The Orders-Today donut's center percentage — `null` (not 0%) when there are no orders yet. */
export function orderCompletionPct(total: number, pending: number, cancelled: number): number | null {
  return sharePct(completedOrders(total, pending, cancelled), total);
}

export interface StockEndDifference {
  qty: number;
  amount: number;
  isZero: boolean;
}

/**
 * Independent cross-check of the server's stock reconciliation, mirroring the
 * web client's `endDifference()` (BranchStockStatement.tsx) exactly:
 * `opening + new − sold − returned + adjustment − balance`. The server's own
 * `reconciliation.difference`/`unexplained` (from `stock.service.ts`) stays the
 * UI's source of truth — this is a second, independently-computed check from
 * the same row the screen already has, not a replacement for it.
 */
export function computeStockEndDifference(row: BranchStockHistoryRow): StockEndDifference {
  const qty = row.openingQty + row.newQty - row.soldQty - row.returnedQty + row.adjustmentQty - row.balanceQty;
  const amount =
    row.openingAmount + row.newAmount - row.soldAmount - row.returnedAmount + row.adjustmentAmount - row.balanceAmount;
  return { qty, amount, isZero: Math.abs(qty) < 0.5 && Math.abs(amount) < 1 };
}

/**
 * The Stock History card's combined "RET/ADJ" figure — `returnedQty` and
 * `adjustmentQty` do NOT share a sign convention (confirmed against the same
 * identity `computeStockEndDifference` checks): `returnedQty` arrives as a
 * positive magnitude that is SUBTRACTED from balance, same family as
 * `soldQty`, while `adjustmentQty` is already a free-signed delta that is
 * ADDED. Naively summing them (`returnedQty + adjustmentQty`) silently flips
 * the sign of every day whose movement is mostly returns rather than
 * adjustment. The correct net effect on balance is `adjustmentQty − returnedQty`.
 */
export function computeStockHistoryRetAdj(row: BranchStockHistoryRow): number {
  return row.adjustmentQty - row.returnedQty;
}
