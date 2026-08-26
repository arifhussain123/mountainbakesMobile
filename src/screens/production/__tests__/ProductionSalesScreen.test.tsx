import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/productionApi', () => ({
  getProductionSales: jest.fn(),
  createProductionSale: jest.fn(),
  getProductionStock: jest.fn(),
  getProductionOverview: jest.fn(),
  getProductionQueueStats: jest.fn(),
  getBranchStock: jest.fn(),
}));
jest.mock('@/services/api/catalogApi', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import * as catalogApi from '@/services/api/catalogApi';
import { createProductionSale, getProductionSales, getProductionStock } from '@/services/api/productionApi';
import { ApiError } from '@/services/api/errors';
import { businessDayBounds } from '@/shared/utils/timezone';
import { useNetworkStore } from '@/store/networkStore';
import { renderScreen } from '@/test-utils/render';
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
 * Walk the till from an empty screen to a sent request.
 *
 * The modal is two steps inside one `MBModal` rather than a nested one, so this
 * is press-FAB → tap-product → Review & pay, with no second modal to wait for.
 */
async function ringUp(screen: Awaited<ReturnType<typeof renderScreen>>) {
  await waitFor(() => expect(screen.getByTestId('new-counter-sale')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('new-counter-sale'));

  await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  await fireEvent.press(screen.getByText('Milk Rusk'));

  await waitFor(() => expect(screen.getByTestId('counter-review-and-pay')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('counter-review-and-pay'));

  await waitFor(() => expect(screen.getByTestId('confirm-counter-sale')).toBeTruthy());
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

    await fireEvent.press(screen.getByTestId('confirm-counter-sale'));

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

    await fireEvent.press(screen.getByTestId('confirm-counter-sale'));

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
    await fireEvent.press(screen.getByTestId('confirm-counter-sale'));

    await waitFor(() =>
      expect(screen.getByText(/comment saying who took what and why/i)).toBeTruthy(),
    );
    expect(createSale).not.toHaveBeenCalled();
  });

  it('sends a staff sale once it carries a comment, and never with cash', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);

    await fireEvent.press(screen.getByTestId('counter-payment-staff'));
    await fireEvent.changeText(screen.getByTestId('counter-notes'), 'Night shift, 2 rusks');
    await fireEvent.press(screen.getByTestId('confirm-counter-sale'));

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
    await fireEvent.press(screen.getByTestId('confirm-counter-sale'));

    await waitFor(() => expect(screen.getByText(/Nothing was sold/i)).toBeTruthy());
    expect(screen.queryByText(/sync/i)).toBeNull();
    expect(screen.queryByText(/Saved offline/i)).toBeNull();
  });

  it('confirms with the server\'s own order number', async () => {
    const screen = await renderScreen(<ProductionSalesScreen />);
    await ringUp(screen);
    await fireEvent.press(screen.getByTestId('confirm-counter-sale'));

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
