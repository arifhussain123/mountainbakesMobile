import type { CartLine, SaleTotals } from '@/common/helpers/saleTotals';

/**
 * Which finish is in flight.
 *
 * One flag with three states rather than two booleans: `'save'` and `'share'`
 * are mutually exclusive by construction, and it is what puts the spinner on the
 * button that was actually pressed. Two booleans permit a fourth state that
 * means nothing (both saving) and reliably produce it the first time somebody
 * double-taps across the pair.
 */
export type SaleBusy = 'save' | 'share' | null;

/**
 * A sale that has just been rung up, as the slip renders it.
 *
 * Captured **before** the cart is emptied — the lines are copied rather than
 * referenced, because the cart is cleared the moment the write resolves and a
 * slip holding a live reference would render an empty sale.
 *
 * There is no `refused` state here, and that is deliberate rather than an
 * omission: a refused sale did not happen, and a slip for one is how a customer
 * walks out holding proof of a sale the business has no record of. Both tills
 * leave to the register in that case instead, so a refusal can never reach this
 * type at all.
 */
export interface SaleSlip {
  lines: CartLine[];
  totals: SaleTotals;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  /** Rupees tendered, or null when the operator did not record it. */
  receivedCash: number | null;
  /** Change owed, when cash was recorded. */
  returned: number | null;
  businessDate: string;
  /**
   * The tenant's symbol at the moment of sale, carried rather than looked up
   * again by the slip. The slip is shared as text; re-reading settings there
   * would let a symbol that changed between the sale and the share print a
   * figure in a currency the sale was not made in.
   */
  currencySymbol?: string;
  /**
   * The server's own sale number, when there is one.
   *
   * The production counter posts live and is answered with an `orderNumber`, so
   * its slip carries a reference a person can quote. The branch till is
   * offline-first: its write path returns this device's `client_operation_id`
   * and an outcome, never the server's order id, so its slip has none — and
   * inventing one would be a reference quoted back at a counter that has never
   * heard of it.
   */
  orderNumber?: string;
  /**
   * Whether the server has this sale yet.
   *
   * False means queued on the device: no sale number, and nobody at head office
   * can see it. The slip says so rather than reading as a completed transaction.
   */
  confirmed: boolean;
  /**
   * Whether `totals` came back from the server or were worked out here.
   *
   * Distinct from `confirmed`, and the difference is real. The production
   * counter posts live and is answered with the server's own subtotal, discount,
   * tax and grand total, so its slip prints figures nobody can disagree with.
   * The branch till's write path returns an outcome and nothing else — so even a
   * **synced** branch sale carries the device's arithmetic over cached
   * `AppSettings`, which a stale `gstRate` can put at odds with the sale
   * actually recorded. The slip marks the second kind as provisional and says
   * who confirms it.
   */
  authoritative: boolean;
}
