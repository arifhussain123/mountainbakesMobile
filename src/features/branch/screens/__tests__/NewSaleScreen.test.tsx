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
  // What the write hooks now read: this row's fate, not the drain's tally.
  getOperationOutcome: jest.fn(async () => ({ status: 'synced', message: null })),
}));

import * as catalogApi from '@/api/services/catalogService';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { getOperationOutcome } from '@/common/database/repositories/syncQueueRepository';
import { drainQueue } from '@/api/sync/syncManager';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';
import { renderScreen } from '@/common/test-utils/render';
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

type Screen = Awaited<ReturnType<typeof renderScreen>>;

/** Ring one up and cross to the payment stage, which is where both finishes live. */
async function addRuskAndCharge(screen: Screen) {
  await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
  await fireEvent.press(screen.getByTestId('charge'));
  await waitFor(() => expect(screen.getByTestId('save-sale')).toBeTruthy());
}

describe('NewSaleScreen', () => {
  it('adds a product and shows a running total', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByText('1 item')).toBeTruthy());
    expect(screen.getByTestId('cart-total')).toHaveTextContent('Rs. 100');
  });

  /**
   * The cart is the price list's header rather than a second screen, so what has
   * been rung up is visible where the ringing up happens.
   */
  it('shows the line it just created above the price list', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByTestId('line-total-p1')).toBeTruthy());
    expect(screen.getByTestId('cart-qty-p1').props.value).toBe('1');
    // And the price-list row says how many of it are already in the sale.
    expect(screen.getByText('1 in cart')).toBeTruthy();
  });

  it('cannot reach payment with an empty cart', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    expect(screen.getByTestId('charge').props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByTestId('save-sale')).toBeNull();
  });

  /** Back is one step, not one screen — and the cart survives it. */
  it('returns from payment to items with the cart intact', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    await fireEvent.press(screen.getByLabelText('Go back'));

    await waitFor(() => expect(screen.getByTestId('charge')).toBeTruthy());
    expect(screen.getByTestId('cart-qty-p1').props.value).toBe('1');
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
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.items).toEqual([{ productId: 'p1', qty: 1, discount: 0 }]);
    expect(payload.items[0]).not.toHaveProperty('unitPrice');
    expect(payload).not.toHaveProperty('grandTotal');
  });

  it('offers the four branch payment methods, spelled for a person, and never staff', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('Easypaisa')).toBeTruthy();
    expect(screen.getByText('Foodpanda')).toBeTruthy();
    // Spelled out, not the raw enum: `bank_account` with the underscore showing
    // was what the till rendered before the label map existed.
    expect(screen.getByText('Bank account')).toBeTruthy();
    expect(screen.queryByText('bank_account')).toBeNull();
    // 'staff' is production-counter only — an unpaid hand-out.
    expect(screen.queryByText('Staff (unpaid)')).toBeNull();
  });

  it('hands a confirmed sale back to the register as synced', async () => {
    drainSyncs(1);
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

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
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

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
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

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

/**
 * The discount is entered as a percentage and sent as rupees, because
 * `OrderItemSchema.discount` is a number of rupees and the server knows nothing
 * about percentages.
 */
describe('line discount', () => {
  it('sends the resolved rupee figure, not the percentage', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.changeText(screen.getByTestId('discount-p1'), '10');
    await fireEvent.press(screen.getByTestId('charge'));
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 1, discount: 10 },
    ]);
  });

  /**
   * The bug this pairing exists to prevent.
   *
   * Resolving "10%" once against the gross at the moment it is typed and then
   * freezing the rupee figure means ringing up a second unit silently turns it
   * into a 5% discount — the cashier sees the number they typed and the customer
   * is charged something else. `useCart` re-applies the percentage on every
   * quantity change.
   */
  it('re-applies the percentage when the quantity changes', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.changeText(screen.getByTestId('discount-p1'), '10');
    // A second unit: gross 200, so 10% must become 20, not stay 10.
    await fireEvent.press(screen.getByLabelText('Increase Milk Rusk'));

    await waitFor(() => expect(screen.getByTestId('cart-total')).toHaveTextContent('Rs. 180'));

    await fireEvent.press(screen.getByTestId('charge'));
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
      { productId: 'p1', qty: 2, discount: 20 },
    ]);
  });

  it('removes a whole line in one tap rather than stepping it to zero', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.press(screen.getByTestId('remove-p1'));

    await waitFor(() => expect(screen.getByTestId('cart-total')).toHaveTextContent('Rs. 0'));
    expect(screen.queryByTestId('line-total-p1')).toBeNull();
  });
});

/**
 * Taking cash. The notes ADD and Exact SETS, because tendering is cumulative and
 * settling is not.
 */
describe('cash pad', () => {
  it('adds a note to what has already been received', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    await fireEvent.press(screen.getByTestId('cash-note-50'));
    await fireEvent.press(screen.getByTestId('cash-note-100'));

    await waitFor(() => expect(screen.getByTestId('cash-received').props.value).toBe('150'));
    expect(screen.getByTestId('cash-returned')).toHaveTextContent('Rs. 50');
  });

  it('sets the tender to the grand total exactly', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    await fireEvent.press(screen.getByTestId('cash-exact'));

    await waitFor(() => expect(screen.getByTestId('cash-received').props.value).toBe('100'));
    expect(screen.getByTestId('cash-returned')).toHaveTextContent('Rs. 0');
  });

  /**
   * A sale saved with money missing is a till that will not reconcile at close,
   * and nobody will know which sale it was.
   */
  it('blocks both finishes while the tender is short, and says what is still due', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    await fireEvent.changeText(screen.getByTestId('cash-received'), '50');

    await waitFor(() => expect(screen.getByTestId('cash-still-due')).toHaveTextContent('Rs. 50'));
    expect(screen.getByTestId('save-sale').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('save-and-share').props.accessibilityState.disabled).toBe(true);
    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  /**
   * An empty field is NOT short — it means the tender was not recorded, which is
   * a normal thing to skip. Treating blank as zero would refuse most sales on
   * the screen used most often.
   */
  it('saves without a recorded tender, and sends no receivedCash', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload).not.toHaveProperty('receivedCash');
  });

  it('sends the tender when it was recorded', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    await fireEvent.press(screen.getByTestId('cash-note-500'));
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(mockWriteOffline).toHaveBeenCalled());
    expect(mockWriteOffline.mock.calls[0][0].payload.receivedCash).toBe(500);
  });

  it('offers no cash pad for a method that takes no cash', async () => {
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);

    await fireEvent.press(screen.getByTestId('payment-easypaisa'));

    await waitFor(() => expect(screen.queryByTestId('cash-received')).toBeNull());
  });
});

/**
 * There is no printing in this app — `react-native-print` is unusable and PDF
 * rendering was deferred to a server endpoint that does not exist. The slip
 * previews on-device and shares as text, which is what `OrderPrintPreview`
 * already does for the production slip.
 */
describe('save and share', () => {
  it('opens a slip carrying the sale, then hands the outcome to the register', async () => {
    drainSyncs(1);
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-and-share'));

    await waitFor(() => expect(screen.getByTestId('slip-total')).toBeTruthy());
    expect(screen.getByTestId('slip-total')).toHaveTextContent('Rs. 100');
    // The figures are the till's own, and the slip says so rather than passing
    // them off as the server's.
    expect(screen.getByText(/Amounts are this till's own/)).toBeTruthy();
    // The register is still where the outcome is read, so leaving the slip is
    // what reports it.
    expect(mockNavigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('slip-done'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('SalesList', { outcome: 'synced' }),
    );
  });

  it('admits a queued sale has no sale number yet', async () => {
    drainSyncs(0);
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-and-share'));

    await waitFor(() =>
      expect(screen.getByText(/It has no sale number until it reaches the server/)).toBeTruthy(),
    );
  });

  /**
   * A refused sale did not happen. Printing a slip for it is how a customer
   * walks out holding proof of a sale the business has no record of.
   */
  it('never offers a slip for a sale the server refused', async () => {
    drainRefuses('Milk Rusk: requested 1, available 0');
    const screen = await renderScreen(<NewSaleScreen />);
    await addRuskAndCharge(screen);
    await fireEvent.press(screen.getByTestId('save-and-share'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('SalesList', {
        outcome: 'refused',
        reason: 'Milk Rusk: requested 1, available 0',
      }),
    );
    expect(screen.queryByTestId('slip-total')).toBeNull();
  });
});

/**
 * Stock stays advisory — see the `availability` block above — so the row's job
 * is to make the 409 foreseeable at the counter rather than to prevent the tap.
 */
describe('over stock', () => {
  it('says so when the cart exceeds what is on record, without blocking the sale', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 1 }],
    });
    const screen = await renderScreen(<NewSaleScreen />);
    await waitFor(() => expect(screen.getByText('1 left')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByText(/more than the 1 on record/)).toBeTruthy());
    // Advisory, not a gate: the server adjudicates, and a stale balance must not
    // stop a real sale.
    expect(screen.getByTestId('charge').props.accessibilityState.disabled).toBe(false);
  });
});
