/**
 * Pure utilities — no domain knowledge, no UI, no imports from `@/features`.
 *
 * The split against `@/common/helpers` is deliberate: anything here can be read
 * and tested without knowing what a business day, a sale or a mirror is.
 */

export { BOOT_TIMEOUT_MS, BootTimeout, withBootTimeout } from './bootTimeout';

export {
  CURRENCY_SYMBOL,
  CURRENCY_LOCALE,
  toNumber,
  round2,
  formatAmount,
  formatCurrency,
  formatCompact,
  parseCurrency,
  formatQty,
} from './money';

export { newOperationId, isOperationId, uuidVersion } from './operationId';
