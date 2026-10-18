/**
 * @format
 */
import {
  DEFAULT_RETURN_SORT,
  RETURN_SORTS,
  RETURN_STOCK_PAGE_SIZE,
  buildReturnStockParams,
  describeShowing,
  pageCount,
  pagerSlots,
  resolveReturnWindow,
  returnWindowLabel,
  shortReturnRef,
} from '@/features/stock/returnStockList';

const base = {
  window: '90' as const,
  today: '2026-10-18',
  productId: null,
  status: 'all' as const,
  search: '',
  sort: DEFAULT_RETURN_SORT,
  page: 1,
};

describe('resolveReturnWindow', () => {
  it('"This month" runs from the 1st to today', () => {
    expect(resolveReturnWindow('month', '2026-10-18')).toEqual({ from: '2026-10-01', to: '2026-10-18' });
  });

  it('on the 1st, "This month" is that day alone — October never leaks into November', () => {
    expect(resolveReturnWindow('month', '2026-11-01')).toEqual({ from: '2026-11-01', to: '2026-11-01' });
  });

  it('N days is inclusive of today, across a month and a year boundary', () => {
    expect(resolveReturnWindow('7', '2026-10-18')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(resolveReturnWindow('30', '2027-01-10')).toEqual({ from: '2026-12-12', to: '2027-01-10' });
    expect(resolveReturnWindow('90', '2026-10-18')).toEqual({ from: '2026-07-21', to: '2026-10-18' });
  });

  it('labels the pill the way the mock does', () => {
    expect(returnWindowLabel('90')).toBe('Last · 90 days');
    expect(returnWindowLabel('month')).toBe('This month');
  });
});

describe('buildReturnStockParams', () => {
  it('sends the default view as the last 90 days, newest first, page one', () => {
    expect(buildReturnStockParams(base)).toEqual({
      from: '2026-07-21',
      to: '2026-10-18',
      sortBy: 'createdAt',
      sortDir: 'desc',
      limit: RETURN_STOCK_PAGE_SIZE,
      offset: 0,
    });
  });

  it('sends every filter to the server and leaves out the ones not set', () => {
    const qtyDesc = RETURN_SORTS.find((s) => s.key === 'qtyDesc')!;
    const params = buildReturnStockParams({ ...base, productId: 'p1', status: 'pending', search: '  lotus ', sort: qtyDesc, page: 3 });
    expect(params).toMatchObject({ productId: 'p1', status: 'pending', search: 'lotus', sortBy: 'qty', sortDir: 'desc', offset: 40 });
    expect(buildReturnStockParams(base)).not.toHaveProperty('status');
    expect(buildReturnStockParams({ ...base, search: '   ' })).not.toHaveProperty('search');
  });

  it('only ever asks for columns the server sorts by', () => {
    const allowed = ['createdAt', 'date', 'reviewedAt', 'productName', 'qty', 'status'];
    for (const s of RETURN_SORTS) expect(allowed).toContain(s.sortBy);
  });
});

describe('paging', () => {
  it('counts pages, never fewer than one', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(21)).toBe(2);
  });

  it('describes the rows in view', () => {
    expect(describeShowing(1, 57)).toBe('Showing 1–20 of 57');
    expect(describeShowing(3, 57)).toBe('Showing 41–57 of 57');
    expect(describeShowing(1, 0)).toBe('No returns');
  });

  it('keeps the pager to seven slots, with gaps marked', () => {
    expect(pagerSlots(1, 3)).toEqual([1, 2, 3]);
    expect(pagerSlots(1, 12)).toEqual([1, 2, 3, 4, 5, '…', 12]);
    expect(pagerSlots(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(pagerSlots(12, 12)).toEqual([1, '…', 8, 9, 10, 11, 12]);
    for (let p = 1; p <= 12; p++) expect(pagerSlots(p, 12).length).toBeLessThanOrEqual(7);
  });
});

it('shortReturnRef is the same 8-character reference Production shows', () => {
  expect(shortReturnRef('a1b2c3d4-0000-4000-8000-000000000000')).toBe('A1B2C3D4');
});
