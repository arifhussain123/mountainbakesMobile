import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/catalogService', () => ({
  getStock: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
}));

jest.mock('@/api/services/productionService', () => ({
  getProductionBalances: jest.fn(),
}));

import * as catalogApi from '@/api/services/catalogService';
import * as productionApi from '@/api/services/productionService';
import { useAuthStore } from '@/state/authStore';
import { renderScreen } from '@/common/test-utils/render';
import { StockScreen } from '../StockScreen';

const getStock = catalogApi.getStock as jest.Mock;
const getProductionBalances = productionApi.getProductionBalances as jest.Mock;

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
  // The screen's filter chrome queries these three alongside the stock rows.
  // A bare jest.fn() resolves to undefined, which React Query rejects outright
  // ("Query data cannot be undefined") — the query lands in an error state and
  // the assertions below only pass because they never look at that part of the
  // screen. Resolving them empty keeps the filters in a real loaded state.
  (catalogApi.getProducts as jest.Mock).mockResolvedValue([]);
  (catalogApi.getCategories as jest.Mock).mockResolvedValue([]);
  (catalogApi.getBranches as jest.Mock).mockResolvedValue([]);
  // Twelve Milk Rusk approved and not yet delivered.
  getProductionBalances.mockResolvedValue({
    balances: [
      {
        branchId: 'b-1',
        branchName: 'Saddar',
        productId: 'p1',
        productName: 'Milk Rusk',
        pendingQty: 12,
        updatedAt: '2026-08-18T09:00:00.000Z',
      },
    ],
  });
});

describe('StockScreen', () => {
  it('shows the business date the SERVER used, not the device date', async () => {
    // The business day rolls at 2 AM, so an evening shift and the client's idea
    // of "today" can legitimately disagree.
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText(/business day 2026-08-18/)).toBeTruthy());
  });

  /**
   * The breakdown is behind a disclosure, and the headline is not.
   *
   * What this screen is opened for is "what have I got, and what is about to
   * run out" — product, balance and level. Opening / received / sold / returned
   * / adjusted explain *how* the balance got there, which is a second question
   * and a rarer one. Drawing the working under every row roughly doubled a
   * card's height, so a phone showed about four products instead of seven.
   */
  it('shows the balance without asking, and the working only when asked', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    // The screen lands on Low (see `HEALTH_LOW` in the screen). This fixture is
    // healthy, and what is under test here is the card, not the filter.
    await fireEvent.press(screen.getByTestId('stock-health-all'));

    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
    // Visible immediately: the balance.
    expect(screen.getByText('113')).toBeTruthy();
    // Not drawn until asked: the movements behind it.
    expect(screen.queryByText('Opening')).toBeNull();
    expect(screen.queryByText('-2')).toBeNull();

    await fireEvent.press(screen.getByTestId('stock-row-p1'));

    // opening + newQty − sold − returned + adjustment = balance
    await waitFor(() => expect(screen.getByText('Opening')).toBeTruthy());
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('-2')).toBeTruthy();
  });

  it('reports the disclosure state to a screen reader', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    // The screen lands on Low (see `HEALTH_LOW` in the screen). This fixture is
    // healthy, and what is under test here is the card, not the filter.
    await fireEvent.press(screen.getByTestId('stock-health-all'));

    await waitFor(() => expect(screen.getByTestId('stock-row-p1')).toBeTruthy());
    const row = screen.getByTestId('stock-row-p1');
    // A chevron pointing right or down is not available to a screen reader; the
    // expanded state is what carries it.
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));

    await fireEvent.press(row);
    await waitFor(() =>
      expect(screen.getByTestId('stock-row-p1').props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true }),
      ),
    );
  });

  /**
   * FlashList recycles row components. If the open state lived inside the card
   * it would travel to whichever product reused that instance, so it is keyed
   * by productId at the screen instead — this pins that.
   */
  it('expands only the row that was tapped', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [ROW, { ...ROW, productId: 'p2', productName: 'Cake Rusk', opening: 7, balance: 7 }],
    });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    // The screen lands on Low (see `HEALTH_LOW` in the screen). This fixture is
    // healthy, and what is under test here is the card, not the filter.
    await fireEvent.press(screen.getByTestId('stock-health-all'));

    await waitFor(() => expect(screen.getByText('Cake Rusk')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('stock-row-p2'));

    await waitFor(() => expect(screen.getAllByText('Opening')).toHaveLength(1));
    expect(screen.getByTestId('stock-row-p1').props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: false }),
    );
  });

  it('labels the stock level in words, not colour alone', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    // The screen lands on Low (see `HEALTH_LOW` in the screen). This fixture is
    // healthy, and what is under test here is the card, not the filter.
    await fireEvent.press(screen.getByTestId('stock-health-all'));

    await waitFor(() => expect(screen.getByText('In stock')).toBeTruthy());
  });

  /**
   * v6 lands screen 08 on Low because that is the reason to open it during a
   * shift. The cost is that a stock *count* — the other thing this list is read
   * for — starts one tap away, which is why All sits directly above the list
   * with its own total on it rather than behind a menu.
   */
  it('lands on Low and hides what is comfortably in stock', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [ROW, { ...ROW, productId: 'p2', productName: 'Cake Rusk', balance: 3 }],
    });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('Cake Rusk')).toBeTruthy());
    expect(screen.queryByText('Milk Rusk')).toBeNull();

    await fireEvent.press(screen.getByTestId('stock-health-all'));
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  });

  /**
   * A count says what tapping the chip would show, so it is measured after the
   * other axes — category and search — and before the one being counted.
   */
  it('counts both chips over what the other filters left', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [ROW, { ...ROW, productId: 'p2', productName: 'Cake Rusk', balance: 3 }],
    });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByLabelText('All, 2')).toBeTruthy());
    expect(screen.getByLabelText('Low, 1')).toBeTruthy();
  });

  /**
   * `moderate` is what `MBStockCard` labels "Low", so a Low filter that dropped
   * it would hide the rows visibly saying Low. The filter is every band the
   * shared `stockLevel` does not call `healthy`.
   */
  it('counts every band the shared scale does not call healthy', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [
        { ...ROW, productId: 'p1', productName: 'Out', balance: 0 },
        { ...ROW, productId: 'p2', productName: 'Critical', balance: 3 },
        { ...ROW, productId: 'p3', productName: 'Moderate', balance: 12 },
        { ...ROW, productId: 'p4', productName: 'Healthy', balance: 113 },
      ],
    });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByLabelText('Low, 3')).toBeTruthy());
    expect(screen.getByLabelText('All, 4')).toBeTruthy();
  });

  /** The emptiest shelf first — v6's urgency order. */
  it('puts the product closest to running out at the top', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [
        { ...ROW, productId: 'p1', productName: 'Plenty', balance: 113 },
        { ...ROW, productId: 'p2', productName: 'Some', balance: 12 },
        { ...ROW, productId: 'p3', productName: 'None', balance: 0 },
      ],
    });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    // The screen lands on Low (see `HEALTH_LOW` in the screen). This fixture is
    // healthy, and what is under test here is the card, not the filter.
    await fireEvent.press(screen.getByTestId('stock-health-all'));

    await waitFor(() => expect(screen.getByText('Plenty')).toBeTruthy());
    expect(screen.getAllByTestId(/^stock-row-/).map(node => node.props.testID)).toEqual([
      'stock-row-p3',
      'stock-row-p2',
      'stock-row-p1',
    ]);
  });

  /**
   * A shop with nothing low is not a shop with nothing in it, and reporting the
   * first as the second is how a healthy day reads as a broken screen.
   */
  it('says a healthy shop is healthy rather than empty', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('Everything is above the line')).toBeTruthy());
    expect(screen.queryByText('No stock recorded')).toBeNull();

    await fireEvent.press(screen.getByText('Show all stock'));
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  });

  it('flags an out-of-stock product', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ ...ROW, balance: 0 }],
    });
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);

    await waitFor(() => expect(screen.getByText('Out of stock')).toBeTruthy());
  });

  it('flags a critical balance below the shared threshold', async () => {
    getStock.mockResolvedValue({
      date: '2026-08-18',
      rows: [{ ...ROW, balance: 3 }],
    });
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

  /**
   * Waiting and Expected, and the one day they are true of.
   *
   * `production_balances` is what is outstanding NOW — it holds no history. So
   * the figure belongs to today's balance and to no other day's, and pairing it
   * with a back-dated one would produce an "Expected" describing a moment that
   * never existed.
   */
  it('shows what Production still owes, and what the shelf reaches with it', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    await fireEvent.press(screen.getByTestId('stock-health-all'));
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('stock-row-p1'));

    await waitFor(() => expect(screen.getByText('Waiting')).toBeTruthy());
    expect(screen.getByText('12')).toBeTruthy();
    // 113 on the shelf + 12 owed = 125, derived here and never sent.
    expect(screen.getByText('Expected')).toBeTruthy();
    expect(screen.getByText('125')).toBeTruthy();
  });

  it('drops both figures on a back-dated day, where they would describe nothing', async () => {
    signInAs('branch_manager', 'b-1');
    const screen = await renderScreen(<StockScreen />);
    await fireEvent.press(screen.getByTestId('stock-health-all'));
    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());

    await fireEvent.press(screen.getByText('Yesterday'));
    await waitFor(() => expect(getStock).toHaveBeenCalledWith(
      expect.objectContaining({ date: expect.any(String) }),
    ));

    await fireEvent.press(screen.getByTestId('stock-row-p1'));

    // The rest of the working is still there; only the two current-only cells go.
    await waitFor(() => expect(screen.getByText('Opening')).toBeTruthy());
    expect(screen.queryByText('Waiting')).toBeNull();
    expect(screen.queryByText('Expected')).toBeNull();
  });

});
