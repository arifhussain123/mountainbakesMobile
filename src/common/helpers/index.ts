/**
 * Domain-aware helpers — pure functions that know app concepts.
 *
 * These understand the business day (02:00 Asia/Karachi), report periods, cart
 * arithmetic and mirror freshness. Anything that needs none of that belongs in
 * `@/common/utils` instead.
 */

export {
  shiftBusinessDate,
  isFutureBusinessDate,
  formatBusinessDate,
  businessDateLabel,
} from './businessDay';

export { resolveRange, DASHBOARD_RANGES, describeCustom } from './dashboardRange';
export type { DashboardRangeKey, DashboardRange, CustomDates } from './dashboardRange';

export { dataAsOfFrom } from './dataAsOf';

export {
  lineAmount,
  lineGross,
  saleTotals,
  cashReturned,
  resolveDiscount,
} from './saleTotals';
export type { CartLine, SaleTotals, TaxSettings } from './saleTotals';
