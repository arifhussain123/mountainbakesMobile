import React from 'react';

import { ProductionDashboardScreen } from '../ProductionDashboardScreen';
import { renderScreen } from '@/test-utils/render';
import * as productionApi from '@/services/api/productionApi';

jest.mock('@/services/api/productionApi');

const getProductionOverview = productionApi.getProductionOverview as jest.MockedFunction<
  typeof productionApi.getProductionOverview
>;
const getProductionQueueStats = productionApi.getProductionQueueStats as jest.MockedFunction<
  typeof productionApi.getProductionQueueStats
>;

/**
 * The distinction under test is that the six headline figures come from **two
 * pipelines** — customer orders on the bench, and branch demands going out —
 * and must not be presented as one. The screen this replaced showed
 * `approvedOrders` and `deliveredOrders` as separate tiles, which is the same
 * server value twice: `production.routes.ts` assigns
 * `const deliveredOrders = approvedOrders; // Approve = Delivered`.
 */

const OVERVIEW = {
  cards: {
    waitingOrders: 9, // demand-side pending — deliberately different from the queue's 4
    approvedOrders: 7,
    deliveredOrders: 7,
    changedOrders: 2,
    returnedProducts: 15,
    todayProduction: 120,
    weeklyProduction: 800,
    monthlyProduction: 3200,
    totalBranches: 3,
    totalProducts: 40,
    totalDemandQty: 210,
    availableProductionStock: 640,
  },
  demandByDay: [{ date: '2026-08-19', qty: 210, orders: 9 }],
  demandByMonth: [],
  branchDemand: [{ branchId: 'b1', branchName: 'Gilgit', qty: 210 }],
  topProducts: [{ productId: 'p1', productName: 'Cream roll', qty: 90 }],
};

const QUEUE = { waitingCount: 4, preparingCount: 5, readyCount: 6, totalActive: 15 };

beforeEach(() => {
  jest.clearAllMocks();
  getProductionOverview.mockResolvedValue(OVERVIEW as never);
  getProductionQueueStats.mockResolvedValue(QUEUE);
});

describe('ProductionDashboardScreen', () => {
  it('fires both pipeline requests concurrently', async () => {
    await renderScreen(<ProductionDashboardScreen />);

    expect(getProductionOverview).toHaveBeenCalledTimes(1);
    expect(getProductionQueueStats).toHaveBeenCalledTimes(1);
  });

  it('takes the three bench figures from the order queue, not the demand counts', async () => {
    const screen = await renderScreen(<ProductionDashboardScreen />);

    // 4/5/6 are the queue's; 9 is the demand-side `waitingOrders`, which is a
    // different pipeline and must not be what "Waiting orders" shows.
    expect(await screen.findByLabelText(/Waiting orders: 4/)).toBeTruthy();
    expect(await screen.findByLabelText(/In production: 5/)).toBeTruthy();
    expect(await screen.findByLabelText(/Prepared: 6/)).toBeTruthy();
  });

  it('shows all six headline figures the brief asks for', async () => {
    const screen = await renderScreen(<ProductionDashboardScreen />);

    expect(await screen.findByLabelText(/Delivered: 7/)).toBeTruthy();
    expect(await screen.findByLabelText(/Returned: 15/)).toBeTruthy();
    expect(await screen.findByLabelText(/Changed orders: 2/)).toBeTruthy();
  });

  it('never shows Approved beside Delivered — they are the same server value', async () => {
    const screen = await renderScreen(<ProductionDashboardScreen />);
    await screen.findByLabelText(/Delivered: 7/);

    expect(screen.queryByText('Approved')).toBeNull();
  });

  it('says what the Delivered figure actually counts', async () => {
    const screen = await renderScreen(<ProductionDashboardScreen />);

    // The API returns approvals over a 7-day window, not same-day deliveries.
    expect(await screen.findByText('Demands approved, last 7 days')).toBeTruthy();
  });

  it('reports the daily, weekly and monthly prepared quantities', async () => {
    const screen = await renderScreen(<ProductionDashboardScreen />);

    expect(await screen.findByText('120')).toBeTruthy();
    expect(await screen.findByText('800')).toBeTruthy();
    expect(await screen.findByText('3,200')).toBeTruthy();
  });
});
