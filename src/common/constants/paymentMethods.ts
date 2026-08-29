import type { PRODUCTION_SALE_PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';

/**
 * How each payment method reads to a person.
 *
 * ---------------------------------------------------------------------------
 * One map, because there were three
 * ---------------------------------------------------------------------------
 * The register had `{cash: 'Cash', …}`, the production counter had a lower-case
 * variant of the same four, and the till rendered the raw enum values —
 * `bank_account` with the underscore showing — straight out of
 * `PAYMENT_METHOD_VALUES`. Three spellings of four constants, and the schema is
 * the only thing that moves when a fifth arrives.
 *
 * Typed as a total `Record` over the production list, which is the wider of the
 * two (`PAYMENT_METHOD_VALUES` plus `staff`): adding a value to the Postgres
 * enum and the schema now fails this file at compile time rather than rendering
 * a raw `some_new_method` at a counter.
 *
 * `staff` carries its qualifier in the label because the word alone does not say
 * what it means — no money is taken, the sale is excluded from every revenue
 * total, and the schema requires a comment for exactly that reason. It is
 * production-counter only; `PAYMENT_METHOD_VALUES` does not contain it, which is
 * what makes `/api/orders/pos` and the branch till reject it with no extra
 * check.
 */
export const PAYMENT_METHOD_LABEL: Record<
  (typeof PRODUCTION_SALE_PAYMENT_METHOD_VALUES)[number],
  string
> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank account',
  staff: 'Staff (unpaid)',
};

/** The label, or the raw value for anything this build has not been told about. */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method as keyof typeof PAYMENT_METHOD_LABEL] ?? method;
}
