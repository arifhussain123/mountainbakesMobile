import React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react-native';

/**
 * The register is the screen a shift is reconciled from, so what it asserts is
 * arithmetic and honesty: that the figures are the day's, that a sale the server
 * never accepted is never drawn as one that was, and that a search finding
 * nothing is not reported as a day on which nothing sold.
 */

let mockRouteParams: object | undefined;
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setParams: mockSetParams,
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('@/services/api/financeApi', () => ({ getOrders: jest.fn() }));
jest.mock('@/services/api/catalogApi', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.', gstEnabled: false, gstRate: 0 })),
}));
jest.mock('@/database/repositories/offlineWriteRepository', () => ({
  listQueuedSalesForDay: jest.fn(async () => []),
}));
jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));
jest.mock('@/services/sync/syncManager', () => ({
  drainQueue: jest.fn(),
  isDraining: () => false,
}));

import { listQueuedSalesForDay } from '@/database/repositories/offlineWriteRepository';
import { getOrders } from '@/services/api/financeApi';
import type { Order, OrderItem } from '@/shared/types/order.types';
import { businessDateStr, businessDayBounds } from '@/shared/utils/timezone';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { renderScreen } from '@/test-utils/render';
import { SalesScreen, matchesSale, summariseDay } from '../SalesScreen';

const mockGetOrders = getOrders as jest.Mock;
const mockQueued = listQueuedSalesForDay as jest.Mock;

function item(partial: Partial<OrderItem> = {}): OrderItem {
  return {
    productId: 'p1',
    productName: 'Milk Rusk',
    categoryId: 'c1',
    categoryName: 'Rusks',
    unitPrice: 100,
    qty: 2,
    discount: 0,
    lineTotal: 200,
    ...partial,
  };
}

function sale(partial: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'ORD-001',
    branchId: 'b-1',
    branchName: 'Saddar',
    customerId: '',
    customerName: 'Walk-in',
    customerPhone: '',
    customerAddress: '',
    items: [item()],
    subtotal: 200,
    discountTotal: 0,
    deliveryCharges: 0,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: 200,
    paymentMethod: 'cash',
    status: 'delivered',
    notes: '',
    createdBy: 'u1',
    createdByName: 'Ayesha',
    createdAt: '2026-08-28T09:20:00.000Z',
    updatedAt: '2026-08-28T09:20:00.000Z',
    ...partial,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = undefined;
  mockGetOrders.mockResolvedValue([sale()]);
  mockQueued.mockResolvedValue([]);
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

describe('SalesScreen', () => {
  it('asks for the business day as instants, never a bare date', async () => {
    // `created_at` is compared as an instant and the day rolls at 02:00, so a
    // bare YYYY-MM-DD would cut two hours off both ends — a 01:00 sale would
    // fall out of the night it was rung up on.
    await renderScreen(<SalesScreen />);

    const bounds = businessDayBounds(businessDateStr());
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith({ from: bounds.fromISO, to: bounds.toISO }),
    );
    expect(bounds.fromISO).toContain('T');
  });

  it('totals the day into the summary card and counts it in the header', async () => {
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', orderNumber: 'ORD-001', grandTotal: 200 }),
      sale({ id: 'o2', orderNumber: 'ORD-002', grandTotal: 150, subtotal: 150 }),
    ]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByTestId('sales-day-total')).toBeTruthy());
    // The figure is in the card, where its caption can say where it came from;
    // the header carries the day and the count.
    expect(within(screen.getByTestId('sales-day-total')).getByText('Rs. 350')).toBeTruthy();
    expect(screen.getByText('Summed from the records below')).toBeTruthy();
    expect(screen.getByText(/· 2 recorded$/)).toBeTruthy();
  });

  it('keeps all four tenders on the card, including the ones that took nothing', async () => {
    // A tender that is empty today is information — a shop that took no
    // Foodpanda is not a shop with no Foodpanda. Dropping the tile would make
    // the card's shape change through the day.
    mockGetOrders.mockResolvedValue([sale({ grandTotal: 200, paymentMethod: 'cash' })]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByTestId('sales-payment-cash')).toBeTruthy());
    expect(screen.getByTestId('sales-payment-easypaisa')).toBeTruthy();
    expect(screen.getByTestId('sales-payment-foodpanda')).toBeTruthy();
    expect(screen.getByTestId('sales-payment-bank_account')).toBeTruthy();
    // Cash alone carries its gross: it is the tender counted against a drawer.
    expect(within(screen.getByTestId('sales-payment-cash')).getByText('Gross Rs. 200')).toBeTruthy();
  });

  it('lists a cancelled sale and keeps it out of the money', async () => {
    // It happened, so it is on the register; it took nothing, so it is not in
    // the total. A register that hid it would disagree with the paper.
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', orderNumber: 'ORD-001', grandTotal: 200 }),
      sale({ id: 'o2', orderNumber: 'ORD-002', grandTotal: 999, status: 'cancelled' }),
    ]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('ORD-002')).toBeTruthy());
    expect(within(screen.getByTestId('sales-day-total')).getByText('Rs. 200')).toBeTruthy();
  });

  it('adds up units per product across the day', async () => {
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', items: [item({ qty: 2 })] }),
      sale({ id: 'o2', orderNumber: 'ORD-002', items: [item({ qty: 3 })] }),
    ]);
    const screen = await renderScreen(<SalesScreen />);

    // The items-sold head counts the day; the product's own tile carries the
    // quantity beside its name.
    await waitFor(() => expect(screen.getByText('5 units · 1 product')).toBeTruthy());
    expect(screen.getByText('Milk Rusk')).toBeTruthy();
  });

  it('opens the whole product list rather than paging it', async () => {
    // Twelve fit before the grid has to be asked; the toggle says what is
    // behind it, because "did we sell any X" has no answer while it is closed.
    const items = Array.from({ length: 14 }, (_, i) =>
      item({ productId: `p${i}`, productName: `Product ${i}`, qty: 14 - i }),
    );
    mockGetOrders.mockResolvedValue([sale({ items })]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() =>
      expect(screen.getByText('Show all 14 products (+2 more)')).toBeTruthy(),
    );
    expect(screen.queryByText('Product 13')).toBeNull();

    await fireEvent.press(screen.getByTestId('sales-show-all-products'));

    await waitFor(() => expect(screen.getByText('Product 13')).toBeTruthy());
    expect(screen.getByText('Show fewer products')).toBeTruthy();
  });

  it('searches the products on a sale, not just the line it draws', async () => {
    // "which sale had the walnut cake on it" is the question this list is asked,
    // and the product name is not on the row.
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', orderNumber: 'ORD-001', items: [item({ productName: 'Milk Rusk' })] }),
      sale({
        id: 'o2',
        orderNumber: 'ORD-002',
        items: [item({ productId: 'p2', productName: 'Walnut Cake' })],
      }),
    ]);
    const screen = await renderScreen(<SalesScreen />);
    await waitFor(() => expect(screen.getByText('ORD-002')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('sales-search'), 'walnut');

    await waitFor(() => expect(screen.queryByText('ORD-001')).toBeNull());
    expect(screen.getByText('ORD-002')).toBeTruthy();
  });

  it('does not call a search with no matches an empty day', async () => {
    const screen = await renderScreen(<SalesScreen />);
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('sales-search'), 'zzzz');

    await waitFor(() => expect(screen.getByText('No sales found')).toBeTruthy());
    // The day's takings are still the day's takings.
    expect(screen.queryByText('No sales on this day')).toBeNull();
    expect(screen.getByTestId('sales-day-total')).toBeTruthy();
  });

  it('offers the till from an empty day, and only one control at a time', async () => {
    mockGetOrders.mockResolvedValue([]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('No sales on this day')).toBeTruthy());
    // The empty state carries the instruction; the FAB would be a second one.
    expect(screen.queryByTestId('new-sale')).toBeNull();

    await fireEvent.press(screen.getByText('New sale'));
    expect(mockNavigate).toHaveBeenCalledWith('NewSale');
  });

  it('opens the till from the corner once there are records', async () => {
    const screen = await renderScreen(<SalesScreen />);
    await waitFor(() => expect(screen.getByTestId('new-sale')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('new-sale'));
    expect(mockNavigate).toHaveBeenCalledWith('NewSale');
  });

  it('opens a sale in full', async () => {
    const screen = await renderScreen(<SalesScreen />);
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText(/^ORD-001, Rs\. 200/));

    await waitFor(() => expect(screen.getByTestId('sale-detail-items')).toBeTruthy());
    expect(screen.getByText('Rung up by Ayesha')).toBeTruthy();
  });
});

/**
 * The offline half.
 *
 * A sale written offline is the only copy of a transaction. The register is
 * where a cashier looks for it, and the two things it must never do are drop it
 * and dress it up as a server record.
 */
describe('sales still on the device', () => {
  it('lists a queued sale, marked as waiting and with no total', async () => {
    mockQueued.mockResolvedValue([
      {
        clientOperationId: 'op-1',
        createdAt: Date.parse('2026-08-28T09:40:00.000Z'),
        paymentMethod: 'cash',
        lineCount: 2,
        units: 5,
        queueStatus: 'pending',
      },
    ]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('Waiting to sync')).toBeTruthy());
    expect(screen.getByText(/Stored on this device/)).toBeTruthy();
    // No money on it: the payload carries no prices, and the server resolves
    // the rate at commit. A figure here would be one it never agreed to.
    expect(screen.getByText(/5 units · 2 lines · Cash/)).toBeTruthy();
    // And it is not in the day's money: the server sets the total when it syncs.
    expect(within(screen.getByTestId('sales-day-total')).getByText('Rs. 200')).toBeTruthy();
    expect(screen.getByText(/· 1 recorded$/)).toBeTruthy();
  });

  it('never draws a refused sale as one that is waiting', async () => {
    // A 409 is parked for a person. "Waiting to sync" tells a cashier to do
    // nothing, and doing nothing is how a refused sale goes missing until the
    // till is reconciled.
    mockQueued.mockResolvedValue([
      {
        clientOperationId: 'op-1',
        createdAt: Date.parse('2026-08-28T09:40:00.000Z'),
        paymentMethod: 'cash',
        lineCount: 1,
        units: 1,
        queueStatus: 'conflict',
      },
    ]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('Not accepted')).toBeTruthy());
    expect(screen.queryByText('Waiting to sync')).toBeNull();
    expect(screen.getByText(/waiting for a person/)).toBeTruthy();
  });

  it('shows the device is holding work even when the day cannot be loaded', async () => {
    // Empty is not absent, and neither is unreachable: a failed request must
    // not take the queued sale off the screen with it.
    mockGetOrders.mockRejectedValue(new Error('offline'));
    mockQueued.mockResolvedValue([
      {
        clientOperationId: 'op-1',
        createdAt: Date.parse('2026-08-28T09:40:00.000Z'),
        paymentMethod: 'cash',
        lineCount: 1,
        units: 1,
        queueStatus: 'pending',
      },
    ]);
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('Waiting to sync')).toBeTruthy());
    expect(screen.queryByText('No sales on this day')).toBeNull();
    // Nothing to sum, so nothing is claimed: a hero reading "Rs. 0" on a
    // request that failed states a quiet day as a fact.
    expect(screen.queryByTestId('sales-day-total')).toBeNull();
  });
});

/**
 * What the till hands back.
 *
 * The three-outcome rule, read at the other end of the wire: the same param that
 * `NewSaleScreen` navigates with has to become the right sentence here, and the
 * refusal must never be dressed as a queue.
 */
describe('the outcome of a sale just made', () => {
  it('confirms a synced sale', async () => {
    mockRouteParams = { outcome: 'synced' };
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('Sale completed.')).toBeTruthy());
    // Consumed, so returning to this tab cannot re-announce it.
    expect(mockSetParams).toHaveBeenCalledWith({ outcome: undefined, reason: undefined });
  });

  it('gives a queued sale its three lines', async () => {
    mockRouteParams = { outcome: 'queued' };
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() => expect(screen.getByText('Saved offline')).toBeTruthy());
    expect(screen.getByText(/stored on this device/)).toBeTruthy();
    expect(screen.getByText(/Status: Waiting to sync/)).toBeTruthy();
    expect(screen.queryByText('Sale completed.')).toBeNull();
  });

  it('repeats the server\'s own words on a refusal, and never says it will sync', async () => {
    mockRouteParams = { outcome: 'refused', reason: 'Cream roll: requested 5, available 2' };
    const screen = await renderScreen(<SalesScreen />);

    await waitFor(() =>
      expect(screen.getByText(/Cream roll: requested 5, available 2/)).toBeTruthy(),
    );
    expect(screen.getByText(/do not ring it up again/)).toBeTruthy();
    expect(screen.queryByText('Saved offline')).toBeNull();
    expect(screen.queryByText(/Waiting to sync/)).toBeNull();
  });
});

/**
 * The arithmetic on its own.
 *
 * A wrong figure here is wrong money on the screen a shift is reconciled from,
 * and none of these cases needs a renderer to state.
 */
describe('summariseDay', () => {
  it('excludes cancelled sales from every figure', () => {
    const day = summariseDay([
      sale({ grandTotal: 200, subtotal: 220, discountTotal: 20 }),
      sale({ id: 'o2', grandTotal: 500, subtotal: 500, status: 'cancelled' }),
    ]);

    expect(day.count).toBe(1);
    expect(day.total).toBe(200);
    expect(day.gross).toBe(220);
    expect(day.discount).toBe(20);
  });

  it('reads the PostgREST numeric string form rather than poisoning the sum', () => {
    // `numeric(14,2)` arrives as a string. `Number` on a malformed one turns the
    // whole register into "Rs. NaN"; `toNumber` costs it one row.
    const day = summariseDay([
      sale({ grandTotal: '200.50' as unknown as number }),
      sale({ id: 'o2', grandTotal: 'not-a-number' as unknown as number }),
    ]);

    expect(day.total).toBe(200.5);
  });

  it('ranks products by units and folds the same product across sales', () => {
    const day = summariseDay([
      sale({ items: [item({ qty: 2, lineTotal: 200 })] }),
      sale({
        id: 'o2',
        items: [
          item({ qty: 1, lineTotal: 100 }),
          item({ productId: 'p2', productName: 'Walnut Cake', qty: 4, lineTotal: 800 }),
        ],
      }),
    ]);

    expect(day.products.map(p => p.productName)).toEqual(['Walnut Cake', 'Milk Rusk']);
    expect(day.products[1]).toMatchObject({ qty: 3, revenue: 300 });
    expect(day.units).toBe(7);
  });

  it('keeps the four branch tenders in a fixed order, taken or not', () => {
    // Ranked by total, the card would reorder itself through the day and stop
    // being readable at a glance. Cash keeps its gross alongside its net,
    // because the drawer is counted before the discounts come off.
    const day = summariseDay([
      sale({ grandTotal: 200, subtotal: 260, paymentMethod: 'cash' }),
      sale({ id: 'o2', grandTotal: 900, subtotal: 900, paymentMethod: 'easypaisa' }),
      sale({ id: 'o3', grandTotal: 100, subtotal: 100, paymentMethod: 'cash' }),
    ]);

    expect(day.payments).toEqual([
      { method: 'cash', total: 300, gross: 360, count: 2 },
      { method: 'easypaisa', total: 900, gross: 900, count: 1 },
      { method: 'foodpanda', total: 0, gross: 0, count: 0 },
      { method: 'bank_account', total: 0, gross: 0, count: 0 },
    ]);
  });

  it('appends a tender the branch cannot ring up rather than losing its money', () => {
    // A branch has no way to sell as `staff`, but the row could still carry it —
    // and a total labelled as the day's must not quietly exclude one.
    const day = summariseDay([
      sale({ grandTotal: 200, paymentMethod: 'cash' }),
      sale({ id: 'o2', grandTotal: 50, subtotal: 50, paymentMethod: 'staff' }),
    ]);

    expect(day.payments.map(p => p.method)).toEqual([
      'cash',
      'easypaisa',
      'foodpanda',
      'bank_account',
      'staff',
    ]);
    expect(day.total).toBe(250);
  });
});

describe('matchesSale', () => {
  it('matches a product name, a customer and a receipt number', () => {
    const order = sale({
      orderNumber: 'ORD-042',
      customerName: 'Mrs Khan',
      items: [item({ productName: 'Walnut Cake' })],
    });

    expect(matchesSale(order, 'walnut')).toBe(true);
    expect(matchesSale(order, 'khan')).toBe(true);
    expect(matchesSale(order, '042')).toBe(true);
    expect(matchesSale(order, 'brioche')).toBe(false);
  });

  it('matches everything when nothing was typed', () => {
    expect(matchesSale(sale(), '')).toBe(true);
  });
});
