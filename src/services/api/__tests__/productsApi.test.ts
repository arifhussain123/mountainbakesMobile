jest.mock('../client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { api } from '../client';
import {
  changePrice,
  createProduct,
  getPriceHistory,
  getProduct,
  setProductActive,
  updateProduct,
} from '../productsApi';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPut = api.put as jest.Mock;

/**
 * The wire contract for product administration, and one business rule.
 *
 * **Changing a price must not alter a historical sale or order.** The client's
 * share of that is narrow but real: an edit must never carry a price, and a
 * price must only ever travel to the versioned endpoint. Both are asserted here
 * because both are one careless spread away from being untrue, and neither would
 * fail loudly — `PUT` strips `price` server-side, so a regression looks like an
 * edit that silently did nothing rather than an error.
 */

beforeEach(() => jest.clearAllMocks());

describe('the price rule', () => {
  it('never sends a price on an edit', async () => {
    await updateProduct('p1', { name: 'Rusk', costPrice: 40 });

    expect(mockPut).toHaveBeenCalledWith('/api/products/p1', { name: 'Rusk', costPrice: 40 });
    const [, body] = mockPut.mock.calls[0];
    expect(Object.keys(body)).not.toContain('price');
  });

  it('routes a price change to the versioned endpoint, never to the product', async () => {
    mockPost.mockResolvedValue({ status: 'active', versionNumber: 3 });

    await changePrice('p1', { newPrice: 120, effectiveDate: '2026-08-19', reason: 'Flour cost' });

    // Two segments — the only path that records history and an effective date.
    expect(mockPost).toHaveBeenCalledWith('/api/products/p1/price', {
      newPrice: 120,
      effectiveDate: '2026-08-19',
      reason: 'Flour cost',
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('deactivates rather than deleting, so historical rows keep their product', async () => {
    await setProductActive('p1', false);

    expect(mockPut).toHaveBeenCalledWith('/api/products/p1', { isActive: false });
    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe('wire contract', () => {
  it('unwraps a single product', async () => {
    mockGet.mockResolvedValue({ product: { id: 'p1', name: 'Rusk' } });

    await expect(getProduct('p1')).resolves.toEqual({ id: 'p1', name: 'Rusk' });
    expect(mockGet).toHaveBeenCalledWith('/api/products/p1');
  });

  it('returns the created id, name and price', async () => {
    mockPost.mockResolvedValue({ id: 'p9', name: 'Rusk', price: 100 });

    await expect(
      createProduct({
        name: 'Rusk',
        categoryId: 'c1',
        sku: 'RUSK-1',
        price: 100,
        costPrice: 60,
        description: '',
      }),
    ).resolves.toEqual({ id: 'p9', name: 'Rusk', price: 100 });
  });

  /**
   * The prefix matters: `/api/products/price/...` is registered before the
   * products router precisely so it never resolves as `GET /api/products/:id`
   * with an id of "price".
   */
  it('reads history from the price prefix, filtered by product', async () => {
    mockGet.mockResolvedValue({ history: [{ id: 'h1' }], total: 1 });

    await expect(getPriceHistory('p1')).resolves.toEqual([{ id: 'h1' }]);
    expect(mockGet).toHaveBeenCalledWith('/api/products/price/history', {
      params: { limit: '100', productId: 'p1' },
    });
  });

  it('asks for the whole trail when no product is named', async () => {
    mockGet.mockResolvedValue({ history: [], total: 0 });

    await getPriceHistory();
    expect(mockGet).toHaveBeenCalledWith('/api/products/price/history', {
      params: { limit: '100' },
    });
  });

  it('survives a body with no history key rather than returning undefined', async () => {
    mockGet.mockResolvedValue({});
    await expect(getPriceHistory('p1')).resolves.toEqual([]);
  });
});
