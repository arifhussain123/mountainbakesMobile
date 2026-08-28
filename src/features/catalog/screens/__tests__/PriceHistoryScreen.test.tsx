import React from 'react';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/productsService', () => ({
  getProduct: jest.fn(),
  getPriceHistory: jest.fn(),
}));
jest.mock('@/api/services/catalogService', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.' })),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { productId: 'p1' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

import { getPriceHistory, getProduct } from '@/api/services/productsService';
import { renderScreen } from '@/common/test-utils/render';
import { PriceHistoryScreen } from '../PriceHistoryScreen';

const mockHistory = getPriceHistory as jest.Mock;
const mockProduct = getProduct as jest.Mock;

/**
 * The price trail, and specifically the two ways it can lie about money.
 *
 * Every monetary column on the server is `numeric(14,2)`, and PostgREST
 * serialises `numeric` as a JSON **string**. The fields are nevertheless typed
 * `number` in `PriceHistoryDoc`, so TypeScript cannot see the difference and the
 * runtime value is whatever the wire sent. Both cases below are written with
 * string amounts on purpose — that is the shape this screen actually receives.
 */

/** Rs. 1,250 → Rs. 90. A cut, and a large one. */
const CUT = {
  id: 'h2',
  productId: 'p1',
  priceNumber: 'PR-0002',
  versionNumber: 2,
  oldPrice: '1250.00',
  newPrice: '90.00',
  effectiveDate: '2026-08-18',
  status: 'active',
  source: 'manual',
  changedByName: 'Ayesha',
  reason: '',
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockProduct.mockResolvedValue({ id: 'p1', name: 'Milk Rusk' });
  mockHistory.mockResolvedValue([CUT]);
});

describe('PriceHistoryScreen', () => {
  /**
   * The regression this file exists for. `newPrice > oldPrice` on the raw fields
   * is a **lexicographic** comparison when both are strings, and `'90.00' >
   * '1250.00'` is true because '9' sorts after '1'. The row then renders a price
   * cut in the success colour, on the one screen whose entire job is showing
   * which way a price moved. Asserted through the accessibility label because
   * the direction is carried by colour, which is not queryable — and a figure a
   * sighted user reads from a colour is one a screen-reader user reads from here.
   */
  it('reads a cut as a cut when the amounts arrive as strings', async () => {
    const screen = await renderScreen(<PriceHistoryScreen />);

    await waitFor(() => expect(screen.getByLabelText(/Version 2/)).toBeTruthy());
    expect(screen.getByLabelText(/Rs\. 1,250 to Rs\. 90/)).toBeTruthy();
  });

  /**
   * Both figures in a row go through the same formatter. The new price has
   * always rendered through `MBMoney`; the old one was interpolated raw, so a
   * wire value of "1250.00" printed as `Rs. 1250.00` immediately beside
   * `Rs. 90` — same row, same currency, two different notations.
   */
  it('groups the superseded price the same way as the current one', async () => {
    const screen = await renderScreen(<PriceHistoryScreen />);

    await waitFor(() => expect(screen.getByText('was Rs. 1,250')).toBeTruthy());
    expect(screen.queryByText('was Rs. 1250.00')).toBeNull();
  });
});
