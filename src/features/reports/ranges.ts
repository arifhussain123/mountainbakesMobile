import { addDays, addMonths, addWeeks, addYears, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, startOfYear, endOfYear } from 'date-fns';

/**
 * Calendar-aligned report periods, matching the server's own `businessRange()`
 * exactly (`backend/src/shared/utils/timezone.ts`) — NOT the Dashboard's
 * rolling-window semantics (`getAnalyticsWindow`: "last 7/28 days/6 months").
 * Reports' "Weekly" is the calendar week (Monday–Sunday) containing the
 * anchor business date; "Monthly" is the 1st–last day of that month; "Yearly"
 * is Jan 1–Dec 31. All built from the business-date STRING directly (never
 * from a server-returned UTC ISO timestamp, which is exactly the bug the web
 * client has — see ranges.test.ts for the regression case).
 */
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type UiReportPeriod = ReportPeriod | 'custom';

export interface ReportRange {
  from: string;
  to: string;
}

function anchor(dateStr: string): Date {
  return parseISO(dateStr);
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** `today` must be the business date (2 AM Karachi cutoff) — see `getBusinessDate()`. */
export function resolveReportRange(period: ReportPeriod, today: string): ReportRange {
  const a = anchor(today);
  switch (period) {
    case 'daily':
      return { from: today, to: today };
    case 'weekly':
      return { from: toDateStr(startOfWeek(a, { weekStartsOn: 1 })), to: toDateStr(endOfWeek(a, { weekStartsOn: 1 })) };
    case 'monthly':
      return { from: toDateStr(startOfMonth(a)), to: toDateStr(endOfMonth(a)) };
    case 'yearly':
      return { from: toDateStr(startOfYear(a)), to: toDateStr(endOfYear(a)) };
  }
}

/** Steps a resolved range to the previous/next period of the same kind — e.g. one calendar month back/forward. Not meaningful for a custom range (the caller disables stepping there). */
export function stepReportRange(period: ReportPeriod, today: string, direction: 'prev' | 'next'): string {
  const a = anchor(today);
  const sign = direction === 'prev' ? -1 : 1;
  switch (period) {
    case 'daily':
      return toDateStr(addDays(a, sign));
    case 'weekly':
      return toDateStr(addWeeks(a, sign));
    case 'monthly':
      return toDateStr(addMonths(a, sign));
    case 'yearly':
      return toDateStr(addYears(a, sign));
  }
}

/**
 * The immediately-preceding period of equal length — mirrors the
 * `sales_analytics` RPC's own comparison convention ("previous period = same
 * number of days immediately before `from`"), used for the one KPI delta the
 * server actually supports (see calculations.ts).
 */
export function previousReportRange(range: ReportRange): ReportRange {
  const from = anchor(range.from);
  const to = anchor(range.to);
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return { from: toDateStr(addDays(from, -spanDays)), to: toDateStr(addDays(from, -1)) };
}

/** "16 Oct 2026" for a single day, "1 Oct to 31 Oct 2026" for a range — never slices a server ISO timestamp (that's the web's own bug). */
export function formatRangeLabel(range: ReportRange): string {
  const from = anchor(range.from);
  const to = anchor(range.to);
  if (range.from === range.to) return format(from, 'd MMM yyyy');
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = sameYear ? format(from, 'd MMM') : format(from, 'd MMM yyyy');
  return `${fromLabel} to ${format(to, 'd MMM yyyy')}`;
}

/** Whether a range includes the current business date — the figures for that day can still move until the 2 AM close. */
export function rangeIncludesToday(range: ReportRange, today: string): boolean {
  return today >= range.from && today <= range.to;
}
