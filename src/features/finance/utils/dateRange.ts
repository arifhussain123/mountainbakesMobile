import { format, startOfMonth, subDays } from 'date-fns';
import { getBusinessDate } from '@/api';

export type FinanceDateRangePreset = 'today' | 'week' | 'month' | 'last30';

export const FINANCE_DATE_RANGE_LABELS: Record<FinanceDateRangePreset, string> = {
  today: 'Today',
  week: 'Last 7 Days',
  month: 'This Month',
  last30: 'Last 30 Days',
};

export const FINANCE_DATE_RANGE_PRESETS: readonly FinanceDateRangePreset[] = ['today', 'week', 'month', 'last30'];

/** No date-picker library in this app yet — fixed presets, same spirit as the dashboard's own DateFilter. */
export function getFinanceDateRange(preset: FinanceDateRangePreset, today: string = getBusinessDate()): { from: string; to: string } {
  const anchor = new Date(`${today}T00:00:00`);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: format(subDays(anchor, 6), 'yyyy-MM-dd'), to: today };
    case 'month':
      return { from: format(startOfMonth(anchor), 'yyyy-MM-dd'), to: today };
    case 'last30':
      return { from: format(subDays(anchor, 29), 'yyyy-MM-dd'), to: today };
  }
}
