import React from 'react';
import { waitFor, within } from '@testing-library/react-native';

/**
 * The closing read, and what it must never claim.
 *
 * Two things are worth testing without a renderer's help and are tested here
 * because they are the ways this screen could lie: that every figure is summed
 * from the rows drawn beneath it, and that a day nobody traded on is reported as
 * quiet rather than as broken — and the reverse, that a day whose reads failed
 * is never reported as quiet.
 */

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@/api/services/financeService', () => ({ getOrders: jest.fn() }));
jest.mock('@/api/services/expensesService', () => ({ getExpenses: jest.fn() }));
jest.mock('@/api/services/catalogService', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.', gstEnabled: false, gstRate: 0 })),
  getStock: jest.fn(async () => ({ date: '2026-08-28', rows: [] })),
}));

import { getOrders } from '@/api/services/financeService';
import { getExpenses } from '@/api/services/expensesService';
import type { Expense } from '@/shared/types/expense.types';
import type { Order, OrderItem } from '@/shared/types/order.types';
import { useAuthStore } from '@/state/authStore';
import { renderScreen } from '@/common/test-utils/render';
import { ClosingScreen } from '../ClosingScreen';

const mockGetOrders = getOrders as jest.Mock;
const mockGetExpenses = getExpenses as jest.Mock;

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

function expense(partial: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    expenseNumber: 'EXP-001',
    branchId: 'b-1',
    branchName: 'Saddar',
    date: '2026-08-28',
    category: 'Utilities',
    description: 'Electricity',
    paymentMethod: 'cash',
    amount: 300,
    remarks: '',
    createdBy: 'u1',
    createdByName: 'Ayesha',
    createdAt: '2026-08-28T10:00:00.000Z',
    ...partial,
  };
}

function signIn(): void {
  useAuthStore.setState({
    status: 'signedIn',
    claims: {
      userId: 'u1',
      email: 'a@b.com',
      role: 'branch_manager' as never,
      branchId: 'b-1',
      branchName: 'Saddar',
      mustChangePassword: false,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  signIn();
  mockGetOrders.mockResolvedValue([]);
  mockGetExpenses.mockResolvedValue([]);
});

describe('ClosingScreen', () => {
  it('sums takings and expenses from the rows, and nets them', async () => {
    // 1000 cash + 500 easypaisa taken; 300 spent.
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', subtotal: 1000, grandTotal: 1000, paymentMethod: 'cash' }),
      sale({ id: 'o2', subtotal: 500, grandTotal: 500, paymentMethod: 'easypaisa' }),
    ]);
    mockGetExpenses.mockResolvedValue([expense({ amount: 300 })]);

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.getByTestId('closing-kpi-takings')).toBeTruthy());
    /* Scoped to the tiles: takings also appears as the ledger's footer total,
       which is the point of the footer rather than a duplicate to assert around. */
    expect(within(screen.getByTestId('closing-kpi-takings')).getByText('Rs. 1,500')).toBeTruthy();
    expect(within(screen.getByTestId('closing-kpi-expenses')).getByText('Rs. 300')).toBeTruthy();
    expect(within(screen.getByTestId('closing-kpi-net')).getByText('Rs. 1,200')).toBeTruthy();
  });

  it('counts only cash toward the drawer', async () => {
    // The rule that survives the missing reconciliation: Easypaisa, Foodpanda
    // and bank transfers never reach a till drawer.
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', subtotal: 1000, grandTotal: 1000, paymentMethod: 'cash' }),
      sale({ id: 'o2', subtotal: 900, grandTotal: 900, paymentMethod: 'easypaisa' }),
      sale({ id: 'o3', subtotal: 700, grandTotal: 700, paymentMethod: 'foodpanda' }),
    ]);
    // A cash expense leaves the drawer; an easypaisa one never touched it.
    mockGetExpenses.mockResolvedValue([
      expense({ id: 'e1', amount: 250, paymentMethod: 'cash' }),
      expense({ id: 'e2', amount: 400, paymentMethod: 'easypaisa' }),
    ]);

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.getByTestId('closing-cash')).toBeTruthy());
    // 1000 cash in − 250 cash out = 750. Not 2600 in, and not 1350.
    expect(screen.getByText('Rs. 750')).toBeTruthy();
  });

  it('excludes a cancelled sale, which took no money', async () => {
    mockGetOrders.mockResolvedValue([
      sale({ id: 'o1', subtotal: 400, grandTotal: 400 }),
      sale({ id: 'o2', subtotal: 999, grandTotal: 999, status: 'cancelled' }),
    ]);

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.getByTestId('closing-kpi-takings')).toBeTruthy());
    expect(within(screen.getByTestId('closing-kpi-takings')).getByText('Rs. 400')).toBeTruthy();
    expect(screen.queryByText('Rs. 1,399')).toBeNull();
  });

  it('reports a quiet day as quiet rather than as broken', async () => {
    mockGetOrders.mockResolvedValue([]);
    mockGetExpenses.mockResolvedValue([]);

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.getByText('No trading on this day')).toBeTruthy());
  });

  it('does not report a failed read as a quiet day', async () => {
    // Both reads fail — the one case that is genuinely an error state.
    mockGetOrders.mockRejectedValue(new Error('offline'));
    mockGetExpenses.mockRejectedValue(new Error('offline'));

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.queryByTestId('closing-kpi-takings')).toBeNull());
    // "Nothing sold" and "we could not ask" are different screens.
    expect(screen.queryByText('No trading on this day')).toBeNull();
  });

  it('still shows the day when only one of the two reads fails', async () => {
    // Expenses failed; takings did not. Replacing the whole screen with a retry
    // would hide figures that loaded perfectly well.
    mockGetOrders.mockResolvedValue([sale({ subtotal: 600, grandTotal: 600 })]);
    mockGetExpenses.mockRejectedValue(new Error('offline'));

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.getByTestId('closing-kpi-takings')).toBeTruthy());
    expect(within(screen.getByTestId('closing-kpi-takings')).getByText('Rs. 600')).toBeTruthy();
  });

  it('says it is a read and not a lock, twice', async () => {
    mockGetOrders.mockResolvedValue([sale()]);

    const screen = await renderScreen(<ClosingScreen />);

    await waitFor(() => expect(screen.getByTestId('closing-footer-note')).toBeTruthy());
    // Verbatim from the mock in the header, and repeated where the reading ends.
    expect(screen.getAllByText(/End-of-day read · not a lock/).length).toBeGreaterThan(1);
  });
});
