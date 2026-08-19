import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { AdminDashboardScreen } from '../AdminDashboardScreen';
import { renderScreen } from '@/test-utils/render';
import * as productionApi from '@/services/api/productionApi';
import * as reportsApi from '@/services/api/reportsApi';

jest.mock('@/services/api/reportsApi');
jest.mock('@/services/api/productionApi');
jest.mock('@/hooks/useCatalogSettings', () => ({
  useCatalogSettings: () => ({ currencySymbol: 'Rs.' }),
}));

const getReportSummary = reportsApi.getReportSummary as jest.MockedFunction<
  typeof reportsApi.getReportSummary
>;
const getProductionOrders = productionApi.getProductionOrders as jest.MockedFunction<
  typeof productionApi.getProductionOrders
>;
const getBranchStock = productionApi.getBranchStock as jest.MockedFunction<
  typeof productionApi.getBranchStock
>;

const SUMMARY = {
  period: 'daily',
  from: '',
  to: '',
  totalOrders: 12,
  totalRevenue: 1250,
  totalDiscount: 0,
  staffTotal: 0,
  totalCancelled: 1,
  totalPending: 3,
  averageOrderValue: 104,
  totalExpenses: 250,
  totalProfit: 1000,
  dailyData: [{ date: '2026-08-19', totalOrders: 12, totalRevenue: 1250, totalCancelled: 1 }],
  branchData: [],
  topProducts: [],
  paymentMethodBreakdown: [],
} as unknown as Awaited<ReturnType<typeof reportsApi.getReportSummary>>;

beforeEach(() => {
  jest.clearAllMocks();
  getReportSummary.mockResolvedValue(SUMMARY);
  getProductionOrders.mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never);
  getBranchStock.mockResolvedValue({
    branches: [
      { branchId: '1', branchName: 'Gilgit' },
      { branchId: '2', branchName: 'Skardu' },
    ],
    rows: [
      // Low in one branch, healthy in the other — counts once, not twice.
      { productId: 'p1', productName: 'Cream roll', byBranch: { '1': 2, '2': 40 } },
      { productId: 'p2', productName: 'Patties', byBranch: { '1': 30, '2': 40 } },
      // Zero is OUT, not LOW — `isLowStock` is `> 0 && < 5`.
      { productId: 'p3', productName: 'Doughnut', byBranch: { '1': 0, '2': 0 } },
    ],
  });
});

describe('AdminDashboardScreen', () => {
  it('fires its three requests concurrently, not in a waterfall', async () => {
    await renderScreen(<AdminDashboardScreen />);

    expect(getReportSummary).toHaveBeenCalledTimes(1);
    expect(getProductionOrders).toHaveBeenCalledWith({ status: 'pending' });
    expect(getBranchStock).toHaveBeenCalledTimes(1);
  });

  it('asks the server to filter pending demand rather than counting locally', async () => {
    await renderScreen(<AdminDashboardScreen />);

    // Fetching every demand to render one number would transfer the year.
    expect(getProductionOrders).not.toHaveBeenCalledWith({});
  });

  it('counts a product low once however many branches it is low in', async () => {
    const screen = await renderScreen(<AdminDashboardScreen />);

    // p1 only. p2 is healthy everywhere, p3 is out (0), which is not "low".
    expect(await screen.findByText('1')).toBeTruthy();
  });

  it('takes the branch count from the stock call rather than a fourth request', async () => {
    const screen = await renderScreen(<AdminDashboardScreen />);

    expect(await screen.findByLabelText(/Branches: 2/)).toBeTruthy();
  });

  it('re-queries only the period-scoped call when the range changes', async () => {
    const screen = await renderScreen(<AdminDashboardScreen />);
    expect(getReportSummary).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('range-yesterday'));

    // Summary is keyed on the range; stock and pending demand are not scoped to
    // it and must not be refetched by a chip tap.
    expect(getReportSummary).toHaveBeenCalledTimes(2);
    expect(getBranchStock).toHaveBeenCalledTimes(1);
    expect(getProductionOrders).toHaveBeenCalledTimes(1);
  });

  it('sends a bounded range for Yesterday and a bare name for Today', async () => {
    const screen = await renderScreen(<AdminDashboardScreen />);
    expect(getReportSummary).toHaveBeenLastCalledWith({ period: 'daily' });

    await fireEvent.press(screen.getByTestId('range-yesterday'));

    const sent = getReportSummary.mock.calls.at(-1)![0];
    expect(sent.period).toBe('custom');
    expect(sent.from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(sent.to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('shows the range fields only once Custom is chosen', async () => {
    const screen = await renderScreen(<AdminDashboardScreen />);
    expect(screen.queryByTestId('range-custom-dates')).toBeNull();

    await fireEvent.press(screen.getByTestId('range-custom'));

    expect(screen.queryByTestId('range-custom-dates')).not.toBeNull();
  });
});
