import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

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
  // What the write hook reads to decide what the branch is told: this row's
  // fate, not the drain's tally.
  getOperationOutcome: jest.fn(async () => ({ status: 'synced', message: null })),
}));

import * as catalogApi from '@/services/api/catalogApi';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { getOperationOutcome } from '@/database/repositories/syncQueueRepository';
import { drainQueue } from '@/services/sync/syncManager';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { renderScreen } from '@/test-utils/render';
import { NewOrderScreen } from '../NewOrderScreen';

const getProducts = catalogApi.getProducts as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrain = drainQueue as jest.Mock;
const mockOutcome = getOperationOutcome as jest.Mock;

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

const ROLL = { ...RUSK, id: 'p2', name: 'Cream Roll', sku: 'MB-002' };

/**
 * 10:00 Karachi (05:00 UTC), which is inside the 08:00 → 02:00 order window.
 *
 * Pinned because `NewOrderScreen` refuses to queue a demand outside that window,
 * and the window is judged against the real clock. Unpinned, every submit test
 * below passes for eighteen hours a day and fails between 02:01 and 07:59
 * Karachi — a suite that is green in the afternoon and red overnight, for a
 * reason that has nothing to do with the code being tested. `queueMicrotask` is
 * left real so React Query's scheduler (see `jest.after-env.js`) still drains.
 */
const INSIDE_ORDER_WINDOW = new Date('2026-08-18T05:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'], now: INSIDE_ORDER_WINDOW });
  jest.clearAllMocks();
  getProducts.mockResolvedValue([RUSK, ROLL]);
  (catalogApi.getSettings as jest.Mock).mockResolvedValue({
    currencySymbol: 'Rs.',
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

afterEach(() => {
  jest.useRealTimers();
});

/** The drain reached the server, or it did not — the row is what decides. */
function drainSyncs(count: number) {
  mockDrain.mockResolvedValue({
    synced: count,
    failed: 0,
    conflicts: 0,
    remaining: count > 0 ? 0 : 1,
    stoppedBecause: count > 0 ? 'completed' : 'offline',
  });
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

type Screen = Awaited<ReturnType<typeof renderScreen>>;

async function showProducts(): Promise<Screen> {
  const screen = await renderScreen(<NewOrderScreen />);
  await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  return screen;
}

/**
 * Submit lives behind the review, so every test that sends an order goes through
 * it — which is the point of the step and worth exercising rather than bypassing.
 */
async function openReview(screen: Screen): Promise<void> {
  await fireEvent.press(screen.getByTestId('review-order'));
  await waitFor(() => expect(screen.getByTestId('submit-order')).toBeTruthy());
}

async function submit(screen: Screen): Promise<void> {
  await openReview(screen);
  await fireEvent.press(screen.getByTestId('submit-order'));
}

describe('NewOrderScreen', () => {
  it('submits selected products with a required date', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items).toEqual([{ productId: 'p1', qty: 2, remarks: '' }]);
    expect(payload.requiredDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('never sends branchId — the server derives it from the token', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload).not.toHaveProperty('branchId');
  });

  it('sends packingItems and specialItems explicitly', async () => {
    // An absent key must behave like the pre-packing-material payload; sending
    // empty arrays makes that explicit rather than relying on a server default.
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.packingItems).toEqual([]);
    expect(payload.specialItems).toEqual([]);
  });

  /**
   * The remarks step, and the reason it is per line rather than per order.
   *
   * `ProductionOrderItemSchema.remarks` is on the item and there is no
   * order-level field. One shared box used to stamp its text onto every line, so
   * a note meant for one product ("thin icing") was submitted as an instruction
   * about all of them — asserting to Production something the branch never said.
   */
  it('carries a remark on the line it was typed on, and no other', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Cream Roll'));
    await openReview(screen);

    await fireEvent.changeText(screen.getByTestId('remark-p1'), '  thin icing  ');
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 1, remarks: 'thin icing' },
      { productId: 'p2', qty: 1, remarks: '' },
    ]);
  });

  /**
   * Why the basket carries the product NAME and not just its id.
   *
   * The list is filtered by a debounced server-side search, so a branch that
   * picks a rusk and then searches for something else no longer has the rusk in
   * `products.data` at all. A review built from the visible list would silently
   * omit it — and the branch would commit to a demand it never read back.
   */
  it('reviews a product the search has since filtered out of the list', async () => {
    getProducts.mockImplementation(async (filters: { search?: string } = {}) =>
      filters.search ? [ROLL] : [RUSK, ROLL],
    );
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.changeText(screen.getByTestId('order-product-search'), 'cream');
    await waitFor(() => expect(screen.queryByLabelText('Increase Milk Rusk')).toBeNull());

    await openReview(screen);
    expect(screen.getByText('Milk Rusk')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('submit-order'));
    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 1, remarks: '' },
    ]);
  });

  /**
   * A review that can only be accepted or abandoned sends people back to hunt
   * for a product in a filtered list to change one number.
   */
  it('lets a quantity be corrected in the review', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await openReview(screen);

    // Two rows answer to this label once the review is open — the list's and the
    // review's. The last one mounted is the review's.
    const [inReview] = screen.getAllByLabelText('Increase Milk Rusk').slice(-1);
    if (!inReview) throw new Error('the review has no stepper for Milk Rusk');
    await fireEvent.press(inReview);
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 2, remarks: '' },
    ]);
  });

  it('states the branch and the total the review is about to commit', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Cream Roll'));
    await openReview(screen);

    expect(screen.getByText('Saddar')).toBeTruthy();
    expect(screen.getByText('Total units')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  /**
   * The window is the reason the clock above is pinned, so it is worth asserting
   * rather than leaving as an ambient condition of the other tests.
   *
   * A demand composed at 03:00 must not reach the queue at all. Queued, it would
   * drain hours later, be refused by the server, and park as a failed row — the
   * branch believing it ordered, production never seeing it, and the only trace
   * a Sync Center entry someone has to notice. `writeOffline` is the line that
   * must not be crossed.
   */
  it('refuses to queue a demand outside the order window', async () => {
    jest.setSystemTime(new Date('2026-08-18T22:00:00.000Z')); // 03:00 Karachi

    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await submit(screen);

    await waitFor(() => expect(screen.getByText(/Orders can be placed between/)).toBeTruthy());
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('refuses an empty order — the review cannot even be opened', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByTestId('review-order'));
    expect(screen.queryByTestId('submit-order')).toBeNull();
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('rejects a required date in the past', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.changeText(screen.getByLabelText('Required by'), '2020-01-01');
    await submit(screen);

    await waitFor(() =>
      expect(screen.getByText('The required date cannot be in the past.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('rejects a malformed required date', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.changeText(screen.getByLabelText('Required by'), '18/08/2026');
    await submit(screen);

    await waitFor(() =>
      expect(screen.getByText('Enter the required date as YYYY-MM-DD.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('removes a product when its quantity reaches zero', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await waitFor(() => expect(screen.getByText('1 product selected')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Decrease Milk Rusk'));
    await waitFor(() => expect(screen.getByText('0 products selected')).toBeTruthy());
  });

  /**
   * What the branch is told afterwards — the only part of this flow they carry
   * back to the counter with them.
   */
  describe('confirmation', () => {
    it('confirms in the server’s terms when the drain landed it', async () => {
      drainSyncs(1);
      const screen = await showProducts();

      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await submit(screen);

      await waitFor(() =>
        expect(screen.getByText('Order submitted to production.')).toBeTruthy(),
      );
      // The review is done with, and the basket with it: leaving either up
      // invites the same demand being sent twice.
      expect(screen.queryByTestId('submit-order')).toBeNull();
      expect(screen.getByText('0 products selected')).toBeTruthy();
      expect(screen.queryByText('Saved offline')).toBeNull();
    });

    it('says "Saved offline" when it is still queued, never "submitted"', async () => {
      drainSyncs(0);
      const screen = await showProducts();

      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await submit(screen);

      await waitFor(() => expect(screen.getByText('Saved offline')).toBeTruthy());
      // The three things the person needs: it is kept, it is kept HERE, and it
      // is still in motion. A bare "Saved offline" reads as a failure to someone
      // seeing it for the first time, and the recovery from that belief is
      // ordering the same tray again.
      expect(screen.getByText(/stored on this device/)).toBeTruthy();
      expect(screen.getByText(/Status: Waiting to sync/)).toBeTruthy();
      expect(screen.queryByText('Order submitted to production.')).toBeNull();
    });

    it('gives the server’s own words when it refused, and does not call it pending', async () => {
      drainRefuses('Cream Roll is not produced on Sundays');
      const screen = await showProducts();

      await fireEvent.press(screen.getByLabelText('Increase Cream Roll'));
      await submit(screen);

      await waitFor(() =>
        expect(screen.getByText(/Cream Roll is not produced on Sundays/)).toBeTruthy(),
      );
      expect(screen.getByText(/do not send it again/)).toBeTruthy();
      // A refused order is not waiting for a connection, it is waiting for a
      // person. Calling that "waiting to sync" is how a demand production never
      // accepted goes unnoticed until the delivery does not arrive.
      expect(screen.queryByText('Saved offline')).toBeNull();
      expect(screen.queryByText(/Waiting to sync/)).toBeNull();
      expect(screen.queryByText('Order submitted to production.')).toBeNull();
    });
  });
});
