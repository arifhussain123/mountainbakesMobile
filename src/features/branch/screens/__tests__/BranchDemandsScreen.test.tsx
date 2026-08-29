import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/productionService', () => ({
  getProductionOrders: jest.fn(),
  cancelProductionOrder: jest.fn(),
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import { getProductionOrders } from '@/api/services/productionService';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';
import { useNetworkStore } from '@/state/networkStore';
import { renderScreen } from '@/common/test-utils/render';
import { BranchDemandsScreen } from '../BranchDemandsScreen';

const getOrders = getProductionOrders as jest.Mock;

/**
 * Dated well in the past on purpose. `businessDateLabel` says "Today" and
 * "Yesterday" against the real clock, so a fixture dated near now would render
 * a different string depending on when the suite ran.
 */
const DEMAND: BranchProductionOrder = {
  id: 'd1',
  demandNumber: 'DMD-000101',
  branchId: 'b1',
  branchName: 'Committee Chowk',
  date: '2026-01-14',
  time: '09:14',
  requiredDate: '2026-01-15',
  items: [{ productId: 'p1', productName: 'Cream Puff', qty: 12, remarks: '' }],
  status: 'pending',
  createdBy: 'u1',
  createdByName: 'Shift',
  submittedAt: '2026-01-14T04:14:00Z',
  approvedBy: null,
  approvedByName: null,
  approvedAt: null,
} as BranchProductionOrder;

const APPROVED: BranchProductionOrder = {
  ...DEMAND,
  id: 'd2',
  demandNumber: 'DMD-000102',
  status: 'approved',
};

beforeEach(() => {
  jest.clearAllMocks();
  getOrders.mockResolvedValue([DEMAND, APPROVED]);
  useNetworkStore.setState({ isOnline: true, hasResolved: true });
});

describe('BranchDemandsScreen', () => {
  /**
   * The chips used to send `status` and hold a cache entry per filter, which is
   * what made the counts impossible: a figure beside a filter that refetches is
   * the previous answer's, or a second request that goes stale with the list.
   */
  it('fetches the window once and lets the chips narrow it', async () => {
    const screen = await renderScreen(<BranchDemandsScreen />);
    await waitFor(() => expect(getOrders).toHaveBeenCalledTimes(1));
    expect(getOrders).toHaveBeenCalledWith();

    fireEvent.press(screen.getByTestId('demand-filter-approved'));

    await waitFor(() => expect(screen.queryByText('DMD-000101')).toBeNull());
    expect(screen.getByText('DMD-000102')).toBeTruthy();
    expect(getOrders).toHaveBeenCalledTimes(1);
  });

  /**
   * A count says what tapping the chip *would* show. Counting the current
   * result instead would leave every unselected chip reporting the selected
   * one's figure — and All agreeing with whichever filter was last tapped.
   */
  it('counts every chip over the whole window, not the filtered view', async () => {
    const screen = await renderScreen(<BranchDemandsScreen />);

    await waitFor(() => expect(screen.getByLabelText('All, 2')).toBeTruthy());
    expect(screen.getByLabelText('Waiting, 1')).toBeTruthy();
    expect(screen.getByLabelText('Approved, 1')).toBeTruthy();
    expect(screen.getByLabelText('Refused, 0')).toBeTruthy();

    fireEvent.press(screen.getByTestId('demand-filter-approved'));

    await waitFor(() => expect(screen.getByLabelText('All, 2')).toBeTruthy());
    expect(screen.getByLabelText('Waiting, 1')).toBeTruthy();
  });

  /**
   * Two different situations, and offering "New order" in the second answers a
   * question nobody asked — the filter row is what that state is telling you to
   * change.
   */
  it('tells an empty filter apart from an empty screen', async () => {
    const screen = await renderScreen(<BranchDemandsScreen />);

    await waitFor(() => expect(screen.getByText('DMD-000101')).toBeTruthy());
    fireEvent.press(screen.getByTestId('demand-filter-rejected'));

    await waitFor(() => expect(screen.getByText('Nothing refused')).toBeTruthy());
    expect(screen.queryByText('No demands')).toBeNull();
    // There is work here, it is just not this filter's — so the create action
    // stays where it is rather than moving into the empty state.
    expect(screen.getByTestId('new-demand')).toBeTruthy();
  });

  it('carries the call to action when there is nothing at all to scroll', async () => {
    getOrders.mockResolvedValue([]);
    const screen = await renderScreen(<BranchDemandsScreen />);

    await waitFor(() => expect(screen.getByText('No demands')).toBeTruthy());
    // One control on screen at a time: the empty state has it, so the FAB does not.
    expect(screen.queryByTestId('new-demand')).toBeNull();
  });

  /**
   * The status word, drawn from the shared vocabulary rather than a colour map
   * written on this screen. `MBStatusTag` reads `theme.statusColors`, which is
   * keyed to the real backend values — this file kept its own copy before, and
   * a second copy is how `verified` ends up two colours in one app.
   */
  it('reports the backend status in words', async () => {
    const screen = await renderScreen(<BranchDemandsScreen />);

    // The word is drawn, not just a hue — status is never colour alone.
    await waitFor(() => expect(screen.getByText('Waiting for production')).toBeTruthy());
    // Through the card's own label, because the bare word "Approved" is also the
    // text of the chip that filters for it.
    expect(screen.getByLabelText('DMD-000102, Approved')).toBeTruthy();
  });

  /** Only a demand Production has not touched can be withdrawn. */
  it('offers Withdraw on a pending demand and on nothing else', async () => {
    const screen = await renderScreen(<BranchDemandsScreen />);

    await waitFor(() => expect(screen.getByLabelText('Withdraw DMD-000101')).toBeTruthy());
    expect(screen.queryByLabelText('Withdraw DMD-000102')).toBeNull();
  });
});
