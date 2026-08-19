import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/expensesApi', () => ({ getExpenses: jest.fn() }));
jest.mock('@/database/repositories/offlineWriteRepository', () => ({ writeOffline: jest.fn() }));
// Mock the drain, not the store: the real zustand store then exercises its own
// wiring (lastResult, phase, count refresh) instead of being replaced by a stub.
jest.mock('@/services/sync/syncManager', () => ({
  drainQueue: jest.fn(),
  isDraining: () => false,
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import { getExpenses } from '@/services/api/expensesApi';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { drainQueue } from '@/services/sync/syncManager';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import { renderScreen } from '@/test-utils/render';
import { ExpensesScreen } from '../ExpensesScreen';

const mockGetExpenses = getExpenses as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrainQueue = drainQueue as jest.Mock;

/** Make the next drain report N successfully synced operations. */
function drainSyncs(count: number) {
  mockDrainQueue.mockResolvedValue({
    synced: count,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    stoppedBecause: count > 0 ? 'completed' : 'offline',
  });
}

/**
 * The wording distinction here is the point: a queued expense must never be
 * reported as "saved". Telling someone a transaction is saved while it sits in a
 * queue is how the same expense gets entered twice.
 */

beforeEach(() => {
  jest.clearAllMocks();
  mockGetExpenses.mockResolvedValue([]);
  mockWriteOffline.mockResolvedValue({
    clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
    businessDate: '2026-08-18',
    queued: true,
  });
  useSyncStore.setState({ lastResult: null, phase: 'idle', pending: 0, needsAttention: 0 });
  drainSyncs(0);
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

async function fillAndSave(screen: Awaited<ReturnType<typeof renderScreen>>) {
  await fireEvent.press(screen.getByTestId('add-expense'));
  await waitFor(() => expect(screen.getByText('Save expense')).toBeTruthy());

  await fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
  await fireEvent.changeText(screen.getByLabelText('Description'), 'Electricity bill');
  await fireEvent.press(screen.getByTestId('save-expense'));
}

describe('ExpensesScreen', () => {
  it('says "Saved offline" when the server has not confirmed', async () => {
    drainSyncs(0); // offline: nothing reached the server
    const screen = await renderScreen(<ExpensesScreen />);

    await fillAndSave(screen);

    await waitFor(() =>
      expect(
        screen.getByText('Saved offline — it will sync automatically when you reconnect.'),
      ).toBeTruthy(),
    );
    // Must NOT claim success.
    expect(screen.queryByText('Expense saved.')).toBeNull();
  });

  it('says "saved" only once the server confirmed', async () => {
    drainSyncs(1); // the server accepted it
    const screen = await renderScreen(<ExpensesScreen />);

    await fillAndSave(screen);

    await waitFor(() => expect(screen.getByText('Expense saved.')).toBeTruthy());
  });

  it('writes through the offline path regardless of connectivity', async () => {
    // One code path, always. Branching on isOnline would leave the offline case
    // as the rarely-exercised branch — the one staff actually rely on.
    const screen = await renderScreen(<ExpensesScreen />);
    await fillAndSave(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const call = mockWriteOffline.mock.calls[0][0];
    expect(call.entity).toBe('expense');
    expect(call.branchId).toBe('b-1');
    expect(call.payload.amount).toBe(1500);
    expect(call.payload.description).toBe('Electricity bill');
  });

  it('offers only the two payment methods the server accepts', async () => {
    const screen = await renderScreen(<ExpensesScreen />);
    await fireEvent.press(screen.getByTestId('add-expense'));

    await waitFor(() => expect(screen.getByText('cash')).toBeTruthy());
    expect(screen.getByText('easypaisa')).toBeTruthy();
    // Shop expenses never settle by bank transfer or card.
    expect(screen.queryByText('bank_account')).toBeNull();
    expect(screen.queryByText('foodpanda')).toBeNull();
  });

  it('blocks submission of an invalid amount', async () => {
    const screen = await renderScreen(<ExpensesScreen />);
    await fireEvent.press(screen.getByTestId('add-expense'));
    await waitFor(() => expect(screen.getByText('Save expense')).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText('Description'), 'No amount');
    await fireEvent.press(screen.getByTestId('save-expense'));

    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than 0')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('shows an empty state before anything is recorded', async () => {
    const screen = await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(screen.getByText('No expenses today')).toBeTruthy());
  });
});
