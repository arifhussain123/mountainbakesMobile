import React from 'react';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/stockHistoryService', () => ({
  getBranchStockDay: jest.fn(),
  getBranchStockHistory: jest.fn(),
}));
jest.mock('@/api/services/catalogService', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.' })),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { date: '2026-08-20' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

import { getBranchStockDay } from '@/api/services/stockHistoryService';
import type { BranchStockHistoryRow } from '@/shared/types/stock.types';
import { renderScreen } from '@/common/test-utils/render';
import { StockDayScreen } from '../StockDayScreen';

const getDay = getBranchStockDay as jest.Mock;

/**
 * A day that reconciles: opening + new − sold − returned + adjustment = balance.
 * Quantities and amounts move in OPPOSITE directions on purpose — 20 items sold
 * off the shelf while a more valuable delivery came in — which is the case the
 * closing change exists to report.
 */
const ROW: BranchStockHistoryRow = {
  date: '2026-08-20',
  openingQty: 100,
  openingAmount: 5000,
  newQty: 30,
  newAmount: 4000,
  soldQty: 50,
  soldAmount: 2500,
  returnedQty: 0,
  returnedAmount: 0,
  adjustmentQty: 0,
  adjustmentAmount: 0,
  balanceQty: 80,
  balanceAmount: 6500,
};

beforeEach(() => {
  jest.clearAllMocks();
  getDay.mockResolvedValue({ row: ROW });
});

describe('StockDayScreen', () => {
  it('carries the previous balance in under the day before, not today', async () => {
    const screen = await renderScreen(<StockDayScreen />);

    await waitFor(() => expect(screen.getByText('Previous balance')).toBeTruthy());
    // 2026-08-20's opening is 2026-08-19's closing. Stamping it with the 20th
    // would say stock arrived this morning that has been there since yesterday.
    expect(screen.getByText('19 Aug 2026')).toBeTruthy();
  });

  /**
   * The reason both figures are stated. Units and value can move in opposite
   * directions on an ordinary day, and either one alone reports that day as a
   * clean gain or a clean loss — both readings wrong.
   */
  it('states the day\'s change in units and in value', async () => {
    const screen = await renderScreen(<StockDayScreen />);

    await waitFor(() => expect(screen.getByTestId('stock-day-change')).toBeTruthy());
    // 20 items fewer on the shelf, Rs. 1,500 more sitting on it.
    expect(screen.getByText(/-20 items · \+1,500 on the day/)).toBeTruthy();
  });

  /**
   * A shut shop, or one whose sales have not synced. A table of zeroes with no
   * sentence beside it reads as a fetch that went wrong.
   */
  it('says so when nothing moved, rather than drawing a silent table of zeroes', async () => {
    getDay.mockResolvedValue({
      row: {
        ...ROW,
        newQty: 0,
        newAmount: 0,
        soldQty: 0,
        soldAmount: 0,
        balanceQty: 100,
        balanceAmount: 5000,
      },
    });
    const screen = await renderScreen(<StockDayScreen />);

    await waitFor(() => expect(screen.getByTestId('stock-day-nothing-moved')).toBeTruthy());
    // Both ends still drawn — a ledger needs them even on a day with no middle.
    expect(screen.getByText('Previous balance')).toBeTruthy();
    expect(screen.getByText('Remaining')).toBeTruthy();
    // Nothing changed, so there is no change to state.
    expect(screen.queryByTestId('stock-day-change')).toBeNull();
  });

  it('keeps the note off a day that did move', async () => {
    const screen = await renderScreen(<StockDayScreen />);

    await waitFor(() => expect(screen.getByText('Remaining')).toBeTruthy());
    expect(screen.queryByTestId('stock-day-nothing-moved')).toBeNull();
  });

  /**
   * A zero line is noise on the overwhelming majority of days and pushes the
   * closing balance below the fold. Opening, new, sold and balance are always
   * meaningful; returns and adjustments are not.
   */
  it('prints returns and adjustments only when they moved', async () => {
    const screen = await renderScreen(<StockDayScreen />);

    await waitFor(() => expect(screen.getByText('Sold')).toBeTruthy());
    expect(screen.queryByText('Returned to production')).toBeNull();
    expect(screen.queryByText('Adjustments')).toBeNull();
  });
});
