import type { Order, PaymentMethod } from '@/api';

/**
 * Parses a line-discount field that accepts either a flat amount ("50") or a
 * percentage of the line's gross ("10%") — ported exactly from the web
 * client's `resolveDiscount()` (`frontend/src/components/sales/SaleForm.tsx`).
 * Always rounds to 2 decimal places and clamps to `[0, lineGross]`: a
 * discount can never go negative or exceed the line it's applied to, whether
 * entered as an amount or a percentage.
 */
export function resolveDiscount(raw: string, lineGross: number): number {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 0;
  const isPercent = trimmed.endsWith('%');
  const n = parseFloat(isPercent ? trimmed.slice(0, -1) : trimmed);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const value = isPercent ? (n / 100) * lineGross : n;
  return Math.max(0, Math.min(Math.round(value * 100) / 100, lineGross));
}

/** qty × rate — the line's gross, before any discount. */
export function computeLineGross(qty: number, rate: number): number {
  return qty * rate;
}

/** qty × rate − line discount — the server's authoritative `lineTotal` formula. */
export function computeLineAmount(gross: number, discount: number): number {
  return gross - discount;
}

/**
 * Government tax — a single global rate (not per-branch/per-payment-method),
 * applied on the post-discount subtotal. Matches the server's
 * `Math.round(subtotal * taxRate * 100) / 100` exactly (`orders.routes.ts`).
 */
export function computeTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

export function computeGrandTotal(subtotal: number, taxAmount: number): number {
  return subtotal + taxAmount;
}

/** Cash returned to the customer — only meaningful when paying by cash. */
export function computeCashReturned(receivedCash: number, grandTotal: number): number {
  return receivedCash - grandTotal;
}

export const SALE_PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'easypaisa', 'foodpanda', 'bank_account'];

/** `'staff'` — a Production-counter sale with no money taken; excluded from every money total, reported separately. */
const STAFF_PAYMENT_METHOD = 'staff';

export interface SalesSummary {
  /** "Charged, after discount" — Σ grandTotal over paid (non-staff) sales. */
  totalSales: number;
  /** "Gross (qty × rate)" — Σ (unitPrice × qty) over every item of every paid sale, before discount. */
  totalGross: number;
  /** "Off list price" — Σ discountTotal over paid sales. */
  totalDiscount: number;
  /** Per-payment-method net (grandTotal) and gross (qty × rate), paid sales only. */
  byMethod: Record<PaymentMethod, { net: number; gross: number }>;
  /** Σ grandTotal over `'staff'` sales — reported separately, excluded from every figure above. */
  staffTotal: number;
}

/**
 * Daily summary aggregation, ported exactly from the web client's
 * `summary` useMemo (`SalesPage.tsx`): sums are computed independently per
 * sale, not derived from each other — `totalGross - totalDiscount` only
 * equals `totalSales` while tax is zero (tax applies after discount, on top).
 */
export function summarizeOrders(orders: Order[]): SalesSummary {
  const byMethod = Object.fromEntries(SALE_PAYMENT_METHODS.map((m) => [m, { net: 0, gross: 0 }])) as Record<
    PaymentMethod,
    { net: number; gross: number }
  >;

  let totalSales = 0;
  let totalGross = 0;
  let totalDiscount = 0;
  let staffTotal = 0;

  for (const order of orders) {
    const saleGross = order.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

    if ((order.paymentMethod as string) === STAFF_PAYMENT_METHOD) {
      staffTotal += order.grandTotal;
      continue;
    }

    totalSales += order.grandTotal;
    totalGross += saleGross;
    totalDiscount += order.discountTotal;

    const method = order.paymentMethod as PaymentMethod;
    if (method in byMethod) {
      byMethod[method].net += order.grandTotal;
      byMethod[method].gross += saleGross;
    }
  }

  return { totalSales, totalGross, totalDiscount, byMethod, staffTotal };
}

export interface ItemsSoldEntry {
  productName: string;
  qty: number;
}

/** Items-sold breakdown, folded from each order's own `items` — no separate aggregate endpoint exists (matches the web). */
export function summarizeItemsSold(orders: Order[]): ItemsSoldEntry[] {
  const qtyByProduct = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      qtyByProduct.set(item.productName, (qtyByProduct.get(item.productName) ?? 0) + item.qty);
    }
  }
  return Array.from(qtyByProduct.entries())
    .map(([productName, qty]) => ({ productName, qty }))
    .sort((a, b) => b.qty - a.qty);
}
