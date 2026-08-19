import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { ReportsScreen } from '../ReportsScreen';
import { renderScreen } from '@/test-utils/render';
import * as reportsApi from '@/services/api/reportsApi';
import * as catalogApi from '@/services/api/catalogApi';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/shared/types/user.types';

jest.mock('@/services/api/reportsApi');
jest.mock('@/services/api/catalogApi', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
/**
 * The export hook reaches two native modules at import time, neither of which
 * exists under Jest. The hook itself is not this suite's subject — the screen's
 * filters are — so it is stubbed whole rather than dragging a share sheet and a
 * file downloader into a test about chips.
 */
jest.mock('@/hooks/useExportReport', () => ({
  useExportReport: () => ({ exportReport: jest.fn(), isExporting: false, error: null }),
}));
jest.mock('@/hooks/useCatalogSettings', () => ({
  useCatalogSettings: () => ({ currencySymbol: 'Rs.' }),
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

const getReportSummary = reportsApi.getReportSummary as jest.MockedFunction<
  typeof reportsApi.getReportSummary
>;
const getBranches = catalogApi.getBranches as jest.Mock;

type Summary = Awaited<ReturnType<typeof reportsApi.getReportSummary>>;

const SUMMARY = {
  period: 'daily',
  from: '2026-08-19T21:00:00.000Z',
  to: '2026-08-20T20:59:59.999Z',
  totalOrders: 12,
  totalRevenue: 1250,
  totalDiscount: 40,
  staffTotal: 0,
  totalCancelled: 1,
  totalPending: 3,
  averageOrderValue: 104,
  totalExpenses: 250,
  totalProfit: 1000,
  dailyData: [{ date: '2026-08-20', totalOrders: 12, totalRevenue: 1250, totalCancelled: 1 }],
  branchData: [
    { branchId: 'b1', branchName: 'Saddar', totalOrders: 8, totalRevenue: 900, averageOrderValue: 112 },
    { branchId: 'b2', branchName: 'Gulberg', totalOrders: 4, totalRevenue: 350, averageOrderValue: 87 },
  ],
  topProducts: [
    { productId: 'p1', productName: 'Milk Rusk', categoryName: 'Rusks', totalQty: 40, totalRevenue: 700 },
  ],
  categoryBreakdown: [
    { categoryName: 'Rusks', totalQty: 40, totalRevenue: 700 },
    { categoryName: 'Cakes', totalQty: 9, totalRevenue: 550 },
  ],
  paymentMethodBreakdown: [{ method: 'cash', total: 1100, count: 10 }],
} as unknown as Summary;

/** A month's worth of days, for the daily-rows cap. */
function summaryWithDays(count: number): Summary {
  return {
    ...SUMMARY,
    dailyData: Array.from({ length: count }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      totalOrders: 1,
      totalRevenue: 100,
      totalCancelled: 0,
    })),
  } as unknown as Summary;
}

function signInAs(role: UserRole) {
  useAuthStore.setState({
    status: 'signedIn',
    claims: {
      userId: 'u1',
      email: 'a@b.com',
      role,
      branchId: role === 'super_admin' ? null : 'b1',
      branchName: role === 'super_admin' ? null : 'Saddar',
      mustChangePassword: false,
    },
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  getReportSummary.mockResolvedValue(SUMMARY);
  getBranches.mockResolvedValue([
    { id: 'b1', name: 'Saddar' },
    { id: 'b2', name: 'Gulberg' },
  ]);
  signInAs('super_admin');
});

async function showReports() {
  const screen = await renderScreen(<ReportsScreen />);
  await waitFor(() => expect(getReportSummary).toHaveBeenCalled());
  return screen;
}

describe('ReportsScreen range filters', () => {
  /**
   * The server takes a **named period or an explicit from/to, never both** —
   * `getDateRange()` in `reports.routes.ts` ignores the range whenever the
   * period is one of its four names. Sending `{period: 'daily', from, to}` is
   * not a stricter request, it is a silently different one.
   */
  it('sends a bare name for Today and bounded dates for 7 days', async () => {
    const screen = await showReports();
    expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'daily' });

    await fireEvent.press(screen.getByTestId('range-last7'));

    await waitFor(() => {
      const last = getReportSummary.mock.calls[getReportSummary.mock.calls.length - 1]![0];
      expect(last.period).toBe('custom');
      expect(last.from).toBeTruthy();
      expect(last.to).toBeTruthy();
    });
  });

  it('sends This month as a bare name too', async () => {
    const screen = await showReports();
    await fireEvent.press(screen.getByTestId('range-month'));

    await waitFor(() => expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'monthly' }));
  });

  it('reveals the date fields only once Custom is chosen', async () => {
    const screen = await showReports();
    expect(screen.queryByTestId('range-custom-dates')).toBeNull();

    await fireEvent.press(screen.getByTestId('range-custom'));
    expect(screen.queryByTestId('range-custom-dates')).not.toBeNull();
  });

  /**
   * A year of orders is the one range on this screen that can genuinely be
   * large — the summary route pulls every order **with its line items** into
   * the dyno and aggregates in Node. Custom covers anyone who truly needs it.
   */
  it('offers no Year chip', async () => {
    const screen = await showReports();
    expect(screen.queryByTestId('range-yearly')).toBeNull();
    expect(screen.queryByText('Year')).toBeNull();
  });
});

describe('ReportsScreen branch scoping', () => {
  it('scopes to a branch and keeps the two branches on separate cache keys', async () => {
    const screen = await showReports();
    await waitFor(() => expect(screen.getByTestId('report-branch-b2')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('report-branch-b2'));
    await waitFor(() =>
      expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'daily', branchId: 'b2' }),
    );

    // A different branch is a different question, not a cached one.
    await fireEvent.press(screen.getByTestId('report-branch-b1'));
    await waitFor(() =>
      expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'daily', branchId: 'b1' }),
    );
  });

  it('omits branchId entirely for All branches', async () => {
    const screen = await showReports();
    await waitFor(() => expect(screen.getByTestId('report-branch-b2')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('report-branch-b2'));
    await waitFor(() => expect(getReportSummary).toHaveBeenLastCalledWith(expect.objectContaining({ branchId: 'b2' })));

    await fireEvent.press(screen.getByTestId('report-branch-all'));
    await waitFor(() => expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'daily' }));
  });

  /**
   * A branch manager is pinned to their own branch by the server, off the JWT.
   * Sending `branchId` from a client that a user can influence is exactly what
   * the server refuses to trust — and fetching a branch list they cannot use is
   * a request whose answer is thrown away.
   */
  it('gives a branch manager no branch filter and asks for no branch list', async () => {
    signInAs('branch_manager');
    const screen = await showReports();

    expect(screen.queryByTestId('report-branch-all')).toBeNull();
    expect(getBranches).not.toHaveBeenCalled();
    expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'daily' });
  });
});

describe('ReportsScreen breakdowns', () => {
  /**
   * All four rollups arrive in the one summary response. Switching between them
   * must not re-ask the server — and four bar lists stacked at once would mount
   * every row of all four before the first is on screen.
   */
  it('switches dimension without a request, and mounts one at a time', async () => {
    const screen = await showReports();
    // The bar row carries the order count; the branch chip is the bare name.
    await waitFor(() => expect(screen.getByText('Saddar · 8')).toBeTruthy());
    const callsAfterLoad = getReportSummary.mock.calls.length;

    // Branch is showing; the product rollup is not mounted.
    expect(screen.queryByText(/Milk Rusk/)).toBeNull();

    await fireEvent.press(screen.getByTestId('report-by-product'));
    await waitFor(() => expect(screen.getByText(/Milk Rusk/)).toBeTruthy());
    expect(screen.queryByText('Gulberg · 4')).toBeNull();

    await fireEvent.press(screen.getByTestId('report-by-payment'));
    await waitFor(() => expect(screen.getByText(/cash/)).toBeTruthy());

    await fireEvent.press(screen.getByTestId('report-by-category'));
    await waitFor(() => expect(screen.getByText(/Cakes/)).toBeTruthy());

    expect(getReportSummary.mock.calls.length).toBe(callsAfterLoad);
  });

  it('offers a branch manager no Branch dimension — they are the branch', async () => {
    signInAs('branch_manager');
    const screen = await showReports();

    expect(screen.queryByTestId('report-by-branch')).toBeNull();
    expect(screen.getByTestId('report-by-product')).toBeTruthy();
    expect(screen.getByTestId('report-by-category')).toBeTruthy();
  });

  /**
   * The app ships on its own cycle and can be newer than the API it talks to.
   * "No categories sold" and "your server does not report categories" are
   * opposite facts, and only one of them is about the bakery.
   */
  it('says so when the server does not report categories, rather than showing nothing', async () => {
    // `delete` is legal here precisely because the field is optional in the
    // shared type — which is the contract this test is about.
    const older: Summary = { ...SUMMARY };
    delete older.categoryBreakdown;
    getReportSummary.mockResolvedValue(older);

    const screen = await showReports();
    await fireEvent.press(screen.getByTestId('report-by-category'));

    await waitFor(() =>
      expect(screen.getByText(/does not report category totals yet/)).toBeTruthy(),
    );
  });
});

describe('ReportsScreen daily rows', () => {
  /**
   * A silent slice is a screen that looks like a complete answer to a question
   * nobody asked. The cap is stated, and it points at the export for the rest.
   */
  it('caps the listed days and says how many it left out', async () => {
    getReportSummary.mockResolvedValue(summaryWithDays(31));
    const screen = await showReports();

    await waitFor(() => expect(screen.getByText('Latest 14 of 31 days · export for the full range')).toBeTruthy());
    // The oldest day is not rendered; the newest is.
    expect(screen.queryByText('2026-07-01')).toBeNull();
    expect(screen.getByText('2026-07-31')).toBeTruthy();
  });

  it('says nothing about a cap when the range fits', async () => {
    getReportSummary.mockResolvedValue(summaryWithDays(7));
    const screen = await showReports();

    await waitFor(() => expect(screen.getByText('2026-07-07')).toBeTruthy());
    expect(screen.queryByText(/export for the full range/)).toBeNull();
  });
});
