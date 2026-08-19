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
import { getCategories, getProducts, getStock } from '../catalogApi';

const mockGet = api.get as jest.Mock;

/**
 * These pin the wire contract: the exact paths, the exact query-param names, and
 * the resource-keyed unwrapping. The API has no `{success, data}` envelope, so a
 * wrong key silently yields undefined rather than a type error at runtime.
 */

beforeEach(() => jest.clearAllMocks());

describe('getProducts', () => {
  it('unwraps the resource-keyed body', async () => {
    mockGet.mockResolvedValue({ products: [{ id: 'p1', name: 'Rusk' }], total: 1 });

    await expect(getProducts()).resolves.toEqual([{ id: 'p1', name: 'Rusk' }]);
    expect(mockGet).toHaveBeenCalledWith('/api/products', { params: {} });
  });

  it('returns an empty array when the key is absent, never undefined', async () => {
    mockGet.mockResolvedValue({});
    await expect(getProducts()).resolves.toEqual([]);
  });

  it('excludes special products by default', async () => {
    // Special products are auto-created for a branch's one-off order item. They
    // are active so stock works, but must never appear in a catalogue picker.
    mockGet.mockResolvedValue({ products: [] });
    await getProducts({ search: 'cake' });

    const params = mockGet.mock.calls[0][1].params;
    expect(params).not.toHaveProperty('includeSpecial');
  });

  it('opts in to special products only when asked', async () => {
    mockGet.mockResolvedValue({ products: [] });
    await getProducts({ includeSpecial: true });
    expect(mockGet.mock.calls[0][1].params.includeSpecial).toBe('true');
  });

  it('sends filters under the exact param names the server reads', async () => {
    mockGet.mockResolvedValue({ products: [] });
    await getProducts({ search: 'rusk', categoryId: 'c1', isActive: true });

    expect(mockGet.mock.calls[0][1].params).toEqual({
      search: 'rusk',
      categoryId: 'c1',
      isActive: 'true',
    });
  });

  it('omits empty filters rather than sending blanks', async () => {
    mockGet.mockResolvedValue({ products: [] });
    await getProducts({ search: '', categoryId: undefined });
    expect(mockGet.mock.calls[0][1].params).toEqual({});
  });

  it('sends isActive=false explicitly, not as an omission', async () => {
    mockGet.mockResolvedValue({ products: [] });
    await getProducts({ isActive: false });
    expect(mockGet.mock.calls[0][1].params.isActive).toBe('false');
  });
});

describe('getCategories', () => {
  it('unwraps `categories`', async () => {
    mockGet.mockResolvedValue({ categories: [{ id: 'c1', name: 'Breads' }] });
    await expect(getCategories()).resolves.toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith('/api/products/categories');
  });
});

describe('getStock', () => {
  it('returns the date alongside the rows', async () => {
    // The server echoes the business date it actually used — the app must show
    // that rather than its own idea of "today", because the day rolls at 2 AM.
    mockGet.mockResolvedValue({ date: '2026-08-18', rows: [{ productId: 'p1' }] });

    const result = await getStock();
    expect(result.date).toBe('2026-08-18');
    expect(result.rows).toHaveLength(1);
  });

  it('sends no branchId when the caller is server-scoped', async () => {
    // Branch roles are scoped server-side; sending a branchId would be ignored
    // at best and wrong at worst.
    mockGet.mockResolvedValue({ date: '2026-08-18', rows: [] });
    await getStock({ branchId: null });
    expect(mockGet).toHaveBeenCalledWith('/api/stock', { params: {} });
  });

  it('sends branchId and date when supplied', async () => {
    mockGet.mockResolvedValue({ date: '2026-08-17', rows: [] });
    await getStock({ branchId: 'b-1', date: '2026-08-17' });
    expect(mockGet.mock.calls[0][1].params).toEqual({ branchId: 'b-1', date: '2026-08-17' });
  });
});
