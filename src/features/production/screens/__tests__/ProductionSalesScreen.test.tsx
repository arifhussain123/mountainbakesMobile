import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/productionService', () => ({
  getProductionSales: jest.fn(),
  createProductionSale: jest.fn(),
  getProductionStock: jest.fn(),
  getProductionOverview: jest.fn(),
  getProductionQueueStats: jest.fn(),
  getBranchStock: jest.fn(),
}));
jest.mock('@/api/services/catalogService', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import * as catalogApi from '@/api/services/catalogService';
import { createProductionSale, getProductionSales, getProductionStock } from '@/api/services/productionService';
import { ApiError } from '@/api/errors';
import { businessDayBounds } from '@/shared/utils/timezone';
import { useNetworkStore } from '@/state/networkStore';
import { renderScreen } from '@/common/test-utils/render';
import { ProductionSalesScreen, productionSalesRange } from '../ProductionSalesScreen';

const getSales = getProductionSales as jest.Mock;
const createSale = createProductionSale as jest.Mock;
const getPool = getProductionStock as jest.Mock;
const getProducts = catalogApi.getProducts as jest.Mock;
const getSettings = catalogApi.getSettings as jest.Mock;

const PRODUCT = {
  id: 'p1',
  name: 'Milk Rusk',
  sku: 'MB-001',
  categoryId: 'c1',
  categoryName: 'Rusks',
  price: 250,
  costPrice: 100,
  description: '',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const SALE = {
  id: 'o1',
  orderNumber: 'MB-0007',
  branchId: 'production',
  branchName: 'Production',
  customerId: '',
  customerName: 'Walking Customer',
  customerPhone: '',
  customerAddress: '',
  items: [],
  subtotal: 500,
  discountTotal: 0,
  deliveryCharges: 0,
  taxRate: 0,
  taxAmount: 0,
  grandTotal: 500,
  paymentMethod: 'cash',
  status: 'delivered',
  notes: '',
  createdBy: 'u1',
  createdByName: 'Counter',
  createdAt: '2026-08-21T06:00:00.000Z',
  updatedAt: '2026-08-21T06:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  getSales.mockResolvedValue([SALE]);
  getPool.mockResolvedValue({ date: '2026-08-21', rows: [] });
  getProducts.mockResolvedValue([PRODUCT]);
  getSettings.mockResolvedValue({ currencySymbol: 'Rs.' });
  createSale.mockResolvedValue({
    id: 'o2',
    orderNumber: 'MB-0008',
    grandTotal: 250,
    subtotal: 250,
    discountTotal: 0,
    taxAmount: 0,
    items: [],
    createdAt: '2026-08-21T07:00:00.000Z',
  });
  useNetworkStore.setState({ isOnline: true, hasResolved: true });
});

/**
 * Walk the till from an empty screen to the payment stage.
 *
 * Two stages inside one `MBModal` rather than a nested one, so this is
 * press-FAB → tap-product → Charge, with no second modal to wait for. The row is
 * pressed by its accessible label rather than its text: once a line is in the
 * cart the product name is on screen twice, and the label is the whole
 * announcement anyway.
 */
async function ringUp(screen: Awaited<ReturnType<typeof renderScreen>>) {
  await waitFor(() => expect(screen.getByTestId('new-counter-sale')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('new-counter-sale'));

  await waitFor(() => expect(screen.getByLabelText(/^Add Milk Rusk/)).toBeTruthy());
  await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

  await waitFor(() => expect(screen.getByTestId('charge')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('charge'));

  await waitFor(() => expect(screen.getByTestId('save-sale')).toBeTruthy());
}

describe('productionSalesRange', () => {
  /**
   * The endpoint bounds `created_at`, which is an instant. A bare `YYYY-MM-DD`
   * would compare against calendar midnight and cut two hours off both ends of a
   * day that rolls at 02:00 — dropping a 01:00 sale out of the night it was made
   * and into the one before.
   */
  it('resolves a chip to business-day bounds, not calendar midnights', () => {
    const at = new Date('2026-08-21T10:00:00.000Z');
    expect(productionSalesRange('today', at)).toEqual({
      from: businessDayBounds('2026-08-21').fromISO,
      to: businessDayBounds('2026-08-21').toISO,
    });
  });

  /** 01:00 Karachi is still the previous business day, so "today" is the 20th. */
  it('follows the 02:00 rollover rather than the clock date', () => {
    // 2026-08-21T20:30Z is 2026-08-22 01:30 in Karachi — before the rollover.
    const beforeRollover = new Date('2026-08-21T20:30:00.000Z');
    expect(productionSalesRange('today', beforeRollover).from).toBe(
      businessDayBounds('2026-08-21').fromISO,
    );
  });

  it('counts today as one of the seven days', () => {
    const at = new Date('2026-08-21T10:00:00.000Z');
    const range = productionSalesRange('last7', at);
    expect(range.from).toBe(businessDayBounds('2026-08-15').fromISO);
    expect(range.to).toBe(businessDayBounds('2026-08-21').toISO);
  });
});

describe('ProductionSalesScreen', () => {
  it("lists the counter's own sales for today", async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);

    await waitFor(() => expect(screen.getByText('MB-0007')).toBeTruthy());
    expect(getSales).toHaveBeenCalledWith(productionSalesRange('today'));
  });

  /**
   * `GET /api/orders/production-sales`, never `GET /api/orders`. The generic
   * list caps a production account to the ACTIVE statuses, and a counter sale is
   * written `delivered` — so it would 403 rather than come back empty.
   */
  it('reads the production-sales route and sends no branchId', async () => {
    await renderScreen(<ProductionSalesScreen />);
    await waitFor(() => expect(getSales).toHaveBeenCalled());

    expect(Object.keys(getSales.mock.calls[0][0])).toEqual(['from', 'to']);
  });

  it('sends no branchId on the sale — the server pins it to the sentinel branch', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(createSale).toHaveBeenCalled());
    expect(createSale.mock.calls[0][0]).not.toHaveProperty('branchId');
  });

  /**
   * The request carries product, quantity and discount only. No price and no
   * total: the server resolves the current price and returns its own snapshot,
   * which is what makes a price change mid-sale impossible to misprint.
   */
  it('sends no prices with the line items', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(createSale).toHaveBeenCalled());
    expect(createSale.mock.calls[0][0].items).toEqual([
      { productId: 'p1', qty: 1, discount: 0 },
    ]);
  });

  /**
   * A staff sale takes no money and is excluded from every revenue total, so the
   * comment is the only record of who took what and why. The server refuses it
   * without one (`CreateProductionSaleSchema.superRefine`); this checks it first
   * so the operator sees it at the field instead of after a round trip.
   */
  it('refuses to send a staff sale with no comment', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    await fireEvent.press(screen.getByTestId('counter-payment-staff'));
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() =>
      expect(screen.getByText(/comment saying who took what and why/i)).toBeTruthy(),
    );
    expect(createSale).not.toHaveBeenCalled();
  });

  it('sends a staff sale once it carries a comment, and never with cash', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    await fireEvent.press(screen.getByTestId('counter-payment-staff'));
    await fireEvent.changeText(screen.getByTestId('sale-notes'), 'Night shift, 2 rusks');
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(createSale).toHaveBeenCalled());
    const sent = createSale.mock.calls[0][0];
    expect(sent.paymentMethod).toBe('staff');
    expect(sent.notes).toBe('Night shift, 2 rusks');
    // No tender on an unpaid order: the handler guards against a stray figure
    // landing on one, so it is not sent in the first place.
    expect(sent).not.toHaveProperty('receivedCash');
  });

  /**
   * The one report this screen must never get wrong.
   *
   * A 409 means the pool was short and `commit_production_sale` wrote nothing.
   * Saying "saved" or "will sync" here is the failure `writeOutcome.ts` exists
   * to prevent — this sale is not queued anywhere and never will be.
   */
  it('reports a stock refusal as nothing sold, not as queued', async () => {
    createSale.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        status: 409,
        message: 'Stock has changed. Please review your order.',
      }),
    );

    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(screen.getByText(/Nothing was sold/i)).toBeTruthy());
    expect(screen.queryByText(/sync/i)).toBeNull();
    expect(screen.queryByText(/Saved offline/i)).toBeNull();
  });

  it('confirms with the server\'s own order number', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(screen.getByTestId('sale-outcome')).toBeTruthy());
    expect(screen.getByText(/MB-0008/)).toBeTruthy();
  });

  /**
   * Offline, the counter is shut — the write cannot be queued, so the control is
   * dimmed rather than hidden. Hidden would leave an operator hunting for a
   * button that was there five minutes ago.
   */
  it('disables the new-sale control with no connection', async () => {
    useNetworkStore.setState({ isOnline: false, hasResolved: true });

    const screen = await renderScreen(<ProductionSalesScreen />);

    await waitFor(() => expect(screen.getByTestId('new-counter-sale')).toBeTruthy());
    const fab = screen.getByTestId('new-counter-sale');
    expect(fab.props.accessibilityState.disabled).toBe(true);
  });

  /** And the offline strip must not promise the sale is kept on the device. */
  it('corrects the offline strip, which would otherwise promise a queue', async () => {
    useNetworkStore.setState({ isOnline: false, hasResolved: true });

    const screen = await renderScreen(<ProductionSalesScreen />);

    await waitFor(() => expect(screen.getByText(/needs a connection/i)).toBeTruthy());
    expect(screen.queryByText(/sync automatically/i)).toBeNull();
  });
});

/**
 * What the counter gained by moving onto the shared till (`common/till/`).
 *
 * All of it existed at the branch already and none of it here: a typed quantity
 * field, a way to remove a line, a percentage discount that survives a quantity
 * change, and a cash pad. The counter's own rules — the pool, `staff`, and a
 * write that cannot queue — are what stayed behind in `useCounterSale`.
 */
describe('the shared till, at the counter', () => {
  it('takes a typed quantity and a percentage discount', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await waitFor(() => expect(screen.getByTestId('new-counter-sale')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('new-counter-sale'));

    await waitFor(() => expect(screen.getByLabelText(/^Add Milk Rusk/)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.changeText(screen.getByTestId('cart-qty-p1'), '4');
    await fireEvent.changeText(screen.getByTestId('discount-p1'), '10');

    await fireEvent.press(screen.getByTestId('charge'));
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(createSale).toHaveBeenCalled());
    // 4 × 250 = 1000, so 10% is 100 — resolved to rupees because
    // `OrderItemSchema.discount` knows nothing about percentages.
    expect(createSale.mock.calls[0][0].items).toEqual([
      { productId: 'p1', qty: 4, discount: 100 },
    ]);
  });

  it('counts the pool, not a branch shelf', async () => {
    getPool.mockResolvedValue({
      date: '2026-08-21',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 40 }],
    });
    const screen = await renderScreen(<ProductionSalesScreen />);
    await fireEvent.press(await waitFor(() => screen.getByTestId('new-counter-sale')));

    await waitFor(() => expect(screen.getByText('40 in pool')).toBeTruthy());
    expect(screen.queryByText('40 in stock')).toBeNull();
  });

  /**
   * Advisory, never a gate: the server is the only authority and refuses an
   * overdraw with a 409. What the row buys is that the refusal is foreseeable at
   * the counter rather than arriving as a failed request after the customer has
   * gone.
   */
  it('warns when the cart exceeds the pool, without blocking the sale', async () => {
    getPool.mockResolvedValue({
      date: '2026-08-21',
      rows: [{ productId: 'p1', stockCode: 'STK-1', productName: 'Milk Rusk', balance: 1 }],
    });
    const screen = await renderScreen(<ProductionSalesScreen />);
    await fireEvent.press(await waitFor(() => screen.getByTestId('new-counter-sale')));

    await waitFor(() => expect(screen.getByLabelText(/^Add Milk Rusk/)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));
    await fireEvent.press(screen.getByLabelText(/^Add Milk Rusk/));

    await waitFor(() => expect(screen.getByText(/more than the 1 on record/)).toBeTruthy());
    expect(screen.getByTestId('charge').props.accessibilityState.disabled).toBe(false);
  });

  it('adds notes to the tender and blocks a short one', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    await fireEvent.press(screen.getByTestId('cash-note-100'));

    // 100 against a 250 total.
    await waitFor(() => expect(screen.getByTestId('cash-still-due')).toHaveTextContent('Rs. 150'));
    expect(screen.getByTestId('save-sale').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('cash-exact'));
    await waitFor(() => expect(screen.getByTestId('cash-returned')).toHaveTextContent('Rs. 0'));
    expect(screen.getByTestId('save-sale').props.accessibilityState.disabled).toBe(false);
  });

  /** A staff sale takes no money, so there is nothing to count. */
  it('offers no cash pad on a staff sale', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    expect(screen.getByTestId('cash-received')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('counter-payment-staff'));

    await waitFor(() => expect(screen.queryByTestId('cash-received')).toBeNull());
    // And the button stops promising money changed hands.
    expect(screen.getByTestId('save-sale')).toHaveTextContent('Record staff sale');
  });
});

/**
 * The slip, and the one way this till is better off than the branch's.
 *
 * `POST /api/orders/production-sale` posts live and is answered with the
 * server's own order number, subtotal, discount, tax and grand total — so the
 * counter's slip prints figures nobody can disagree with, where the branch's can
 * only ever carry the device's arithmetic.
 */
describe('record and share', () => {
  it("prints the server's number and the server's figures", async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);
    await fireEvent.press(screen.getByTestId('save-and-share'));

    await waitFor(() => expect(screen.getByTestId('slip-total')).toBeTruthy());
    expect(screen.getByText('MB-0008')).toBeTruthy();
    expect(screen.getByTestId('slip-total')).toHaveTextContent('Rs. 250');
    // Not hedged: these came back from the server, so a disclaimer here would be
    // about numbers nobody can disagree with.
    expect(screen.getByText('Amounts as recorded by the server.')).toBeTruthy();
    expect(screen.queryByText(/Amounts are this till's own/)).toBeNull();
    // Nor is it queued — this write cannot be.
    expect(screen.queryByText(/waiting to sync/i)).toBeNull();
  });

  it('reports the sale on the list either way, and shows no slip for a plain save', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);
    await fireEvent.press(screen.getByTestId('save-sale'));

    await waitFor(() => expect(screen.getByTestId('sale-outcome')).toBeTruthy());
    expect(screen.queryByTestId('slip-total')).toBeNull();
  });
});
