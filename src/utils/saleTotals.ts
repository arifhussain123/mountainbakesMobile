import { round2, toNumber } from './money';

/**
 * Sale arithmetic — a PREVIEW only.
 *
 * The server is authoritative for every figure here. The POS request carries
 * only `{productId, qty, discount}` per line: no price, no total. The server
 * resolves the current price, recomputes everything, and returns its own
 * snapshot, which is what the receipt is printed from. That is what makes a
 * price change between opening the form and saving impossible to misprint.
 *
 * This module exists so the cashier can see a running total while ringing up.
 * It reproduces the web client's arithmetic exactly, so the two never show a
 * different number for the same basket.
 */

export interface CartLine {
  productId: string;
  productName: string;
  /** Cached catalogue price. Display only — never sent. */
  unitPrice: number;
  qty: number;
  /** Resolved rupee discount for the line (see resolveDiscount). */
  discount: number;
}

export interface SaleTotals {
  /** Σ (unitPrice × qty) — what is shown as "Subtotal" on the receipt. */
  grossSubtotal: number;
  /** Σ discount. */
  discountTotal: number;
  /** Σ (unitPrice × qty − discount). The NET figure the server stores. */
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

export interface TaxSettings {
  gstEnabled?: boolean;
  /** Whole percent, e.g. 17 for 17%. */
  gstRate?: number;
}

/** Line total after its discount, floored at zero. */
export function lineAmount(line: CartLine): number {
  const gross = toNumber(line.unitPrice) * toNumber(line.qty);
  return round2(Math.max(0, gross - toNumber(line.discount)));
}

/** Line total before its discount. */
export function lineGross(line: CartLine): number {
  return round2(toNumber(line.unitPrice) * toNumber(line.qty));
}

/**
 * Totals for a basket.
 *
 * Receipt display order is Subtotal (gross) → Discount → Tax → Grand Total, so
 * the arithmetic reconciles visually. Tax is applied to the NET subtotal, after
 * discount — applying it to gross would overcharge every discounted sale.
 */
export function saleTotals(lines: CartLine[], settings: TaxSettings = {}): SaleTotals {
  const discountTotal = round2(
    lines.reduce((sum, line) => sum + Math.min(toNumber(line.discount), lineGross(line)), 0),
  );
  const subtotal = round2(lines.reduce((sum, line) => sum + lineAmount(line), 0));
  const grossSubtotal = round2(subtotal + discountTotal);

  const taxRate = settings.gstEnabled ? toNumber(settings.gstRate) / 100 : 0;
  const taxAmount = round2(subtotal * taxRate);
  const grandTotal = round2(subtotal + taxAmount);

  return { grossSubtotal, discountTotal, subtotal, taxRate, taxAmount, grandTotal };
}

/** Change owed. Negative means the tendered amount does not cover the total. */
export function cashReturned(receivedCash: number, grandTotal: number): number {
  return round2(toNumber(receivedCash) - toNumber(grandTotal));
}

/**
 * Resolve a discount entry to rupees.
 *
 * The field accepts either "10%" (a percentage of the line's gross) or a flat
 * rupee amount. Only the resolved rupee figure is ever stored or sent — the
 * server's schema knows nothing about percentages.
 *
 * Clamped to [0, gross]: a discount larger than the line would make the line
 * negative and quietly reduce the rest of the basket.
 */
export function resolveDiscount(input: string, gross: number): number {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return 0;

  const isPercent = trimmed.endsWith('%');
  const numeric = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  const value = isPercent ? (toNumber(gross) * numeric) / 100 : numeric;
  return round2(Math.min(Math.max(0, value), Math.max(0, toNumber(gross))));
}
