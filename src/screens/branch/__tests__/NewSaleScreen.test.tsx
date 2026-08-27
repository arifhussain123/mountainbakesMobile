import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

/**
 * The till is a modal on the Sales stack, so it reports a finished sale by
 * dismissing onto the register with the outcome as a param. `navigate` is
 * therefore what these tests assert on where they used to assert on a banner —
 * the banner itself is `SalesScreen`'s, and its wording is tested there.
 */
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/services/api/catalogApi', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/database/repositories/offlineWriteRepository', () => ({
  writeOffline: jest.fn(),
}));
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

import * as catalogApi from '@/services/api/catalogApi';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { getOperationOutcome } from '@/database/repositories/syncQueueRepository';
import { drainQueue } from '@/services/sync/syncManager';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { renderScreen } from '@/test-utils/render';
import { NewSaleScreen } from '../NewSaleScreen';

const getProducts = catalogApi.getProducts as jest.Mock;
const getSettings = catalogApi.getSettings as jest.Mock;
const getStock = catalogApi.getStock as jest.Mock;
const getCategories = catalogApi.getCategories as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrain = drainQueue as jest.Mock;
const mockOutcome = getOperationOutcome as jest.Mock;

function drainSyncs(count: number) {
  mockDrain.mockResolvedValue({
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

/** The server argued with it: a 409 that will never clear by waiting. */
function drainRefuses(message: string) {
  mockDrain.mockResolvedValue({
    synced: 0,
    failed: 0,
    conflicts: 1,
    remaining: 1,
    stoppedBecause: 'completed',
  });
  mockOutcome.mockResolvedValue({ status: 'conflict', message });
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
  // The till reads stock for availability and categories for the filter row.
  // A bare jest.fn() resolves to undefined, which React Query rejects outright,
  // and the screen would then be asserted in an error state it never reaches in
  // the app. See docs/testing.md.
  getStock.mockResolvedValue({ date: '2026-08-18', rows: [] });
  getCategories.mockResolvedValue([]);
  getSettings.mockResolvedValue({
    currencySymbol: 'Rs.',
    gstEnabled: false,
    gstRate: 0,
  });
  mockWriteOffline.mockResolvedValue({
    clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
    businessDate: '2026-08-18',
    queued: true,
  });
  drainSyncs(1);
  useSyncStore.setState({
    lastResult: null,
    phase: 'idle',
    pending: 0,
    needsAttention: 0,
  });
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
  await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
  await fireEvent.press(screen.getByTestId('review-and-pay'));
  await waitFor(() => expect(screen.getByTestId('confirm-sale')).toBeTruthy());
}

describe('NewSaleScreen', () => {
  it('adds a product and shows a running total', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByText('1 item')).toBeTruthy());
    // Twice: the product row's price, and the cart bar's running total.
    expect(screen.getAllByText('Rs. 100')).toHaveLength(2);
  });

  it('increments quantity rather than adding a duplicate line', async () => {
    // A cashier ringing up three of the same rusk expects one line of 3.
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByText('2 items')).toBeTruthy());
  });

  it('sends only productId, qty and discount — never a price', async () => {
    // The server resolves the price. Sending one would let a stale cached price
    // reach a receipt.
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items).toEqual([{ productId: 'p1', qty: 1, discount: 0 }]);
    expect(payload.items[0]).not.toHaveProperty('unitPrice');
    expect(payload).not.toHaveProperty('grandTotal');
  });

  it('offers the four branch payment methods and never staff', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndOpenCheckout(screen);

    expect(screen.getByText('cash')).toBeTruthy();
    expect(screen.getByText('easypaisa')).toBeTruthy();
    expect(screen.getByText('foodpanda')).toBeTruthy();
    expect(screen.getByText('bank_account')).toBeTruthy();
    // 'staff' is production-counter only — an unpaid hand-out.
    expect(screen.queryByText('staff')).toBeNull();
  });

  it('refuses a cash sale that is not covered by the tender', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndOpenCheckout(screen);

    await fireEvent.changeText(screen.getByLabelText('Cash received'), '50');
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() =>
      expect(screen.getByText('The cash received does not cover the total.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('hands a confirmed sale back to the register as synced', async () => {
    drainSyncs(1);
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('SalesList', { outcome: 'synced' }),
    );
  });

  it('hands back the refusal AND the server\'s reason, never a queued outcome', async () => {
    // The server rejected it for stock. It is parked in Sync Center for a
    // person, so reporting it as on its way is how a sale that never landed
    // goes unnoticed until the till is reconciled — and how the same sale gets
    // rung up twice. The reason names the products that were short, so it
    // travels with the outcome rather than being re-derived on the register.
    drainRefuses('Cream roll: requested 5, available 2');

    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('SalesList', {
        outcome: 'refused',
        reason: 'Cream roll: requested 5, available 2',
      }),
    );
  });

  it('hands back a queued sale as queued, never as saved', async () => {
    drainSyncs(0);
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndOpenCheckout(screen);
    await fireEvent.press(screen.getByTestId('confirm-sale'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('SalesList', { outcome: 'queued' }),
    );
  });
});

/**
 * Availability at the till.
 *
 * The till used to show name, code and price and say nothing about stock, so the
 * first anyone heard of an overdraw was a 409 parked in Sync Center hours later.
 * The balances are already on the device — `useStock` reads through the SQLite
 * mirror — so this is presentation, not a new dependency.
 *
 * It is advisory and never a gate. The server is the only authority on stock;
 * blocking the sale here would stop a cashier selling something that is
 * physically in front of them because a mirrored balance is stale.
 */
describe('availability', () => {
  it('shows what is left, in words as well as colour', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 3 }],
    });
    const screen = await renderScreen(<NewSaleScreen />);

    await waitFor(() => expect(screen.getByText('3 left')).toBeTruthy());
  });

  it('says out of stock rather than showing a bare zero', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 0 }],
    });
    const screen = await renderScreen(<NewSaleScreen />);

    await waitFor(() => expect(screen.getByText('Out of stock')).toBeTruthy());
  });

  /**
   * The failure this must never have.
   *
   * A device that has never mirrored stock knows nothing — which is not the same
   * as knowing there is none. Drawing "Out of stock" there would stop a cashier
   * selling what is in their hand.
   */
  it('says nothing at all when the balance is unknown', async () => {
    getStock.mockResolvedValue({ date: '2026-08-18', rows: [] });
    const screen = await renderScreen(<NewSaleScreen />);

    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
    expect(screen.queryByText('Out of stock')).toBeNull();
    expect(screen.queryByText(/left|in stock/)).toBeNull();
  });

  it('still lets an out-of-stock product be rung up', async () => {
    // Advisory, not a gate: the server adjudicates, and a stale balance must not
    // stop a real sale.
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 0 }],
    });
    const screen = await renderScreen(<NewSaleScreen />);

    await waitFor(() => expect(screen.getByText('Out of stock')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByTestId('cart-total')).toBeTruthy());
  });

  it('speaks the price and the balance in the row label', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 3 }],
    });
    const screen = await renderScreen(<NewSaleScreen />);

    // The row is one accessible element, so anything not in its label is
    // inaudible — including the two things a cashier most needs.
    await waitFor(() =>
      expect(screen.getByLabelText('Add Milk Rusk, Rs. 100, 3 left')).toBeTruthy(),
    );
  });
});

describe('category filter', () => {
  it('narrows the catalogue without typing', async () => {
    getCategories.mockResolvedValue([
      { id: 'c1', name: 'Rusks', slug: 'rusks', sortOrder: 1, isActive: true, createdAt: '' },
    ]);
    const screen = await renderScreen(<NewSaleScreen />);

    await waitFor(() => expect(screen.getByTestId('sale-category-c1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('sale-category-c1'));

    await waitFor(() =>
      expect(getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'c1', isActive: true }),
      ),
    );
  });

  it('offers no chip row when the tenant has no categories', async () => {
    getCategories.mockResolvedValue([]);
    const screen = await renderScreen(<NewSaleScreen />);

    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
    // An "All" chip on its own filters nothing and only costs the list its room.
    expect(screen.queryByTestId('sale-category-all')).toBeNull();
  });
});
