import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/expensesApi', () => ({ getExpenses: jest.fn() }));
jest.mock('@/database/repositories/offlineWriteRepository', () => ({
  writeOffline: jest.fn(),
}));
// Mock the drain, not the store: the real zustand store then exercises its own
// wiring (lastResult, phase, count refresh) instead of being replaced by a stub.
jest.mock('@/services/sync/syncManager', () => ({
  drainQueue: jest.fn(),
  isDraining: () => false,
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({
    total: 0,
    pending: 0,
    needsAttention: 0,
  })),
  // What the write hooks now read: this row's fate, not the drain's tally.
  getOperationOutcome: jest.fn(async () => ({ status: 'synced', message: null })),
}));

import { getExpenses } from '@/services/api/expensesApi';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { getOperationOutcome } from '@/database/repositories/syncQueueRepository';
import { drainQueue } from '@/services/sync/syncManager';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import { renderScreen } from '@/test-utils/render';
import { ExpensesScreen } from '../ExpensesScreen';

const mockGetExpenses = getExpenses as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrainQueue = drainQueue as jest.Mock;
const mockOutcome = getOperationOutcome as jest.Mock;

/** Make the next drain report N successfully synced operations. */
function drainSyncs(count: number) {
  mockDrainQueue.mockResolvedValue({
    synced: count,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    stoppedBecause: count > 0 ? 'completed' : 'offline',
  });
  // The drain's counters no longer decide what the user is told — the row does.
  mockOutcome.mockResolvedValue(
    count > 0 ? { status: 'synced', message: null } : { status: 'pending', message: null },
  );
}

/** The server refused it outright: parked for a person, never retried. */
function drainRefuses(message: string) {
  mockDrainQueue.mockResolvedValue({
    synced: 0,
    failed: 1,
    conflicts: 0,
    remaining: 1,
    stoppedBecause: 'completed',
  });
  mockOutcome.mockResolvedValue({ status: 'failed', message });
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
  useSyncStore.setState({
    lastResult: null,
    phase: 'idle',
    pending: 0,
    needsAttention: 0,
  });
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
  // By accessible name, not testID: the screen shows exactly one "Add expense"
  // control at a time — the empty state's while the list is empty, the FAB once
  // there are rows — and this cares about opening the form, not which one it
  // came from.
  await fireEvent.press(screen.getByLabelText('Add expense'));
  await waitFor(() => expect(screen.getByText('Review expense')).toBeTruthy());

  await fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
  await fireEvent.changeText(screen.getByLabelText('Description'), 'Electricity bill');
  await fireEvent.press(screen.getByTestId('save-expense'));

  // The confirm is a step, not a formality: an expense is create-only on the
  // server, so nothing is written until this second, deliberate press.
  await waitFor(() => expect(screen.getByTestId('confirm-expense')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('confirm-expense'));
}

describe('ExpensesScreen', () => {
  it('says "Saved offline" when the server has not confirmed', async () => {
    drainSyncs(0); // offline: nothing reached the server
    const screen = await renderScreen(<ExpensesScreen />);

    await fillAndSave(screen);

    await waitFor(() => expect(screen.getByText('Saved offline')).toBeTruthy());
    // Where it is kept, and that it is still moving — not just that it is kept.
    expect(screen.getByText(/stored on this device/)).toBeTruthy();
    expect(screen.getByText(/Status: Waiting to sync/)).toBeTruthy();
    // Must NOT claim success.
    expect(screen.queryByText('Expense saved.')).toBeNull();
  });

  it('says "saved" only once the server confirmed', async () => {
    drainSyncs(1); // the server accepted it
    const screen = await renderScreen(<ExpensesScreen />);

    await fillAndSave(screen);

    await waitFor(() => expect(screen.getByText('Expense saved.')).toBeTruthy());
  });

  it('never calls a refused expense "saved offline"', async () => {
    // Same rule as the sale: a refusal is parked for a person and never clears
    // by waiting, so it must not be described as pending.
    drainRefuses('Business day 2026-08-18 is closed.');

    const screen = await renderScreen(<ExpensesScreen />);
    await fillAndSave(screen);

    await waitFor(() =>
      expect(screen.getByText(/Business day 2026-08-18 is closed\./)).toBeTruthy(),
    );
    expect(screen.queryByText('Saved offline')).toBeNull();
    expect(screen.queryByText(/Waiting to sync/)).toBeNull();
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
    await fireEvent.press(screen.getByLabelText('Add expense'));

    await waitFor(() => expect(screen.getByText('cash')).toBeTruthy());
    expect(screen.getByText('easypaisa')).toBeTruthy();
    // Shop expenses never settle by bank transfer or card.
    expect(screen.queryByText('bank_account')).toBeNull();
    expect(screen.queryByText('foodpanda')).toBeNull();
  });

  it('blocks submission of an invalid amount', async () => {
    const screen = await renderScreen(<ExpensesScreen />);
    await fireEvent.press(screen.getByLabelText('Add expense'));
    await waitFor(() => expect(screen.getByText('Review expense')).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText('Description'), 'No amount');
    await fireEvent.press(screen.getByTestId('save-expense'));

    await waitFor(() => expect(screen.getByText('Amount must be greater than 0')).toBeTruthy());
    expect(mockWriteOffline).not.toHaveBeenCalled();
    // Validation gates the confirm too: a rejected form must not reach a step
    // whose only remaining action is to write.
    expect(screen.queryByTestId('confirm-expense')).toBeNull();
  });

  it('writes nothing until the expense is confirmed', async () => {
    // `/api/expenses` is create-only — no PUT, no PATCH, no DELETE — so a filed
    // expense cannot be corrected from anywhere in this app. The first press
    // must review, not write.
    const screen = await renderScreen(<ExpensesScreen />);
    await fireEvent.press(screen.getByLabelText('Add expense'));
    await waitFor(() => expect(screen.getByText('Review expense')).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'Electricity bill');
    await fireEvent.press(screen.getByTestId('save-expense'));

    await waitFor(() => expect(screen.getByTestId('confirm-expense')).toBeTruthy());
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('restates the amount on the confirm, where a typo is still fixable', async () => {
    const screen = await renderScreen(<ExpensesScreen />);
    await fireEvent.press(screen.getByLabelText('Add expense'));
    await waitFor(() => expect(screen.getByText('Review expense')).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'Electricity bill');
    await fireEvent.press(screen.getByTestId('save-expense'));

    await waitFor(() => expect(screen.getByTestId('confirm-expense')).toBeTruthy());
    // The amount is the hero figure: a transposed digit is invisible in a list
    // of five labelled fields and obvious at moneyLg.
    expect(screen.getByTestId('confirm-amount')).toBeTruthy();
    // Every field the operator chose, read back before it becomes permanent.
    expect(screen.getByText('Electricity bill')).toBeTruthy();
    expect(screen.getByText('Cash')).toBeTruthy();
    // 'Ingredients' is also a filter chip on the list behind the modal, so this
    // asserts the confirm added one rather than that only one exists.
    expect(screen.getAllByText('Ingredients').length).toBeGreaterThan(1);
  });

  it('returns to a filled form when the confirm is edited', async () => {
    // react-hook-form keeps values when the inputs unmount. Losing them here
    // would make the confirm a punishment for checking.
    const screen = await renderScreen(<ExpensesScreen />);
    await fireEvent.press(screen.getByLabelText('Add expense'));
    await waitFor(() => expect(screen.getByText('Review expense')).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'Electricity bill');
    await fireEvent.press(screen.getByTestId('save-expense'));

    await waitFor(() => expect(screen.getByTestId('confirm-expense')).toBeTruthy());
    await fireEvent.press(screen.getByText('Edit'));

    await waitFor(() => expect(screen.getByText('Review expense')).toBeTruthy());
    expect(screen.getByLabelText('Description').props.value).toBe('Electricity bill');
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('shows an empty state before anything is recorded', async () => {
    const screen = await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(screen.getByText('No expenses today')).toBeTruthy());
  });
});

/**
 * Filtering.
 *
 * Range and category are sent to the server — `/api/expenses` takes `from`,
 * `to` and `category`. Search is not: that endpoint has no search parameter, so
 * it filters what the current range already loaded. These tests pin which is
 * which, because the difference is invisible on screen and easy to get wrong in
 * the direction that quietly loses rows.
 */
describe('ExpensesScreen filtering', () => {
  const expense = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'e1',
    expenseNumber: 'EXP-000001',
    branchId: 'b1',
    branchName: 'Saddar',
    date: '2026-08-19',
    category: 'Ingredients',
    description: 'Flour sacks',
    paymentMethod: 'cash',
    amount: 4500,
    remarks: '',
    createdBy: 'u1',
    createdByName: 'Ayesha',
    createdAt: '2026-08-19T06:00:00.000Z',
    ...over,
  });

  it('asks the server for today only, until the range is changed', async () => {
    mockGetExpenses.mockResolvedValue([expense()]);
    await renderScreen(<ExpensesScreen />);

    await waitFor(() => expect(mockGetExpenses).toHaveBeenCalled());
    const first = mockGetExpenses.mock.calls[0][0];
    expect(first.from).toBe(first.to);
  });

  it('widens the server query when a longer range is picked', async () => {
    mockGetExpenses.mockResolvedValue([expense()]);
    const screen = await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(mockGetExpenses).toHaveBeenCalled());

    await fireEvent.press(screen.getByLabelText('Show 30 days'));

    await waitFor(() => {
      const last = mockGetExpenses.mock.calls[mockGetExpenses.mock.calls.length - 1][0];
      expect(last.from < last.to).toBe(true);
    });
  });

  /**
   * Category is a server filter, not a local one — the server can page and index
   * on it, and filtering locally would silently drop rows outside whatever the
   * range happened to fetch.
   */
  it('sends the category to the server rather than filtering locally', async () => {
    mockGetExpenses.mockResolvedValue([expense()]);
    const screen = await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(mockGetExpenses).toHaveBeenCalled());

    await fireEvent.press(screen.getByLabelText('Category: Utilities'));

    await waitFor(() => {
      const last = mockGetExpenses.mock.calls[mockGetExpenses.mock.calls.length - 1][0];
      expect(last.category).toBe('Utilities');
    });
  });

  it('omits the category entirely when All is selected', async () => {
    mockGetExpenses.mockResolvedValue([expense()]);
    await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(mockGetExpenses).toHaveBeenCalled());
    expect(mockGetExpenses.mock.calls[0][0]).not.toHaveProperty('category');
  });

  /** Never sent: branch roles are auto-scoped, and a client-chosen scope is a bug. */
  it('never sends a branchId', async () => {
    mockGetExpenses.mockResolvedValue([expense()]);
    await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(mockGetExpenses).toHaveBeenCalled());
    expect(mockGetExpenses.mock.calls[0][0]).not.toHaveProperty('branchId');
  });

  it('shows the audit line: business date and who filed it', async () => {
    mockGetExpenses.mockResolvedValue([expense()]);
    const screen = await renderScreen(<ExpensesScreen />);
    await waitFor(() => expect(screen.getByText(/Flour sacks/)).toBeTruthy());
    expect(screen.getByText(/2026-08-19.*Ayesha/)).toBeTruthy();
  });
});
