import React from 'react';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/reportsApi', () => ({
  getReportSummary: jest.fn(),
  exportReport: jest.fn(),
}));
jest.mock('@/services/api/stockHistoryApi', () => ({
  getBranchStockDay: jest.fn(),
  getBranchStockHistory: jest.fn(),
}));
jest.mock('@/services/api/catalogApi', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.' })),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import { getReportSummary } from '@/services/api/reportsApi';
import { getBranchStockDay } from '@/services/api/stockHistoryApi';
import type { ReportSummary } from '@/shared/types/report.types';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { renderScreen } from '@/test-utils/render';
import { BranchDashboardScreen, budgetForPeriod } from '../BranchDashboardScreen';

const summary = getReportSummary as jest.Mock;
const stockDay = getBranchStockDay as jest.Mock;

const SUMMARY: ReportSummary = {
  period: 'daily',
  from: '2026-08-25',
  to: '2026-08-25',
  totalOrders: 43,
  totalRevenue: 34050,
  totalDiscount: 550,
  staffTotal: 0,
  totalCancelled: 0,
  totalPending: 0,
  averageOrderValue: 792,
  totalExpenses: 2370,
  totalProfit: 12000,
  dailyData: [],
  branchData: [],
  topProducts: [],
  paymentMethodBreakdown: [],
};

const STOCK_ROW = {
  date: '2026-08-25',
  openingQty: 66,
  openingAmount: 19600,
  newQty: 0,
  newAmount: 0,
  soldQty: 0,
  soldAmount: 0,
  returnedQty: 0,
  returnedAmount: 0,
  adjustmentQty: 0,
  adjustmentAmount: 0,
  balanceQty: 66,
  balanceAmount: 19600,
};

beforeEach(() => {
  jest.clearAllMocks();
  summary.mockResolvedValue(SUMMARY);
  stockDay.mockResolvedValue({ branchId: 'b1', date: '2026-08-25', row: STOCK_ROW });
  useNetworkStore.setState({ isOnline: true, hasResolved: true });
  useAuthStore.setState({
    claims: {
      userId: 'u1',
      email: 'manager@example.com',
      role: 'branch_manager',
      branchId: 'b1',
      branchName: 'Committee Chowk Branch',
    },
  } as never);
});

/**
 * The rule this helper exists to hold: **absent is not zero.**
 *
 * `budget` is optional on `ReportSummary` because a shipped app can be talking
 * to an older API. A branch with no budget set and a server that does not report
 * one are different states, and neither of them means "you have spent your whole
 * allowance" — which is what a card drawn against a max of 0 would say.
 */
describe('budgetForPeriod', () => {
  it('returns null when the server reported no budget at all', () => {
    expect(budgetForPeriod(SUMMARY, 'monthly')).toBeNull();
  });

  it('returns null when the branch has a budget field set to zero', () => {
    const withZero = { ...SUMMARY, budget: { daily: 0, weekly: 0, monthly: 0 } };
    expect(budgetForPeriod(withZero, 'daily')).toBeNull();
  });

  /**
   * The figure has to match the range the actual came from. Measuring a month's
   * takings against a daily allowance is a card that is always over.
   */
  it('picks the figure for the period being shown', () => {
    const withBudget = { ...SUMMARY, budget: { daily: 2000, weekly: 12000, monthly: 50000 } };
    expect(budgetForPeriod(withBudget, 'daily')).toBe(2000);
    expect(budgetForPeriod(withBudget, 'weekly')).toBe(12000);
    expect(budgetForPeriod(withBudget, 'monthly')).toBe(50000);
  });

  it('returns null for an absent summary rather than throwing', () => {
    expect(budgetForPeriod(undefined, 'daily')).toBeNull();
  });
});

describe('BranchDashboardScreen', () => {
  it('draws the budget card when the server reported one', async () => {
    summary.mockResolvedValue({
      ...SUMMARY,
      budget: { daily: 2000, weekly: 12000, monthly: 50000 },
    });

    const screen = await renderScreen(<BranchDashboardScreen />);

    await waitFor(() => expect(screen.getByTestId('budget-card')).toBeTruthy());
    expect(screen.getByText('Budget vs Actual')).toBeTruthy();
  });

  it('draws no budget card when the server reported none', async () => {
    const screen = await renderScreen(<BranchDashboardScreen />);

    // Waits on the stock strip rather than on a word: "Orders" is both a card
    // title and a quick action, and `getByText` throws on two matches.
    await waitFor(() => expect(screen.getByTestId('stock-summary')).toBeTruthy());
    expect(screen.queryByTestId('budget-card')).toBeNull();
  });

  /**
   * The stock strip reads **today**, never the selected period.
   *
   * The chips choose a range for the money figures; what is on the shelf is a
   * fact about now, and a strip that moved with the filter would report a
   * balance nobody can go and count.
   */
  it('asks for today\'s ledger row and sends no branchId', async () => {
    await renderScreen(<BranchDashboardScreen />);

    await waitFor(() => expect(stockDay).toHaveBeenCalled());
    expect(Object.keys(stockDay.mock.calls[0][0])).toEqual(['date']);
  });

  it('shows the stock strip with the closing balance, not the day\'s takings', async () => {
    const screen = await renderScreen(<BranchDashboardScreen />);

    await waitFor(() => expect(screen.getByTestId('stock-summary')).toBeTruthy());
    expect(screen.getByText('Branch Stock')).toBeTruthy();
    expect(screen.getByText('66 on hand')).toBeTruthy();
  });

  /**
   * Net and Profit are different numbers and are labelled as such.
   *
   * Net is sales less expenses — 34,050 − 2,370. `totalProfit` carries cost of
   * goods and is 12,000 here, deliberately different, so a card labelled Net
   * showing profit would reconcile with nothing on the screen.
   */
  it('reports Net as sales less expenses and keeps Profit under its own name', async () => {
    const screen = await renderScreen(<BranchDashboardScreen />);

    await waitFor(() => expect(screen.getByText('Net')).toBeTruthy());
    expect(screen.getByText('Sales less expenses')).toBeTruthy();
    expect(screen.getByText('Profit')).toBeTruthy();
  });

  it('shows the order counts with a way through to the list', async () => {
    const screen = await renderScreen(<BranchDashboardScreen />);

    await waitFor(() => expect(screen.getByTestId('dashboard-view-orders')).toBeTruthy());
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  /**
   * The date under the chips comes from the server's own `from`/`to`, not from
   * a range recomputed here — a client working out its own "this week" would
   * eventually disagree with the figures printed beside it.
   */
  it('labels the range from the answer rather than recomputing it', async () => {
    summary.mockResolvedValue({ ...SUMMARY, period: 'weekly', from: '2026-08-19', to: '2026-08-25' });

    const screen = await renderScreen(<BranchDashboardScreen />);

    await waitFor(() => expect(screen.getByText('19 Aug 2026 – 25 Aug 2026')).toBeTruthy());
  });
});
