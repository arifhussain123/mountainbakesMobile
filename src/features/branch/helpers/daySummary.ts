import { PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import type { Order } from '@/shared/types/order.types';
import { round2, toNumber } from '@/common/utils/money';

/**
 * One business day of sales records → the figures drawn above them.
 *
 * Lifted out of `SalesScreen` when a second screen in this slice — the branch
 * closing read — needed the same arithmetic. It stays inside `features/branch`
 * rather than moving to `common/`: both callers are this feature, and the
 * folder rule promotes on the *second feature*, not the second file.
 *
 * Keeping one implementation is the point rather than the tidiness. These are
 * the figures a shift is reconciled from, and a closing screen that summed the
 * day even slightly differently from the register would produce two truths
 * about one day's takings, with nothing to say which was wrong.
 */

export interface PaymentTotal {
  method: string;
  /** What was taken on this tender, after discount. */
  total: number;
  /** Before discount — the drawer figure, and only drawn for cash. */
  gross: number;
  count: number;
}

export interface ProductTotal {
  productId: string;
  productName: string;
  qty: number;
  revenue: number;
}

export interface DaySummary {
  /** Sales counted — cancelled ones are not among them. */
  count: number;
  /** Before discount. */
  gross: number;
  discount: number;
  /** What was taken. */
  total: number;
  /** Units across every line of every counted sale. */
  units: number;
  /** The four branch tenders, always, plus any other one that appears. */
  payments: PaymentTotal[];
  /** Busiest product first. */
  products: ProductTotal[];
}

/**
 * One business day of records → the figures above them.
 *
 * `toNumber` and not `Number`: every money field is `numeric(14,2)` and arrives
 * as a JSON string, and one malformed value under `Number` poisons the whole sum
 * into `NaN` — a register reading "Rs. NaN" rather than one row short.
 *
 * `round2` closes each sum for the same reason `saleTotals` does: the drift is
 * invisible once formatted, but the rounded figure is what the accessibility
 * label reads out and what any later comparison sees.
 *
 * The tender split is in a **fixed** order and always four wide, rather than
 * ranked by what was taken. A card that reorders itself through the day is one
 * nobody can read at a glance, and a tender that took nothing is information —
 * it is drawn muted rather than dropped. Anything else that appears (a `staff`
 * sale, which a branch has no way to ring up but the row could still carry) is
 * appended rather than silently excluded from a total labelled as the day's.
 *
 * Exported because it is the screen's arithmetic and deserves testing without a
 * renderer — a wrong total here is wrong money on the one screen a shift is
 * reconciled from.
 */
export function summariseDay(orders: readonly Order[]): DaySummary {
  const payments = new Map<string, { total: number; gross: number; count: number }>();
  for (const method of PAYMENT_METHOD_VALUES) {
    payments.set(method, { total: 0, gross: 0, count: 0 });
  }
  const products = new Map<string, ProductTotal>();

  let count = 0;
  let gross = 0;
  let discount = 0;
  let total = 0;
  let units = 0;

  for (const order of orders) {
    // Cancelled sales took no money. They stay on the list and out of the sums.
    if (order.status === 'cancelled') continue;

    count += 1;
    /**
     * `orders.subtotal` is **already net** of the line discounts — the server
     * builds it as `Σ lineTotal`, and `lineTotal` is `qty × rate` with that
     * line's discount taken off (`orders.routes.ts`). So the gross a register
     * shows has to add the discount back, which is exactly what the server's own
     * receipt does (`support.routes.ts`: "orders.subtotal is already net of the
     * line discounts, so the discount is added back to show what the items came
     * to before it").
     *
     * Getting this wrong is not a rounding difference: it prints Gross equal to
     * Total on every day that had a discount, which is the one pair of figures
     * on this card that must differ by a known amount.
     */
    const orderDiscount = toNumber(order.discountTotal);
    const orderGross = toNumber(order.subtotal) + orderDiscount;
    const grand = toNumber(order.grandTotal);
    gross += orderGross;
    discount += orderDiscount;
    total += grand;

    const method = order.paymentMethod ?? 'cash';
    const bucket = payments.get(method) ?? { total: 0, gross: 0, count: 0 };
    payments.set(method, {
      total: bucket.total + grand,
      gross: bucket.gross + orderGross,
      count: bucket.count + 1,
    });

    for (const item of order.items ?? []) {
      const qty = toNumber(item.qty);
      units += qty;
      const current = products.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        qty: 0,
        revenue: 0,
      };
      products.set(item.productId, {
        ...current,
        qty: current.qty + qty,
        revenue: current.revenue + toNumber(item.lineTotal),
      });
    }
  }

  return {
    count,
    gross: round2(gross),
    discount: round2(discount),
    total: round2(total),
    units: round2(units),
    payments: [...payments.entries()].map(([method, sums]) => ({
      method,
      total: round2(sums.total),
      gross: round2(sums.gross),
      count: sums.count,
    })),
    products: [...products.values()]
      .map(p => ({ ...p, qty: round2(p.qty), revenue: round2(p.revenue) }))
      .sort((a, b) => b.qty - a.qty),
  };
}
