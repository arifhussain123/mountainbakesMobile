import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { SalesVsExpensesScreen } from '../SalesVsExpensesScreen';
import { renderScreen } from '@/common/test-utils/render';
import * as reportsApi from '@/api/services/reportsService';
import * as expensesApi from '@/api/services/expensesService';
import { businessDayBounds } from '@/shared/utils/timezone';

jest.mock('@/api/services/reportsService');
jest.mock('@/api/services/expensesService');
jest.mock('@/common/hooks/useCatalogSettings', () => ({
  useCatalogSettings: () => ({ currencySymbol: 'Rs.' }),
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));
const mockExport = jest.fn();
jest.mock('@/common/hooks/useExportReport', () => ({
  useExportReport: () => ({ exportReport: mockExport, isExporting: false, error: null }),
}));

const getReportSummary = reportsApi.getReportSummary as jest.MockedFunction<
  typeof reportsApi.getReportSummary
>;
const getExpenses = expensesApi.getExpenses as jest.MockedFunction<typeof expensesApi.getExpenses>;

type Summary = Awaited<ReturnType<typeof reportsApi.getReportSummary>>;

/**
 * 5 November 2025, a Wednesday.
 *
 * Pinned because every figure on this screen is relative to the calendar: which
 * buckets have happened, how many days the comparison is truncated to, and what
 * "so far" means. Unpinned, the suite would assert a different set of buckets
 * every day it ran.
 *
 * 10:00 Karachi is 05:00 UTC, comfortably clear of the 02:00 business-day
 * rollover in both directions.
 */
const WED_5_NOV = new Date('2025-11-05T05:00:00.000Z');

function summary(over: Partial<Summary> = {}): Summary {
  return {
    period: 'custom',
    from: '2025-11-01',
    to: '2025-11-30',
    totalOrders: 0,
    totalRevenue: 0,
    totalDiscount: 0,
    staffTotal: 0,
    totalCancelled: 0,
    totalPending: 0,
    averageOrderValue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    dailyData: [],
    branchData: [],
    paymentMethodBreakdown: [],
    topProducts: [],
    ...over,
  } as Summary;
}

function day(date: string, revenue: number, expenses: number) {
  return { date, totalOrders: 1, totalRevenue: revenue, totalCancelled: 0, expenses };
}

/**
 * November so far: 1,000 in and 400 out across the first slice.
 * October's first five days: 800 in and 200 out.
 */
const NOVEMBER = summary({
  totalRevenue: 1000,
  totalExpenses: 400,
  dailyData: [day('2025-11-03', 600, 250), day('2025-11-04', 400, 150)],
});

const PREVIOUS = summary({ totalRevenue: 800, totalExpenses: 200 });

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'], now: WED_5_NOV });
  jest.clearAllMocks();
  getExpenses.mockResolvedValue([]);
  /*
   * Which window was asked for, by its exact lower bound.
   *
   * NOT `startsWith('2025-10')`: the business day rolls at 02:00 Karachi, so
   * November's range *starts* at `2025-10-31T21:00Z` — matching on the month
   * prefix hands the current period the previous period's figures and every
   * assertion below then passes or fails for the wrong reason.
   */
  const OCTOBER_1 = businessDayBounds('2025-10-01').fromISO;
  getReportSummary.mockImplementation(async options =>
    options.from === OCTOBER_1 ? PREVIOUS : NOVEMBER,
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SalesVsExpensesScreen', () => {
  it('opens on the calendar month and says how much of it has happened', async () => {
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    await waitFor(() => expect(screen.getByText('Nov 2025 so far')).toBeTruthy());
  });

  /**
   * The comparison is truncated to the elapsed span. Untruncated, five days of
   * November against the whole of October would report a collapse that is the
   * calendar, every month.
   */
  it('asks for the same number of days from the previous month', async () => {
    await renderScreen(<SalesVsExpensesScreen />);

    await waitFor(() => expect(getReportSummary).toHaveBeenCalledTimes(2));

    // 1–5 October against 1–5 November, as business-day bounds — five days
    // against five, not five against thirty-one.
    expect(getReportSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        from: businessDayBounds('2025-10-01').fromISO,
        to: businessDayBounds('2025-10-05').toISO,
      }),
    );
  });

  it('totals only the buckets that have happened', async () => {
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    // 1,000 in, 400 out, so 600 net — and the four slices of November still to
    // come contribute nothing rather than dragging it down.
    await waitFor(() => expect(screen.getByText('Rs. 600')).toBeTruthy());
    // Both operands are under it, so the subtraction can be checked against the
    // two cards above rather than believed. Asserted by label rather than by
    // counting the figures: `Rs. 1,000` legitimately appears three times here —
    // the sales card, the hero's operand, and the per-week average, which equals
    // the total while only one week of November has started.
    // "Sales" answers three times over — the card, the chart's legend and the
    // hero's operand — which is the point: they are the same figure said three
    // ways, and they agree because one derivation produced all three.
    expect(screen.getAllByText('Sales').length).toBeGreaterThan(1);
    expect(screen.getByText('less Expenses')).toBeTruthy();
    expect(screen.getByText('Avg / week')).toBeTruthy();
  });

  /**
   * The chart's sentence is the only thing a reader who cannot see the hairline
   * bars gets, so it has to name them.
   */
  it('tells a screen reader which buckets have not happened yet', async () => {
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText(/4 weeks still to come, not counted/)).toBeTruthy(),
    );
  });

  /**
   * The same arrow, the opposite meaning. Sales up is good news; expenses up is
   * not, and colouring both by direction alone answers "how are we doing" wrong.
   */
  it('reads a rise in sales and a rise in expenses as different news', async () => {
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    // Sales 800 → 1,000 and expenses 200 → 400: both up, and only one is good.
    await waitFor(() =>
      expect(screen.getByLabelText(/Sales up 25 per cent vs the same 5 days last month/)).toBeTruthy(),
    );
    expect(
      screen.getByLabelText(/Expenses up 100 per cent vs the same 5 days last month/),
    ).toBeTruthy();
  });

  it('states the margin against the previous period', async () => {
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    // 600/1000 = 60% now; 600/800 = 75% then.
    await waitFor(() => expect(screen.getByText(/Margin 60% · was 75%/)).toBeTruthy());
  });

  /** The figure a manager can act on, and it is not the margin. */
  it('gives what was spent per rupee taken', async () => {
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    await waitFor(() => expect(screen.getByText('Spent per rupee taken')).toBeTruthy());
    expect(screen.getByText('Rs. 0.40')).toBeTruthy();
  });

  /**
   * Two bars a few pixels apart is exactly the comparison the eye gets wrong,
   * and this is the one thing on the screen that has to be acted on.
   */
  it('names a bucket that spent more than it took', async () => {
    getReportSummary.mockImplementation(async options =>
      options.from === businessDayBounds('2025-10-01').fromISO
        ? PREVIOUS
        : summary({
            totalRevenue: 100,
            totalExpenses: 500,
            dailyData: [day('2025-11-03', 100, 500)],
          }),
    );
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    await waitFor(() => expect(screen.getByText(/1–7 spent more than it took/)).toBeTruthy());
  });

  /**
   * A real state. Zeroed cards state a margin of 0% that is actually undefined,
   * and a chart of flat stubs looks exactly like a terrible month.
   */
  it('says a period is empty rather than rendering zeroes', async () => {
    getReportSummary.mockResolvedValue(summary());
    const screen = await renderScreen(<SalesVsExpensesScreen />);

    await waitFor(() =>
      expect(screen.getByText(/Nothing recorded in nov 2025 so far/i)).toBeTruthy(),
    );
    expect(screen.queryByTestId('sve-net')).toBeNull();
    expect(screen.queryByText(/Margin/)).toBeNull();
  });

  describe('export', () => {
    it('sends a named period for a month, so the file is named for one', async () => {
      const screen = await renderScreen(<SalesVsExpensesScreen />);
      await waitFor(() => expect(screen.getByTestId('sve-export-excel')).toBeTruthy());

      await fireEvent.press(screen.getByTestId('sve-export-excel'));

      expect(mockExport).toHaveBeenCalledWith({ type: 'excel', period: 'monthly' });
    });

    it('sends a named period for a week', async () => {
      const screen = await renderScreen(<SalesVsExpensesScreen />);
      await waitFor(() => expect(screen.getByTestId('sve-range-week')).toBeTruthy());
      await fireEvent.press(screen.getByTestId('sve-range-week'));

      await fireEvent.press(screen.getByTestId('sve-export-pdf'));

      expect(mockExport).toHaveBeenCalledWith({ type: 'pdf', period: 'weekly' });
    });

    /**
     * A quarter has no named period on the server, so it goes as a custom span.
     * Sending `period` alone would export the current MONTH under a file called
     * `custom` while the screen showed a quarter.
     */
    it('sends the span for a quarter, which the server has no name for', async () => {
      const screen = await renderScreen(<SalesVsExpensesScreen />);
      await waitFor(() => expect(screen.getByTestId('sve-range-quarter')).toBeTruthy());
      await fireEvent.press(screen.getByTestId('sve-range-quarter'));

      await fireEvent.press(screen.getByTestId('sve-export-csv'));

      expect(mockExport).toHaveBeenLastCalledWith({
        type: 'csv',
        period: 'custom',
        from: businessDayBounds('2025-10-01').fromISO,
        to: businessDayBounds('2025-12-31').toISO,
      });
    });
  });
});
