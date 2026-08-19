import {
  businessDateStr,
  businessDayBounds,
  businessDaysAgoStr,
} from '@/shared/utils/timezone';
import type { ReportPeriod } from '@/shared/types/report.types';

/**
 * Dashboard period selection.
 *
 * ---------------------------------------------------------------------------
 * Why this is a translation layer rather than five more chips
 * ---------------------------------------------------------------------------
 * The server understands four **named** periods (`daily`, `weekly`, `monthly`,
 * `yearly`) and, for anything else, an explicit `from`/`to` pair. It does not
 * know "yesterday" or "last 7 days" — and `getDateRange()` in
 * `reports.routes.ts` *ignores* `from`/`to` whenever the period is one of the
 * four named ones. So a request is either a name **or** a range, never both, and
 * sending a name with a range silently drops the range.
 *
 * That is what this file encodes: each option resolves to exactly one of those
 * two shapes.
 *
 * ---------------------------------------------------------------------------
 * The bounds are business-day bounds, not calendar midnights
 * ---------------------------------------------------------------------------
 * The bakery's day rolls at **02:00 Asia/Karachi**, so "yesterday" runs from
 * yesterday 02:00 to today 01:59:59.999. Building the range from
 * `businessDayBounds()` is what keeps a 1 AM sale in the night it was actually
 * made. Sending bare `YYYY-MM-DD` strings would compare against `created_at` at
 * calendar midnight and quietly cut two hours off both ends.
 */

export type DashboardRangeKey = 'today' | 'yesterday' | 'last7' | 'month' | 'custom';

export interface DashboardRange {
  period: ReportPeriod;
  from?: string;
  to?: string;
}

/** A custom range's inclusive endpoints, as business dates (`YYYY-MM-DD`). */
export interface CustomDates {
  from: string;
  to: string;
}

/**
 * Resolve a chip (plus the custom dates, when the chip is `custom`) into the
 * query the API actually takes.
 *
 * `now` is injectable so the rollover behaviour can be tested at 01:00 without
 * waiting until 01:00.
 */
export function resolveRange(
  key: DashboardRangeKey,
  custom?: CustomDates,
  now: Date = new Date(),
): DashboardRange {
  switch (key) {
    case 'today':
      return { period: 'daily' };
    case 'month':
      return { period: 'monthly' };
    case 'yesterday': {
      const day = businessDaysAgoStr(1, now);
      return spanning(day, day);
    }
    case 'last7': {
      // Inclusive of today, so six days back — "7 days" counts today as one.
      return spanning(businessDaysAgoStr(6, now), businessDateStr(now));
    }
    case 'custom': {
      if (!custom) return { period: 'monthly' };
      const [from, to] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
      return spanning(from, to);
    }
  }
}

/** ISO bounds covering whole business days from `fromDate` to `toDate`, inclusive. */
function spanning(fromDate: string, toDate: string): DashboardRange {
  return {
    period: 'custom',
    from: businessDayBounds(fromDate).fromISO,
    to: businessDayBounds(toDate).toISO,
  };
}

/**
 * The chips, in the order they are drawn.
 *
 * `custom` is last and is the only one that opens anything — the other four are
 * one tap. Ordering is deliberate: the two most-used ranges in a shop are today
 * and yesterday (reconciling last night's till), so they lead.
 */
export const DASHBOARD_RANGES: ReadonlyArray<{ key: DashboardRangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

/** Short human label for a chosen custom range, e.g. `1 Aug – 19 Aug`. */
export function describeCustom(custom: CustomDates): string {
  return `${shortDate(custom.from)} – ${shortDate(custom.to)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  const index = Number(month) - 1;
  return `${Number(day)} ${MONTHS[index] ?? month}`;
}
