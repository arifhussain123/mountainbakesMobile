import { addMonths, format, parseISO } from 'date-fns';

/**
 * The wording every month-to-date summary shares with the web
 * (`components/shared/MonthlySummary.tsx`). Both lines are worked out from the
 * window the SERVER reports, never from the phone's clock, so they always name
 * the month the figures actually cover.
 */

/** "1 October 2026 – 18 October 2026" */
export function formatSummaryWindow(from: string, to: string): string {
  const long = (d: string) => format(parseISO(d), 'd MMMM yyyy');
  return `${long(from)} – ${long(to)}`;
}

/** "Month to date, Karachi business day · starts again on 1 November 2026" — `from` is the server's 'YYYY-MM-01'. */
export function formatMonthToDateLine(from: string): string {
  return `Month to date, Karachi business day · starts again on ${format(addMonths(parseISO(from), 1), 'd MMMM yyyy')}`;
}
