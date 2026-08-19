import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/catalogApi', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/database/repositories/offlineWriteRepository', () => ({ writeOffline: jest.fn() }));
jest.mock('@/services/sync/syncManager', () => ({
  drainQueue: jest.fn(),
  isDraining: () => false,
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import * as catalogApi from '@/services/api/catalogApi';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { drainQueue } from '@/services/sync/syncManager';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { renderScreen } from '@/test-utils/render';
import { SalesScreen } from '../SalesScreen';

const getProducts = catalogApi.getProducts as jest.Mock;
const getSettings = catalogApi.getSettings as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrain = drainQueue as jest.Mock;

function drainSyncs(count: number) {
  mockDrain.mockResolvedValue({
    synced: count,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    stoppedBecause: count > 0 ? 'completed' : 'offline',
  });
}

const RUSK = {
  id: 'p1',
  name: 'Milk Rusk',
  sku: 'MB-001',
  categoryId: 'c1',
  categoryName: 'Rusks',
  price: 100,
  costPrice: 50,
  description: '',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  getProducts.mockResolvedValue([RUSK]);
  getSettings.mockResolvedValue({ currencySymbol: 'Rs.', gstEnabled: false, gstRate: 0 });
  mockWriteOffline.mockResolvedValue({
    clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
    businessDate: '2026-08-18',
    queued: true,
  });
  drainSyncs(1);
  useSyncStore.setState({ lastResult: null, phase: 'idle', pending: 0, needsAttention: 0 });
  useAuthStore.setState({
    status: 'signedIn',
    claims: {
      userId: 'u1',
      email: 'a@b.com',
      role: 'branch_manager',
      branchId: 'b-1',
      branchName: 'Saddar',
      mustChangePassword: false,
    },
  });
});

async function addRuskAndOpenCheckout(screen: Awaited<ReturnType<typeof renderScreen>>) {
  await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Add Milk Rusk'));
  await fireEvent.press(screen.getByTestId('review-and-pay'));
  await waitFor(() => expect(screen.getByTestId('confirm-sale')).toBeTruthy());
}

describe('SalesScreen', () => {
  it('adds a product and shows a running total', async () => {
    const screen = await renderScreen(<SalesScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Add Milk Rusk'));

    await waitFor(() => expect(screen.getByText('1 item')).toBeTruthy());
    // Twice: the product row's price, and the cart bar's running total.
    expect(screen.getAllByText('Rs. 100')).toHaveLength(2);
  });

  it('increments quantity rather than adding a duplicate line', async () => {
    // A cashier ringing up three of the same rusk expects one line of 3.
    const screen = await renderScreen(<SalesScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Add Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Add Milk Rusk'));

    await waitFor(() => expect(screen.getByText('2 items')).toBeTruthy());
  });

  it('sends only productId, qty and discount — never a price', async () => {
    // The server resolves the price. Sending one would let a stale cached price
    // reach a receipt.
    const screen = await renderScreen(<SalesScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items).toEqual([{ productId: 'p1', qty: 1, discount: 0 }]);
    expect(payload.items[0]).not.toHaveProperty('unitPrice');
    expect(payload).not.toHaveProperty('grandTotal');
  });

  it('offers the four branch payment methods and never staff', async () => {
    const screen = await renderScreen(<SalesScreen />);
    await addRuskAndOpenCheckout(screen);

    expect(screen.getByText('cash')).toBeTruthy();
    expect(screen.getByText('easypaisa')).toBeTruthy();
    expect(screen.getByText('foodpanda')).toBeTruthy();
    expect(screen.getByText('bank_account')).toBeTruthy();
    // 'staff' is production-counter only — an unpaid hand-out.
    expect(screen.queryByText('staff')).toBeNull();
  });

  it('refuses a cash sale that is not covered by the tender', async () => {
    const screen = await renderScreen(<SalesScreen />);
    await addRuskAndOpenCheckout(screen);

    await fireEvent.changeText(screen.getByLabelText('Cash received'), '50');
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() =>
      expect(screen.getByText('The cash received does not cover the total.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('says "Sale completed" only when the server confirmed', async () => {
    drainSyncs(1);
    const screen = await renderScreen(<SalesScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() => expect(screen.getByText('Sale completed.')).toBeTruthy());
  });

  it('says "Saved offline" when it is still queued', async () => {
    drainSyncs(0);
    const screen = await renderScreen(<SalesScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() =>
      expect(
        screen.getByText('Saved offline — it will sync automatically when you reconnect.'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText('Sale completed.')).toBeNull();
  });
});
