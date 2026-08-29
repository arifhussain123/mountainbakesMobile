import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { ColumnGroup } from '@/common/ui';
import { getExpenses } from '@/api/services/expensesService';
import { getReportSummary } from '@/api/services/reportsService';
import { qk } from '@/api/queryKeys';
import { resolveRange } from '@/common/helpers/dashboardRange';
import { round2, toNumber } from '@/common/utils/money';
import type { DailySalesData } from '@/shared/types/report.types';
import { businessDateStr } from '@/shared/utils/timezone';

import {
  periodFor,
  previousPeriodFor,
  type ComparisonRangeKey,
  type Period,
  type PeriodBucket,
} from '../comparisonPeriods';

/**
 * Money in against money out, over a calendar period.
 *
 * ---------------------------------------------------------------------------
 * Everything on the screen is derived here
 * ---------------------------------------------------------------------------
 * The API sends per-day sales and expenses (`GET /api/reports/summary`
 * populates `dailyData[].expenses` for exactly this chart) and, on a second
 * call, the previous period's two totals. Net, margin, the expense ratio, the
 * averages, the bar scale and every change are worked out from those in one
 * place — so a card cannot round differently from the bars beside it, which is
 * the failure that makes a reader stop trusting the whole screen.
 *
 * **Deriving net is not a second definition of profit.** The server's
 * `totalProfit` is literally `totalRevenue - totalExpenses`, so the subtraction
 * here IS its definition rather than a rival one. (An earlier version of this
 * screen read `totalProfit` off the response for exactly the opposite reason;
 * the concern was right and does not apply, because the two agree by
 * construction.)
 *
 * ---------------------------------------------------------------------------
 * Totals cover what has happened, and nothing else
 * ---------------------------------------------------------------------------
 * A period you are inside has buckets that have not started. They are excluded
 * from every total and every average — counting December as a zero in November
 * makes an ordinary quarter read as a collapse in trade, and it is the sort of
 * wrong that gets screenshotted.
 */

export interface Change {
  /** Signed, in rupees. */
  delta: number;
  /** Signed percentage, or null when there is nothing to be a percentage of. */
  pct: number | null;
}

export interface ComparisonTotals {
  sales: number;
  expenses: number;
  /** sales − expenses. The server's own definition of profit. */
  net: number;
  /** Percentage, or null: a margin on no sales is undefined, not zero. */
  margin: number | null;
  /** Rupees spent per rupee taken, or null on no sales. */
  expenseRatio: number | null;
}

export function useComparison(initial: ComparisonRangeKey = 'month') {
  const [rangeKey, setRangeKey] = useState<ComparisonRangeKey>(initial);

  /**
   * Pinned to the business date, and recomputed only when it changes.
   *
   * The day rolls at 02:00, so 01:30 on the 1st still belongs to last month's
   * period. Reading a clock inside the derivations instead would let a screen
   * left open across the rollover keep drawing yesterday's buckets against
   * today's comparison.
   */
  const today = businessDateStr();
  const period = useMemo(() => periodFor(rangeKey, today), [rangeKey, today]);
  const previousDates = useMemo(
    () => previousPeriodFor(rangeKey, today),
    [rangeKey, today],
  );

  const scope = useMemo(
    () => resolveRange('custom', { from: period.from, to: period.to }),
    [period.from, period.to],
  );
  const previousScope = useMemo(
    () => resolveRange('custom', previousDates),
    [previousDates],
  );

  const summary = useQuery({
    queryKey: qk.reports.summary(scope),
    queryFn: () => getReportSummary(scope),
    placeholderData: previous => previous,
  });

  /**
   * The previous period, for direction.
   *
   * A second request rather than a field on the first, because the response
   * carries no comparison — and a margin with no direction says very little.
   * It is a distinct cache key, so switching tabs back and forth costs nothing
   * after the first look.
   *
   * `enabled` waits for the current period: a comparison is meaningless on its
   * own, and firing both at once doubles the cold-start cost of a screen whose
   * first figure is the one people came for.
   */
  const previousSummary = useQuery({
    queryKey: qk.reports.summary(previousScope),
    queryFn: () => getReportSummary(previousScope),
    enabled: summary.isSuccess,
    placeholderData: previous => previous,
  });

  /**
   * Expense rows for the same window, for the category card.
   *
   * Business **dates**, not the ISO instants the summary takes: `/api/expenses`
   * filters on the `date` column, which already holds the business date the
   * device captured at write time. Sending an instant there would compare a
   * timestamp against a date and quietly lose the edges of the range.
   */
  const expenses = useQuery({
    queryKey: qk.expenses.list({ from: period.from, to: period.to }),
    queryFn: () => getExpenses({ from: period.from, to: period.to }),
    placeholderData: previous => previous,
  });

  const byDay = useMemo(() => indexByDay(summary.data?.dailyData ?? []), [summary.data]);

  /** Every bucket, with its two figures. Future buckets carry zeros and say so. */
  const buckets = useMemo(
    () => period.buckets.map(b => ({ bucket: b, ...sumDays(byDay, b) })),
    [byDay, period.buckets],
  );

  /** What the chart draws — one shared scale, future buckets flagged. */
  const groups = useMemo<ColumnGroup[]>(
    () =>
      buckets.map(({ bucket, sales, expenses: spend }) => ({
        label: bucket.label,
        values: [sales, spend],
        ...(bucket.current ? { emphasis: true } : {}),
        ...(bucket.future ? { future: true } : {}),
      })),
    [buckets],
  );

  const elapsed = useMemo(() => buckets.filter(b => !b.bucket.future), [buckets]);

  const totals = useMemo<ComparisonTotals>(() => {
    const sales = round2(elapsed.reduce((sum, b) => sum + b.sales, 0));
    const spend = round2(elapsed.reduce((sum, b) => sum + b.expenses, 0));
    return {
      sales,
      expenses: spend,
      net: round2(sales - spend),
      margin: sales > 0 ? ((sales - spend) / sales) * 100 : null,
      expenseRatio: sales > 0 ? spend / sales : null,
    };
  }, [elapsed]);

  const previous = useMemo(() => {
    const data = previousSummary.data;
    if (!data) return null;
    const sales = toNumber(data.totalRevenue);
    const spend = toNumber(data.totalExpenses);
    return {
      sales,
      expenses: spend,
      margin: sales > 0 ? ((sales - spend) / sales) * 100 : null,
    };
  }, [previousSummary.data]);

  const change = useMemo(
    () =>
      previous
        ? {
            sales: changeBetween(totals.sales, previous.sales),
            expenses: changeBetween(totals.expenses, previous.expenses),
          }
        : null,
    [previous, totals.expenses, totals.sales],
  );

  /** Per bucket that has happened — dividing by the whole period flatters nothing. */
  const averages = useMemo(
    () => ({
      sales: elapsed.length > 0 ? round2(totals.sales / elapsed.length) : 0,
      expenses: elapsed.length > 0 ? round2(totals.expenses / elapsed.length) : 0,
    }),
    [elapsed.length, totals.expenses, totals.sales],
  );

  /**
   * Buckets that spent more than they took.
   *
   * Named in a line rather than left to be spotted in the chart: two bars a few
   * pixels apart is exactly the comparison the eye gets wrong, and this is the
   * one a manager has to act on.
   */
  const lossBuckets = useMemo(
    () => elapsed.filter(b => b.expenses > b.sales).map(b => b.bucket.label),
    [elapsed],
  );

  /**
   * The server's own header figures, kept only to be checked against.
   *
   * `dailyData` is grouped on each order's stored `business_date` while the
   * query bounds `created_at`, so an order written either side of the 02:00
   * rollover can land on a day just outside the window. The bucketed total is
   * what the bars are drawn from and is therefore what the cards must show; when
   * the two disagree by more than a rupee the screen says so rather than leaving
   * someone to reconcile them by hand.
   */
  const serverTotals = useMemo(
    () =>
      summary.data
        ? {
            sales: toNumber(summary.data.totalRevenue),
            expenses: toNumber(summary.data.totalExpenses),
          }
        : null,
    [summary.data],
  );

  const isEmpty = totals.sales === 0 && totals.expenses === 0;

  return {
    rangeKey,
    setRangeKey,
    period,
    previousDates,
    groups,
    totals,
    previous,
    change,
    averages,
    lossBuckets,
    serverTotals,
    isEmpty,

    isPending: summary.isPending,
    isError: summary.isError,
    error: summary.error,
    isFetching: summary.isFetching,
    /** Both halves, because a pull is a request to re-ask everything on screen. */
    refetch: () => {
      summary.refetch();
      previousSummary.refetch();
      expenses.refetch();
    },

    expenses,
  };
}

export type Comparison = ReturnType<typeof useComparison>;

/** `YYYY-MM-DD` → the day's two figures. */
function indexByDay(daily: readonly DailySalesData[]): Map<string, { sales: number; expenses: number }> {
  const map = new Map<string, { sales: number; expenses: number }>();
  for (const day of daily) {
    map.set(day.date, {
      sales: toNumber(day.totalRevenue),
      expenses: toNumber(day.expenses ?? 0),
    });
  }
  return map;
}

/**
 * A bucket's two figures.
 *
 * Days with no row are **absent** from `dailyData`, not zero-valued — the server
 * merges order-days with expense-days and lists nothing for a day that had
 * neither. A quiet Tuesday and a Tuesday that has not happened are the same
 * absence in the data and are told apart only by the calendar, which is why the
 * bucket carries `future` rather than this function trying to infer it.
 */
function sumDays(
  byDay: Map<string, { sales: number; expenses: number }>,
  bucket: PeriodBucket,
): { sales: number; expenses: number } {
  let sales = 0;
  let expenses = 0;
  for (const [date, figures] of byDay) {
    if (date < bucket.from || date > bucket.to) continue;
    sales += figures.sales;
    expenses += figures.expenses;
  }
  return { sales: round2(sales), expenses: round2(expenses) };
}

function changeBetween(now: number, before: number): Change {
  const delta = round2(now - before);
  return { delta, pct: before > 0 ? (delta / before) * 100 : null };
}

export type { ComparisonRangeKey, Period, PeriodBucket };
