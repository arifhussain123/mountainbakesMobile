import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/catalogApi', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));

import * as catalogApi from '@/services/api/catalogApi';
import { ApiError } from '@/services/api/errors';
import { renderScreen } from '@/test-utils/render';
import { ProductsScreen } from '../ProductsScreen';

const getProducts = catalogApi.getProducts as jest.Mock;
const getCategories = catalogApi.getCategories as jest.Mock;
const getSettings = catalogApi.getSettings as jest.Mock;

const renderProducts = () => renderScreen(<ProductsScreen />);

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

beforeEach(() => {
  jest.clearAllMocks();
  getCategories.mockResolvedValue([
    {
      id: 'c1',
      name: 'Rusks',
      slug: 'rusks',
      sortOrder: 0,
      isActive: true,
      createdAt: '',
    },
  ]);
  getSettings.mockResolvedValue({ currencySymbol: 'Rs.' });
});

describe('ProductsScreen', () => {
  it('renders products with formatted prices', async () => {
    getProducts.mockResolvedValue([PRODUCT]);
    const screen = await renderProducts();

    await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
    expect(screen.getByText('Rs. 250')).toBeTruthy();
    expect(screen.getByText('MB-001 · Rusks')).toBeTruthy();
  });

  it('renders numeric strings from PostgREST without NaN', async () => {
    // numeric(14,2) is serialised as a JSON string.
    getProducts.mockResolvedValue([{ ...PRODUCT, price: '1250.00' }]);
    const screen = await renderProducts();

    await waitFor(() => expect(screen.getByText('Rs. 1,250')).toBeTruthy());
  });

  it('requests only active, non-special products', async () => {
    getProducts.mockResolvedValue([]);
    await renderProducts();

    await waitFor(() => expect(getProducts).toHaveBeenCalled());
    const filters = getProducts.mock.calls[0][0];
    expect(filters.isActive).toBe(true);
    expect(filters.includeSpecial).toBeUndefined();
  });

  it('shows an empty state when nothing is returned', async () => {
    getProducts.mockResolvedValue([]);
    const screen = await renderProducts();

    await waitFor(() => expect(screen.getByText('No products found')).toBeTruthy());
  });

  it('shows a friendly error, not the raw server text', async () => {
    getProducts.mockRejectedValue(
      new ApiError({
        kind: 'authorization',
        message: 'Forbidden: requires one of [x]',
        status: 403,
      }),
    );
    const screen = await renderProducts();

    await waitFor(() => expect(screen.getByText("Couldn't load this")).toBeTruthy());
    expect(screen.getByText("You don't have permission to do this.")).toBeTruthy();
    expect(screen.queryByText(/Forbidden: requires/)).toBeNull();
  });

  it('debounces search rather than querying per keystroke', async () => {
    getProducts.mockResolvedValue([PRODUCT]);
    const screen = await renderProducts();
    await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(1));

    // Search collapses into the header, so it has to be opened before it can be
    // typed into — the button is the affordance staff actually tap.
    await fireEvent.press(screen.getByTestId('product-search-open'));
    const field = screen.getByTestId('product-search');
    await fireEvent.changeText(field, 'r');
    await fireEvent.changeText(field, 'ru');
    await fireEvent.changeText(field, 'rus');

    // The server does NOT cache free-text searches, so an un-debounced field
    // would issue one uncached query per keystroke.
    expect(getProducts).toHaveBeenCalledTimes(1);

    await waitFor(
      () => {
        const searched = getProducts.mock.calls.some(c => c[0]?.search === 'rus');
        expect(searched).toBe(true);
      },
      { timeout: 2000 },
    );
  });
});
