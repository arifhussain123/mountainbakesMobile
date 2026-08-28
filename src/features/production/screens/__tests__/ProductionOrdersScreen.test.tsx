import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/productionService', () => ({
  getProductionOrders: jest.fn(),
  reviewProductionOrder: jest.fn(),
  markPrinted: jest.fn(),
  getPreviousBalance: jest.fn(),
  getProductionOverview: jest.fn(),
  getProductionStock: jest.fn(),
}));
jest.mock('@/api/services/catalogService', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.' })),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({
    total: 0,
    pending: 0,
    needsAttention: 0,
  })),
}));

import { getProductionOrders, reviewProductionOrder } from '@/api/services/productionService';
import { useNetworkStore } from '@/state/networkStore';
import { renderScreen } from '@/common/test-utils/render';
import { ProductionOrdersScreen } from '../ProductionOrdersScreen';

const mockGetOrders = getProductionOrders as jest.Mock;
const mockReview = reviewProductionOrder as jest.Mock;

const ORDER = {
  id: 'o1',
  demandNumber: 'PD-0001',
  branchId: 'b-1',
  branchName: 'Saddar',
  date: '2026-08-18',
  time: '09:15',
  requiredDate: '2026-08-19',
  items: [
    { productId: 'p1', productName: 'Milk Rusk', qty: 20, remarks: '' },
    { productId: 'p2', productName: 'Cake Rusk', qty: 10, remarks: '' },
  ],
  status: 'pending',
  createdBy: 'u1',
  createdByName: 'Branch',
  submittedAt: '2026-08-18T04:15:00.000Z',
  approvedBy: null,
  approvedByName: null,
  approvedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOrders.mockResolvedValue([ORDER]);
  mockReview.mockResolvedValue({ success: true });
  useNetworkStore.setState({ isOnline: true, hasResolved: true });
});

describe('ProductionOrdersScreen', () => {
  it('lists waiting demands by default', async () => {
    const screen = await renderScreen(<ProductionOrdersScreen />);

    await waitFor(() => expect(screen.getByText('Saddar')).toBeTruthy());
    expect(screen.getByText('PD-0001')).toBeTruthy();
    expect(mockGetOrders).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('approves to awaiting_verification, not straight to approved', async () => {
    // Production's approval sends the demand to the branch to verify. Stock
    // moves at verification (migration 20260810000058), not here.
    const screen = await renderScreen(<ProductionOrdersScreen />);
    await waitFor(() => expect(screen.getByTestId('review-o1')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('review-o1'));
    await waitFor(() => expect(screen.getByTestId('approve-demand')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('approve-demand'));

    await waitFor(() => expect(mockReview).toHaveBeenCalled());
    expect(mockReview.mock.calls[0][1].status).toBe('awaiting_verification');
  });

  it('sends approved quantities per item', async () => {
    const screen = await renderScreen(<ProductionOrdersScreen />);
    await waitFor(() => expect(screen.getByTestId('review-o1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('review-o1'));

    await waitFor(() => expect(screen.getAllByLabelText('Approve quantity')).toHaveLength(2));
    // Cut the first line from 20 to 15.
    await fireEvent.changeText(screen.getAllByLabelText('Approve quantity')[0]!, '15');
    await fireEvent.press(screen.getByTestId('approve-demand'));

    await waitFor(() => expect(mockReview).toHaveBeenCalled());
    expect(mockReview.mock.calls[0][1].approvedItems).toEqual([
      { productId: 'p1', approvedQty: 15 },
      { productId: 'p2', approvedQty: 10 },
    ]);
  });

  it('requires a reason to reject', async () => {
    const screen = await renderScreen(<ProductionOrdersScreen />);
    await waitFor(() => expect(screen.getByTestId('review-o1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('review-o1'));

    await waitFor(() => expect(screen.getByTestId('reject-demand')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reject-demand'));

    await waitFor(() =>
      expect(screen.getByText('Give a reason when rejecting a demand.')).toBeTruthy(),
    );
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('blocks reviewing while offline', async () => {
    // A demand can be cancelled or corrected while this device is offline, so a
    // replayed approval could authorise quantities nobody agreed to.
    useNetworkStore.setState({ isOnline: false, hasResolved: true });
    const screen = await renderScreen(<ProductionOrdersScreen />);
    await waitFor(() => expect(screen.getByTestId('review-o1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('review-o1'));

    await waitFor(() =>
      expect(screen.getByText(/Reviewing a demand needs a connection/)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('approve-demand'));
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('offers no Review action once the demand has left pending', async () => {
    mockGetOrders.mockResolvedValue([{ ...ORDER, status: 'awaiting_verification' }]);
    const screen = await renderScreen(<ProductionOrdersScreen />);

    await waitFor(() => expect(screen.getByText('Sent to branch')).toBeTruthy());
    expect(screen.queryByTestId('review-o1')).toBeNull();
  });

  it('shows an empty state when nothing matches', async () => {
    mockGetOrders.mockResolvedValue([]);
    const screen = await renderScreen(<ProductionOrdersScreen />);
    await waitFor(() => expect(screen.getByText('Nothing here')).toBeTruthy());
  });
});
