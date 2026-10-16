import { format, parseISO, startOfMonth, subDays } from 'date-fns';

export type DateRangePreset = 'today' | 'last7' | 'thisMonth' | 'last90';

export const DATE_RANGE_PRESETS: { preset: DateRangePreset; label: string }[] = [
  { preset: 'today', label: 'Today' },
  { preset: 'last7', label: 'Last 7 days' },
  { preset: 'thisMonth', label: 'This month' },
  { preset: 'last90', label: 'Last 90 days' },
];

export interface DateRange {
  from: string;
  to: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `today` is the business date (2 AM cutoff) — every preset is anchored to it, not the calendar date. */
export function resolveDateRangePreset(preset: DateRangePreset, today: string): DateRange {
  const anchor = parseISO(today);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'last7':
      return { from: format(subDays(anchor, 6), 'yyyy-MM-dd'), to: today };
    case 'thisMonth':
      // `to` is today, not the calendar month's end — there's no data past today to include.
      return { from: format(startOfMonth(anchor), 'yyyy-MM-dd'), to: today };
    case 'last90':
      return { from: format(subDays(anchor, 89), 'yyyy-MM-dd'), to: today };
  }
}

/** Both sides must be well-formed `YYYY-MM-DD` dates, and `from` must not be after `to`. */
export function isValidDateRange(from: string, to: string): boolean {
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return false;
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return false;
  return fromDate.getTime() <= toDate.getTime();
}
