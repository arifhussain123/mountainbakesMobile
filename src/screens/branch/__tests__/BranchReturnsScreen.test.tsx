import React from 'react';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/returnsApi', () => ({
  getBranchReturns: jest.fn(),
  getProductionReturns: jest.fn(),
  reviewProductionReturn: jest.fn(),
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import { getBranchReturns } from '@/services/api/returnsApi';
import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { useNetworkStore } from '@/store/networkStore';
import { renderScreen } from '@/test-utils/render';
import { BranchReturnsScreen } from '../BranchReturnsScreen';

const getReturns = getBranchReturns as jest.Mock;

const RETURN: ProductionReturn = {
  id: 'r1',
  branchId: 'b1',
  branchName: 'Committee Chowk',
  productId: 'p1',
  productName: 'Cream Puff',
  qty: 12,
  reason: 'Unsold at close',
  status: 'pending',
  source: 'branch',
  date: '2026-08-25',
} as ProductionReturn;

beforeEach(() => {
  jest.clearAllMocks();
  getReturns.mockResolvedValue([RETURN]);
  useNetworkStore.setState({ isOnline: true, hasResolved: true });
});

describe('BranchReturnsScreen', () => {
  /**
   * The branch route, not the production queue.
   *
   * `GET /api/production-returns` is `requireRole('super_admin',
   * 'production_user')` on the router itself — a branch account is refused the
   * read outright, so calling it here would be a 403 on first load rather than
   * an empty list.
   */
  it('reads the branch route with the window it advertises', async () => {
    await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(getReturns).toHaveBeenCalled());
    expect(getReturns).toHaveBeenCalledWith(90);
  });

  it('states the window, because the chips do not change it', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText(/Last 90 days/)).toBeTruthy());
  });

  /**
   * The one word this screen must not get wrong.
   *
   * A branch return takes the units off the shelf **as it is raised** and then
   * waits for the counter to decide. Labelling that `pending` reads as "nothing
   * has happened yet", which is the opposite of the truth — the stock is already
   * gone and only its destination is open.
   */
  it('never labels a raised return as though nothing had happened', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('With production')).toBeTruthy());
    expect(screen.queryByText('Pending')).toBeNull();
  });

  it('filters what came back rather than re-querying', async () => {
    getReturns.mockResolvedValue([RETURN, { ...RETURN, id: 'r2', status: 'accepted' }]);

    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('With production')).toBeTruthy());
    // Two matches: the filter chip and the second row's status tag. `getByText`
    // throws on two, so this asserts both are present rather than one.
    expect(screen.getAllByText('Accepted')).toHaveLength(2);
    // One request for the window; the chips narrow the rows in place.
    expect(getReturns).toHaveBeenCalledTimes(1);
  });

  it('shows the quantity handed back and no money figure', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('Cream Puff')).toBeTruthy());
    expect(screen.getByText('12')).toBeTruthy();
    // `ProductionReturn` carries no amount. Valuing it from the cached price
    // list would put a figure on the row the server never agreed to — and one a
    // reader would take for a refund.
    expect(screen.queryByText(/Rs\./)).toBeNull();
  });
});
