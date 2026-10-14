import { subDays, startOfMonth, subMonths, format } from 'date-fns';
import { getBusinessDate } from '@/api';
import type { DatePeriod } from '@/shared/ui';

/**
 * The analytics window per selected period, matching
 * `docs/branch-dashboard-v2-api-map.md`'s "Period toggle" table exactly: Daily
 * reads the last 7 business days, Weekly the last 28 (aggregated into 4 bars
 * client-side), Monthly the last 6 calendar months.
 */
export function getAnalyticsWindow(period: DatePeriod, today: string = getBusinessDate()): { from: string; to: string } {
  const anchor = new Date(`${today}T00:00:00`);

  if (period === 'monthly') {
    return { from: format(startOfMonth(subMonths(anchor, 5)), 'yyyy-MM-dd'), to: today };
  }
  const daysBack = period === 'weekly' ? 27 : 6;
  return { from: format(subDays(anchor, daysBack), 'yyyy-MM-dd'), to: today };
}
