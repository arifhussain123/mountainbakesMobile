/**
 * @format
 */
import type { StockRow } from '@/api';
import { withExpectedBalance } from '@/features/stock/calculations';
import { stockBalanceTone, stockCardColumns } from '@/features/stock/stockCardColumns';

function row(overrides: Partial<StockRow> = {}): StockRow {
  return {
    productId: 'p1',
    stockCode: 'STK-000001',
    productName: 'Cream Puff',
    isActive: true,
    opening: 0,
    newQty: 0,
    sold: 0,
    returned: 0,
    adjustment: 0,
    balance: 0,
    ...overrides,
  };
}

describe('stockCardColumns', () => {
  it('lists the seven columns in the fixed order with their labels', () => {
    const [withDemand] = withExpectedBalance([row()], new Map());
    expect(stockCardColumns(withDemand).map((c) => c.label)).toEqual([
      'Opening Stock',
      'New Stock',
      'Sold',
      'Return',
      'Adjust',
      'Waiting',
      'Expected',
    ]);
  });

  it('shows the row’s own figures — sold/returned as negatives, expected = balance + waiting', () => {
    // 20 + 10 - 6 - 1 + 2 = 25
    const [withDemand] = withExpectedBalance(
      [row({ opening: 20, newQty: 10, sold: 6, returned: 1, adjustment: 2, balance: 25 })],
      new Map([['p1', 4]]),
    );
    const columns = stockCardColumns(withDemand);
    expect(columns.map((c) => c.value)).toEqual(['20', '+10', '-6', '-1', '+2', '4', '29']);
    expect(columns.map((c) => c.tone)).toEqual(['neutral', 'positive', 'negative', 'negative', 'positive', 'neutral', 'neutral']);
  });

  it('renders zero movements as plain "0" in the neutral tone', () => {
    const [withDemand] = withExpectedBalance([row({ opening: 5, balance: 5 })], new Map());
    const columns = stockCardColumns(withDemand);
    expect(columns.slice(1, 5).map((c) => c.value)).toEqual(['0', '0', '0', '0']);
    expect(columns.slice(1, 5).every((c) => c.tone === 'neutral')).toBe(true);
  });

  it('flags a negative level or adjustment in red', () => {
    const [withDemand] = withExpectedBalance([row({ opening: -2, adjustment: -3, balance: -5 })], new Map());
    const columns = stockCardColumns(withDemand);
    expect(columns[0].tone).toBe('negative');
    expect(columns[4]).toMatchObject({ value: '-3', tone: 'negative' });
    expect(columns[6]).toMatchObject({ value: '-5', tone: 'negative' });
    expect(stockBalanceTone(-5)).toBe('negative');
    expect(stockBalanceTone(12)).toBe('neutral');
  });
});
