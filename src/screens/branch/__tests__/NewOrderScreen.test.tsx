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
import { NewOrderScreen } from '../NewOrderScreen';

const getProducts = catalogApi.getProducts as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrain = drainQueue as jest.Mock;

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
  (catalogApi.getSettings as jest.Mock).mockResolvedValue({ currencySymbol: 'Rs.' });
  mockWriteOffline.mockResolvedValue({
    clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
    businessDate: '2026-08-18',
    queued: true,
  });
  mockDrain.mockResolvedValue({
    synced: 1,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    stoppedBecause: 'completed',
  });
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

describe('NewOrderScreen', () => {
  it('submits selected products with a required date', async () => {
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items).toEqual([{ productId: 'p1', qty: 2, remarks: '' }]);
    expect(payload.requiredDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('never sends branchId — the server derives it from the token', async () => {
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload).not.toHaveProperty('branchId');
  });

  it('sends packingItems and specialItems explicitly', async () => {
    // An absent key must behave like the pre-packing-material payload; sending
    // empty arrays makes that explicit rather than relying on a server default.
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.packingItems).toEqual([]);
    expect(payload.specialItems).toEqual([]);
  });

  it('refuses an empty order', async () => {
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    // The button is disabled with nothing selected, so nothing is submitted.
    await fireEvent.press(screen.getByTestId('submit-order'));
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('rejects a required date in the past', async () => {
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.changeText(screen.getByLabelText('Required by'), '2020-01-01');
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() =>
      expect(screen.getByText('The required date cannot be in the past.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('rejects a malformed required date', async () => {
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.changeText(screen.getByLabelText('Required by'), '18/08/2026');
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() =>
      expect(screen.getByText('Enter the required date as YYYY-MM-DD.')).toBeTruthy(),
    );
  });

  it('removes a product when its quantity reaches zero', async () => {
    const screen = await renderScreen(<NewOrderScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await waitFor(() => expect(screen.getByText('1 product selected')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Decrease Milk Rusk'));
    await waitFor(() => expect(screen.getByText('0 products selected')).toBeTruthy());
  });
});
