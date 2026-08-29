import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { TopProductsScreen } from '../TopProductsScreen';
import { renderScreen } from '@/common/test-utils/render';
import * as reportsApi from '@/api/services/reportsService';

jest.mock('@/api/services/reportsService');
jest.mock('@/common/hooks/useCatalogSettings', () => ({
  useCatalogSettings: () => ({ currencySymbol: 'Rs.' }),
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

const getReportSummary = reportsApi.getReportSummary as jest.MockedFunction<
  typeof reportsApi.getReportSummary
>;

type Summary = Awaited<ReturnType<typeof reportsApi.getReportSummary>>;

/**
 * Two products whose orderings disagree, which is the whole point of the screen:
 * the volume line and the money line are rarely the same product.
 */
const SUMMARY = {
  period: 'custom',
  from: '2026-08-14T21:00:00.000Z',
  to: '2026-08-20T20:59:59.999Z',
  totalOrders: 40,
  totalRevenue: 9999,
  totalDiscount: 0,
  staffTotal: 0,
  totalCancelled: 0,
  totalPending: 0,
  averageOrderValue: 250,
  totalExpenses: 0,
  totalProfit: 0,
  dailyData: [],
  branchData: [],
  paymentMethodBreakdown: [],
  topProducts: [
    // Sells the most, earns the least.
    {
      productId: 'p1',
      productName: 'Milk Rusk',
      categoryName: 'Rusk',
      totalQty: 300,
      totalRevenue: 600,
    },
    // Sells least, earns most.
    {
      productId: 'p2',
      productName: 'Wedding Cake',
      categoryName: 'Cakes',
      totalQty: 4,
      totalRevenue: 4400,
    },
  ],
} as unknown as Summary;

beforeEach(() => {
  jest.clearAllMocks();
  getReportSummary.mockResolvedValue(SUMMARY);
});

describe('TopProductsScreen', () => {
  /**
   * The ten come back in one response. Asking the server again for the same ten
   * in a different order would be a round trip to reverse an array.
   */
  it('re-ranks without asking again', async () => {
    const screen = await renderScreen(<TopProductsScreen />);

    // Anchored on the subline: the product name also appears in the share
    // bar's legend below the list, so `getByText` on it finds two.
    await waitFor(() => expect(screen.getByText('Rs. 600 · Rusk')).toBeTruthy());
    expect(getReportSummary).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('top-products-by-revenue'));

    await waitFor(() => expect(screen.getByText('4 units · Cakes')).toBeTruthy());
    expect(getReportSummary).toHaveBeenCalledTimes(1);
  });

  /**
   * The rule this screen exists to serve: "rank 1 by units" and "biggest earner"
   * have to be distinguishable, so switching ordering MOVES a figure between the
   * value column and the subline rather than dropping it.
   */
  it('states both figures on every row, whichever one it is ranked by', async () => {
    const screen = await renderScreen(<TopProductsScreen />);

    // Ranked by units: the value column holds the count, so the subline has to
    // carry what the product earned.
    await waitFor(() => expect(screen.getByText('Rs. 600 · Rusk')).toBeTruthy());
    expect(screen.getByText('Rs. 4,400 · Cakes')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('top-products-by-revenue'));

    // Ranked by revenue: the units move the other way, and are still on screen.
    await waitFor(() => expect(screen.getByText('4 units · Cakes')).toBeTruthy());
    expect(screen.getByText('300 units · Rusk')).toBeTruthy();
  });

  /**
   * `MBStatCard` formats as currency by default, so a units total left alone
   * renders as a sum of money directly above a list of prices.
   */
  it('totals the ten without turning the unit count into money', async () => {
    const screen = await renderScreen(<TopProductsScreen />);

    await waitFor(() => expect(screen.getByTestId('top-products-total-units')).toBeTruthy());
    expect(screen.getByText('304')).toBeTruthy();
    expect(screen.queryByText('Rs. 304')).toBeNull();
  });

  /**
   * The totals are the ranked ten's, not the period's — `totalRevenue` on the
   * summary is 9999 here and must not be what the tile reports, because nothing
   * says `topProducts` is computed on the same basis.
   */
  it('totals the ranked ten rather than the whole period', async () => {
    const screen = await renderScreen(<TopProductsScreen />);

    await waitFor(() => expect(screen.getByTestId('top-products-total-revenue')).toBeTruthy());
    expect(screen.queryByText('Rs. 9,999')).toBeNull();
    expect(screen.getByText(/not a share of the whole catalogue/)).toBeTruthy();
  });

  /**
   * `TopProduct` carries no cost, so a margin ranking would have to invent one.
   * This is the screen someone uses to decide what to stop baking.
   */
  it('offers no margin ranking, because there is no cost to rank on', async () => {
    const screen = await renderScreen(<TopProductsScreen />);

    await waitFor(() => expect(screen.getByText('Rs. 600 · Rusk')).toBeTruthy());
    expect(screen.queryByTestId('top-products-by-margin')).toBeNull();
    expect(screen.queryByText(/margin/i)).toBeNull();
  });
});
