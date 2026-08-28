import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/catalogService', () => ({
  getStock: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
}));

// The write path itself is covered by useCreateStockReturn's own test and by
// the sync suite. What is under test here is the SCREEN's gate: that no return
// reaches that path until the confirm step has been taken.
const mockCreateReturn = jest.fn();
jest.mock('@/api/hooks/useReturnsApi', () => ({
  useCreateStockReturn: () => ({ createReturn: mockCreateReturn, isSaving: false }),
}));

import * as catalogApi from '@/api/services/catalogService';
import { useAuthStore } from '@/state/authStore';
import { renderScreen } from '@/common/test-utils/render';
import { StockReturnScreen } from '../StockReturnScreen';

const getStock = catalogApi.getStock as jest.Mock;

const ROW = {
  productId: 'p1',
  stockCode: 'STK-000001',
  productName: 'Milk Rusk',
  opening: 100,
  newQty: 0,
  sold: 0,
  returned: 0,
  adjustment: 0,
  balance: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
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
  getStock.mockResolvedValue({ date: '2026-08-18', rows: [ROW] });
  (catalogApi.getProducts as jest.Mock).mockResolvedValue([]);
  (catalogApi.getCategories as jest.Mock).mockResolvedValue([]);
  (catalogApi.getBranches as jest.Mock).mockResolvedValue([]);
  mockCreateReturn.mockResolvedValue({
    outcome: 'synced',
    clientOperationId: '0191-aaaa',
    businessDate: '2026-08-18',
  });
});

async function addOneUnit() {
  const screen = await renderScreen(<StockReturnScreen />);
  await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Return one more Milk Rusk'));
  return screen;
}

describe('StockReturnScreen', () => {
  it('does not move stock until the return is confirmed', async () => {
    // The submit button opens the sheet. A stock movement is append-only and
    // reversing one needs an admin correction, so the tap that starts the
    // transaction must be the second one, not the first.
    const screen = await addOneUnit();

    await fireEvent.press(screen.getByTestId('submit-return'));

    expect(mockCreateReturn).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-return-confirm')).toBeTruthy();
  });

  it('sends the return once confirmed, with its reason', async () => {
    const screen = await addOneUnit();
    await fireEvent.changeText(screen.getByTestId('return-reason'), 'Unsold at close');

    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

    await waitFor(() =>
      expect(mockCreateReturn).toHaveBeenCalledWith({
        items: [{ productId: 'p1', qty: 1 }],
        reason: 'Unsold at close',
      }),
    );
  });

  it('writes nothing when the confirm is backed out of', async () => {
    const screen = await addOneUnit();
    await fireEvent.press(screen.getByTestId('submit-return'));

    await fireEvent.press(screen.getByText('Go back'));

    expect(mockCreateReturn).not.toHaveBeenCalled();
  });

  it('names every product in the confirm, not just a total', async () => {
    // "1 product" is not something a person can check against the crate in
    // their hands; a named line with its count is.
    const screen = await addOneUnit();
    await fireEvent.press(screen.getByTestId('submit-return'));

    expect(screen.getByText('Return 1 unit?')).toBeTruthy();
    expect(screen.getAllByText('Milk Rusk').length).toBeGreaterThan(1);
  });

  it('caps the quantity at the balance the branch actually holds', async () => {
    // The server refuses an overdraw with a 409; catching it here means the
    // branch is told before submitting rather than after a round trip.
    const screen = await addOneUnit();
    const plus = screen.getByLabelText('Return one more Milk Rusk');
    await fireEvent.press(plus);
    await fireEvent.press(plus);
    await fireEvent.press(plus); // 4th — balance is 3

    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

    await waitFor(() =>
      expect(mockCreateReturn).toHaveBeenCalledWith({
        items: [{ productId: 'p1', qty: 3 }],
        reason: '',
      }),
    );
  });

  it('keeps the lines when the return is only queued', async () => {
    // A queued return has moved no units. Clearing the form would tell the
    // branch it was done while the stock is still on their shelf.
    mockCreateReturn.mockResolvedValue({
      outcome: 'queued',
      clientOperationId: '0191-bbbb',
      businessDate: '2026-08-18',
    });
    const screen = await addOneUnit();

    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

    await waitFor(() => expect(mockCreateReturn).toHaveBeenCalled());
    // The footer only renders while a line carries a quantity.
    expect(screen.getByTestId('submit-return')).toBeTruthy();
  });
});
