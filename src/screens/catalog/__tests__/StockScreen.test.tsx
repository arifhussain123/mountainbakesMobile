import React from 'react';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/catalogApi', () => ({
  getStock: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
}));

import * as catalogApi from '@/services/api/catalogApi';
import { useAuthStore } from '@/store/authStore';
import { renderScreen } from '@/test-utils/render';
import { StockScreen } from '../StockScreen';

const getStock = catalogApi.getStock as jest.Mock;

function signInAs(role: string, branchId: string | null) {
  useAuthStore.setState({
    status: 'signedIn',
    claims: {
      userId: 'u1',
      email: 'a@b.com',
      role: role as never,
      branchId,
      branchName: branchId ? 'Saddar' : null,
      mustChangePassword: false,
    },
  });
}

const ROW = {
  productId: 'p1',
  stockCode: 'STK-000001',
  productName: 'Milk Rusk',
  opening: 100,
  newQty: 50,
  sold: 30,
  returned: 5,
  adjustment: -2,
  balance: 113,
};

beforeEach(() => {
  jest.clearAllMocks();
  getStock.mockResolvedValue({ date: '2026-08-18', rows: [ROW] });
});

describe('StockScreen', () => {
  it('shows the business date the SERVER used, not the device date', async () => {
    // The business day rolls at 2 AM, so an evening shift and the client's idea
    // of "today" can legitimately disagree.
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText(/business day 2026-08-18/)).toBeTruthy());
  });

  it('renders the movement breakdown that reconciles to the balance', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    // opening + newQty − sold − returned + adjustment = balance
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
    expect(screen.getByText('113')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('-2')).toBeTruthy();
  });

  it('labels the stock level in words, not colour alone', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    await waitFor(() => expect(screen.getByText('In stock')).toBeTruthy());
  });

  it('flags an out-of-stock product', async () => {
    getStock.mockResolvedValue({ date: '2026-08-18', rows: [{ ...ROW, balance: 0 }] });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('Out of stock')).toBeTruthy());
  });

  it('flags a critical balance below the shared threshold', async () => {
    getStock.mockResolvedValue({ date: '2026-08-18', rows: [{ ...ROW, balance: 3 }] });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('Critical')).toBeTruthy());
  });

  it('does not send a branchId for a branch role', async () => {
    // Branch roles are scoped server-side to their own branch.
    signInAs('branch_user', 'b-1');
    await renderScreen(<StockScreen />);

    await waitFor(() => expect(getStock).toHaveBeenCalled());
    expect(getStock.mock.calls[0][0].branchId).toBeNull();
  });

  it('asks an admin to choose a branch instead of firing a 400', async () => {
    // The endpoint answers 400 "Branch context required" with no branch, which
    // would surface as an error the user cannot act on.
    signInAs('super_admin', null);
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('Choose a branch')).toBeTruthy());
    expect(getStock).not.toHaveBeenCalled();
  });

  it('shows an empty state when the day has no stock rows', async () => {
    getStock.mockResolvedValue({ date: '2026-08-18', rows: [] });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('No stock recorded')).toBeTruthy());
  });
});
