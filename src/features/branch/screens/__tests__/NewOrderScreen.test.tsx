import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/catalogService', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/common/database/repositories/offlineWriteRepository', () => ({
  writeOffline: jest.fn(),
}));
// The draft is device-only and never syncs, so it is mocked separately from the
// write path — a test that could not tell "saved here" from "sent" would not be
// testing the one distinction Save draft exists to make.
jest.mock('@/common/database/repositories/orderDraftRepository', () => ({
  readOrderDraft: jest.fn(async () => null),
  saveOrderDraft: jest.fn(async () => undefined),
  clearOrderDraft: jest.fn(async () => undefined),
}));
jest.mock('@/api/sync/syncManager', () => ({
  drainQueue: jest.fn(),
  isDraining: () => false,
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({
    total: 0,
    pending: 0,
    needsAttention: 0,
  })),
  // What the write hook reads to decide what the branch is told: this row's
  // fate, not the drain's tally.
  getOperationOutcome: jest.fn(async () => ({ status: 'synced', message: null })),
}));

import * as catalogApi from '@/api/services/catalogService';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import {
  clearOrderDraft,
  readOrderDraft,
  saveOrderDraft,
} from '@/common/database/repositories/orderDraftRepository';
import { getOperationOutcome } from '@/common/database/repositories/syncQueueRepository';
import { drainQueue } from '@/api/sync/syncManager';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';
import { renderScreen } from '@/common/test-utils/render';
import { NewOrderScreen } from '../NewOrderScreen';

const getProducts = catalogApi.getProducts as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrain = drainQueue as jest.Mock;
const mockOutcome = getOperationOutcome as jest.Mock;
const mockReadDraft = readOrderDraft as jest.Mock;
const mockSaveDraft = saveOrderDraft as jest.Mock;
const mockClearDraft = clearOrderDraft as jest.Mock;

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

/** Comfortably ahead of the pinned clock, so it is never "in the past". */
const REQUIRED_DATE = '2026-08-20';

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
  (catalogApi.getStock as jest.Mock).mockResolvedValue({
    date: '2026-08-18',
    rows: [],
  });
  mockReadDraft.mockResolvedValue(null);
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
 * The required date is EMPTY on a fresh screen, deliberately — a pre-filled
 * delivery date is a commitment nobody chose. So every test that submits has to
 * supply one, which is the flow a branch actually goes through.
 */
async function setDate(screen: Screen, value = REQUIRED_DATE): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('required-date'), value);
}

/** Permanent and inline, so there is nothing to open first. */
async function search(screen: Screen, text: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('order-product-search'), text);
}

/**
 * Submit does not send: it validates and opens the review. Every test that sends
 * an order goes through it, which is the point of the step and worth exercising
 * rather than bypassing.
 */
async function openReview(screen: Screen): Promise<void> {
  await fireEvent.press(screen.getByTestId('submit-order'));
  await waitFor(() => expect(screen.getByTestId('confirm-order')).toBeTruthy());
}

async function submit(screen: Screen): Promise<void> {
  await openReview(screen);
  await fireEvent.press(screen.getByTestId('confirm-order'));
}

describe('NewOrderScreen', () => {
  it('submits selected products with a required date', async () => {
    const screen = await showProducts();

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items).toEqual([{ productId: 'p1', qty: 2, remarks: '' }]);
    expect(payload.requiredDate).toBe(REQUIRED_DATE);
  });

  /**
   * The typed field between the steppers, which is the only way a branch orders
   * sixty trays without sixty taps.
   */
  it('takes a quantity typed straight into the stepper', async () => {
    const screen = await showProducts();

    await setDate(screen);
    await fireEvent.changeText(screen.getByTestId('qty-p1'), '60');
    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 60, remarks: '' },
    ]);
  });

  /**
   * A quantity the server's Zod would refuse (`int().positive()`) must not reach
   * the queue, where it would be discovered at drain time rather than at the
   * keyboard.
   */
  it('ignores anything that is not a whole number in the stepper field', async () => {
    const screen = await showProducts();

    await fireEvent.changeText(screen.getByTestId('qty-p1'), '3.5');
    await waitFor(() =>
      expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 3,500'),
    );
  });

  it('never sends branchId — the server derives it from the token', async () => {
    const screen = await showProducts();

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload).not.toHaveProperty('branchId');
  });

  /**
   * v6 shows a rate on every row and three totals in the footer. The schema has
   * no money on a demand at all, and Zod strips what it does not declare — so a
   * rate in the payload would look like it worked and reach nothing.
   */
  it('shows money but never sends it', async () => {
    const screen = await showProducts();

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await waitFor(() => expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 100'));

    await submit(screen);

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items[0]).toEqual({ productId: 'p1', qty: 1, remarks: '' });
    expect(payload).not.toHaveProperty('amount');
    expect(payload).not.toHaveProperty('returnItems');
    expect(payload).not.toHaveProperty('discount');
  });

  it('sends packingItems and specialItems explicitly', async () => {
    // An absent key must behave like the pre-packing-material payload; sending
    // empty arrays makes that explicit rather than relying on a server default.
    const screen = await showProducts();

    await setDate(screen);
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

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Cream Roll'));
    await openReview(screen);

    await fireEvent.changeText(screen.getByTestId('remark-p1'), '  thin icing  ');
    await fireEvent.press(screen.getByTestId('confirm-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 1, remarks: 'thin icing' },
      { productId: 'p2', qty: 1, remarks: '' },
    ]);
  });

  /**
   * Why the basket carries the product NAME and the RATE, not just an id.
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

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await search(screen, 'cream');
    await waitFor(() => expect(screen.queryByLabelText('Increase Milk Rusk')).toBeNull());

    await openReview(screen);
    expect(screen.getByText('Milk Rusk')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('confirm-order'));
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

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await openReview(screen);

    // Two controls answer to this label once the review is open — the table's
    // and the review's. The last one mounted is the review's.
    const [inReview] = screen.getAllByLabelText('Increase Milk Rusk').slice(-1);
    if (!inReview) throw new Error('the review has no stepper for Milk Rusk');
    await fireEvent.press(inReview);
    await fireEvent.press(screen.getByTestId('confirm-order'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 2, remarks: '' },
    ]);
  });

  it('states the branch and the total the review is about to commit', async () => {
    const screen = await showProducts();

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByLabelText('Increase Cream Roll'));
    await openReview(screen);

    // `getAllBy…` throughout: the screen behind the review is still mounted and
    // the meta grid names the same branch, so each of these legitimately answers
    // twice. Asserting uniqueness here would be asserting that the table
    // unmounts, which is not what the review is for.
    expect(screen.getAllByText('Saddar').length).toBeGreaterThan(0);
    expect(screen.getByText('Total units')).toBeTruthy();
    expect(screen.getAllByText(REQUIRED_DATE).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rs. 300').length).toBeGreaterThan(0);
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

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() => expect(screen.getByText(/Orders can be placed between/)).toBeTruthy());
    expect(screen.queryByTestId('confirm-order')).toBeNull();
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('refuses an empty order — Submit is not even pressable', async () => {
    const screen = await showProducts();

    expect(screen.getByTestId('submit-order').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('save-draft').props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByTestId('confirm-order')).toBeNull();
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  /**
   * The date gates Submit and nothing else, so pressing Submit without one has
   * to say so on the field — not open a review of an order that cannot be sent.
   */
  it('marks the date field and opens nothing when Submit is pressed without one', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() =>
      expect(screen.getByText('Enter the date this delivery is needed.')).toBeTruthy(),
    );
    expect(screen.queryByTestId('confirm-order')).toBeNull();
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('rejects a required date in the past', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await setDate(screen, '2020-01-01');
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() =>
      expect(screen.getByText('The required date cannot be in the past.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('rejects a malformed required date', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await setDate(screen, '18/08/2026');
    await fireEvent.press(screen.getByTestId('submit-order'));

    await waitFor(() =>
      expect(screen.getByText('Enter the required date as YYYY-MM-DD.')).toBeTruthy(),
    );
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('removes a product when its quantity reaches zero', async () => {
    const screen = await showProducts();

    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await waitFor(() => expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 100'));

    await fireEvent.press(screen.getByLabelText('Decrease Milk Rusk'));
    await waitFor(() => expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 0'));
    expect(screen.getByTestId('submit-order').props.accessibilityState.disabled).toBe(true);
  });

  /**
   * Save draft is the one path that is NOT a write. It goes to the device, needs
   * no required date, and must never reach the queue — a draft that syncs is an
   * order nobody placed.
   */
  describe('save draft', () => {
    it('stores the basket on the device without a required date, and sends nothing', async () => {
      const screen = await showProducts();

      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await fireEvent.press(screen.getByTestId('save-draft'));

      await waitFor(() => expect(mockSaveDraft).toHaveBeenCalled());
      const [branchId, draft] = mockSaveDraft.mock.calls[0];
      expect(branchId).toBe('b-1');
      expect(draft.requiredDate).toBe('');
      expect(draft.lines).toEqual([
        { productId: 'p1', name: 'Milk Rusk', qty: 1, rate: 100, remark: '' },
      ]);
      expect(mockWriteOffline).not.toHaveBeenCalled();
    });

    it('leaves the form exactly as it was', async () => {
      const screen = await showProducts();

      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await fireEvent.press(screen.getByTestId('save-draft'));

      await waitFor(() => expect(mockSaveDraft).toHaveBeenCalled());
      expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 100');
    });

    it('puts a stored draft back on mount, and says nothing was sent', async () => {
      mockReadDraft.mockResolvedValue({
        lines: [{ productId: 'p1', name: 'Milk Rusk', qty: 4, rate: 100, remark: 'thin icing' }],
        requiredDate: REQUIRED_DATE,
        savedAt: INSIDE_ORDER_WINDOW.getTime(),
      });

      const screen = await showProducts();

      await waitFor(() =>
        expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 400'),
      );
      expect(screen.getByText(/Nothing has been sent to production/)).toBeTruthy();
      expect(screen.getByTestId('required-date').props.value).toBe(REQUIRED_DATE);
    });

    it('is taken with the basket when the order is cleared', async () => {
      const screen = await showProducts();

      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await fireEvent.press(screen.getByTestId('clear-order'));
      await fireEvent.press(screen.getByTestId('confirm-clear-confirm'));

      await waitFor(() => expect(mockClearDraft).toHaveBeenCalledWith('b-1'));
      expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 0');
    });

    /**
     * A submitted order must not leave a draft behind — the next launch would
     * put the same demand back on screen for someone to send a second time.
     */
    it('is cleared when the order is submitted', async () => {
      const screen = await showProducts();

      await setDate(screen);
      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await submit(screen);

      await waitFor(() => expect(mockClearDraft).toHaveBeenCalledWith('b-1'));
    });
  });

  /**
   * What the branch is told afterwards — the only part of this flow they carry
   * back to the counter with them.
   */
  describe('confirmation', () => {
    it('confirms in the server’s terms when the drain landed it', async () => {
      drainSyncs(1);
      const screen = await showProducts();

      await setDate(screen);
      await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
      await submit(screen);

      await waitFor(() =>
        expect(screen.getByText('Order submitted to production.')).toBeTruthy(),
      );
      // The review is done with, and the basket with it: leaving either up
      // invites the same demand being sent twice.
      expect(screen.queryByTestId('confirm-order')).toBeNull();
      expect(screen.getByTestId('order-total')).toHaveTextContent('Rs. 0');
      expect(screen.getByTestId('required-date').props.value).toBe('');
      expect(screen.queryByText('Saved offline')).toBeNull();
    });

    it('says "Saved offline" when it is still queued, never "submitted"', async () => {
      drainSyncs(0);
      const screen = await showProducts();

      await setDate(screen);
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

      await setDate(screen);
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

  /**
   * The review is editable, so it can be edited down to nothing — and a Confirm
   * that greys out without a word sends someone back to a filtered table to
   * hunt for a problem this screen already knows the shape of.
   */
  it('says why Confirm is dead when the review is emptied', async () => {
    const screen = await showProducts();

    await setDate(screen);
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));
    await openReview(screen);

    // Step the only line back to zero from inside the review. `setQtyFor`
    // deletes at zero rather than storing it, so the basket is now empty.
    const [inReview] = screen.getAllByLabelText('Decrease Milk Rusk').slice(-1);
    if (!inReview) throw new Error('the review has no stepper for Milk Rusk');
    await fireEvent.press(inReview);

    await waitFor(() => expect(screen.getByTestId('review-blocker')).toBeTruthy());
    expect(screen.getByText(/Every line was removed/)).toBeTruthy();
    // And it still refuses to send.
    await fireEvent.press(screen.getByTestId('confirm-order'));
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });



});
