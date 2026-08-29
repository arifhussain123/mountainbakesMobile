/**
 * The shared till.
 *
 * Two screens ring up a sale — the branch's POS (`NewSaleScreen`) and the
 * production counter (`ProductionSalesScreen`) — against two different endpoints
 * with different rules about branches, payment methods and whether the write may
 * queue. What they do NOT differ on is the shape of ringing one up: a tap-to-add
 * price list, a cart line with a quantity and a percentage discount, a cash pad,
 * a pinned summary bar, a read-only recap and a slip.
 *
 * That is here rather than in either feature because the folder rule says so —
 * code a second feature needs is promoted to `common/` — and because the two had
 * already drifted while they were copies: the counter's cart line had no typed
 * quantity field, no way to remove a line, its own spelling of the four payment
 * methods, and the same frozen-percentage discount bug.
 *
 * What stays in each feature is what is genuinely its own: which endpoint it
 * posts to, whether the write is offline-first, and the rules its schema
 * enforces.
 */

export { CashPad, CASH_NOTES } from './CashPad';
export type { CashPadProps } from './CashPad';
export { SaleCartLine } from './SaleCartLine';
export type { SaleCartLineProps } from './SaleCartLine';
export { SalePayment } from './SalePayment';
export type { SalePaymentProps } from './SalePayment';
export { SaleProductList } from './SaleProductList';
export type { SaleProductListProps } from './SaleProductList';
export { SaleProductRow } from './SaleProductRow';
export type { SaleProductRowProps } from './SaleProductRow';
export { SaleReceipt } from './SaleReceipt';
export type { SaleReceiptProps } from './SaleReceipt';
export { SaleSummaryBar } from './SaleSummaryBar';
export type { SaleSummaryBarProps } from './SaleSummaryBar';
export type { SaleBusy, SaleSlip } from './types';
