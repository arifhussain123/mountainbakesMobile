/**
 * @format
 */
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_KEY, defaultDirectionFor } from '@/features/stock/components/StockSortSheet';

describe('defaultDirectionFor', () => {
  it('defaults Balance to high-to-low (descending)', () => {
    expect(defaultDirectionFor('balance')).toBe('desc');
  });

  it('defaults Product name to A-Z (ascending)', () => {
    expect(defaultDirectionFor('productName')).toBe('asc');
  });

  it('defaults ID to ascending', () => {
    expect(defaultDirectionFor('stockCode')).toBe('asc');
  });

  it('defaults every numeric movement field to descending', () => {
    expect(defaultDirectionFor('opening')).toBe('desc');
    expect(defaultDirectionFor('newQty')).toBe('desc');
    expect(defaultDirectionFor('sold')).toBe('desc');
    expect(defaultDirectionFor('returned')).toBe('desc');
    expect(defaultDirectionFor('adjustment')).toBe('desc');
  });
});

describe('default sort constants', () => {
  it('the screen opens sorted by Balance, high to low', () => {
    expect(DEFAULT_SORT_KEY).toBe('balance');
    expect(DEFAULT_SORT_DIRECTION).toBe('desc');
  });
});
