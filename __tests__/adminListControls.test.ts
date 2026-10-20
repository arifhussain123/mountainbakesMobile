/**
 * @format
 */
import {
  activeChips,
  chipLabel,
  defaultSortDir,
  parseSortParam,
  rangeChipLabel,
  rangeSideChips,
  searchChipLabel,
  showClearAll,
  sortDirLabel,
  sortRows,
  sortSummary,
  toSortPair,
  toSortParam,
  type SortField,
} from '@/features/admin/utils/listControls';
import { clampYmd, dateToHm, dateToYmd, hmToDate, ymdToDate } from '@/shared/ui/DateField/dateFieldValue';

interface Row {
  name: string | null;
  qty: number | null;
  date: string;
}

const rows: Row[] = [
  { name: 'Item 10', qty: 5, date: '2026-10-02' },
  { name: 'item 9', qty: null, date: '2026-10-01' },
  { name: null, qty: 20, date: '2026-10-03' },
  { name: 'Apple', qty: 5, date: '2026-09-30' },
];

const fields: SortField<Row>[] = [
  { key: 'name', label: 'Name', kind: 'text', value: (r) => r.name },
  { key: 'qty', label: 'Qty', kind: 'number', value: (r) => r.qty },
  { key: 'date', label: 'Date', kind: 'date', value: (r) => r.date },
];

describe('sort helpers', () => {
  it('formats and parses the Data Engine sort param', () => {
    expect(toSortParam(null)).toBeUndefined();
    expect(toSortParam({ key: 'businessDate', dir: 'desc' })).toBe('businessDate:desc');
    expect(parseSortParam('name:asc')).toEqual({ key: 'name', dir: 'asc' });
    expect(parseSortParam('name:up')).toBeNull();
    expect(parseSortParam('')).toBeNull();
    expect(parseSortParam(undefined)).toBeNull();
  });

  it('splits into the sortBy / sortDir pair, or nothing for the default order', () => {
    expect(toSortPair(null)).toEqual({});
    expect(toSortPair({ key: 'loginAt', dir: 'asc' })).toEqual({ sortBy: 'loginAt', sortDir: 'asc' });
  });

  it('words each direction by what the column holds', () => {
    expect(sortDirLabel('text', 'asc')).toBe('A–Z');
    expect(sortDirLabel('text', 'desc')).toBe('Z–A');
    expect(sortDirLabel('number', 'asc')).toBe('Low → high');
    expect(sortDirLabel('number', 'desc')).toBe('High → low');
    expect(sortDirLabel('date', 'desc')).toBe('Newest first');
    expect(sortDirLabel(undefined, 'asc')).toBe('A–Z');
  });

  it('starts figures and dates biggest / newest first, text A–Z', () => {
    expect(defaultSortDir('number')).toBe('desc');
    expect(defaultSortDir('date')).toBe('desc');
    expect(defaultSortDir('text')).toBe('asc');
    expect(defaultSortDir(undefined)).toBe('asc');
  });

  it('summarises the picked sort, or names the default order', () => {
    expect(sortSummary(null, fields, 'Newest first')).toBe('Newest first');
    expect(sortSummary({ key: 'qty', dir: 'asc' }, fields, 'x')).toBe('Qty · Low → high');
    expect(sortSummary({ key: 'gone', dir: 'asc' }, fields, 'Default order')).toBe('Default order');
  });

  it('leaves the order alone with no sort or an unknown key, without mutating the input', () => {
    const copy = [...rows];
    expect(sortRows(rows, null, fields)).toEqual(rows);
    expect(sortRows(rows, { key: 'nope', dir: 'asc' }, fields)).toEqual(rows);
    expect(rows).toEqual(copy);
  });

  it('sorts text case-insensitively with digits read as numbers, blanks last both ways', () => {
    expect(sortRows(rows, { key: 'name', dir: 'asc' }, fields).map((r) => r.name)).toEqual(['Apple', 'item 9', 'Item 10', null]);
    expect(sortRows(rows, { key: 'name', dir: 'desc' }, fields).map((r) => r.name)).toEqual(['Item 10', 'item 9', 'Apple', null]);
  });

  it('sorts figures as numbers, keeping ties in their original order and blanks last', () => {
    expect(sortRows(rows, { key: 'qty', dir: 'asc' }, fields).map((r) => r.name)).toEqual(['Item 10', 'Apple', null, 'item 9']);
    expect(sortRows(rows, { key: 'qty', dir: 'desc' }, fields).map((r) => r.name)).toEqual([null, 'Item 10', 'Apple', 'item 9']);
  });

  it('sorts ISO dates in calendar order', () => {
    expect(sortRows(rows, { key: 'date', dir: 'asc' }, fields).map((r) => r.date)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(sortRows(rows, { key: 'date', dir: 'desc' }, fields)[0].date).toBe('2026-10-03');
  });

  it('sorts booleans false before true ascending', () => {
    const flags = [{ on: true }, { on: false }];
    const f: SortField<{ on: boolean }>[] = [{ key: 'on', label: 'On', value: (r) => r.on }];
    expect(sortRows(flags, { key: 'on', dir: 'asc' }, f).map((r) => r.on)).toEqual([false, true]);
  });
});

describe('active-filter chips', () => {
  const noop = () => undefined;

  it('words chips as the web ActiveFilters does', () => {
    expect(chipLabel('Status', 'Delivered')).toBe('Status: Delivered');
    expect(searchChipLabel('  cake ')).toBe('Search: “cake”');
    expect(rangeChipLabel('Date', '2026-10-01', '2026-10-07')).toBe('Date: 2026-10-01 – 2026-10-07');
    expect(rangeChipLabel('Date', '2026-10-01', '2026-10-01')).toBe('Date: 2026-10-01');
    expect(rangeChipLabel('Date', '2026-10-01', '2026-10-07', (v) => v.slice(5))).toBe('Date: 10-01 – 10-07');
  });

  it('gives one chip per side of a range, "from" and "to", skipping blank sides', () => {
    const removeFrom = jest.fn();
    const removeTo = jest.fn();
    const chips = rangeSideChips('totalOrders', 'Orders', { from: '5', to: '10' }, { from: removeFrom, to: removeTo });
    expect(chips.map((c) => [c.key, c.label])).toEqual([
      ['totalOrders.gte', 'Orders from 5'],
      ['totalOrders.lte', 'Orders to 10'],
    ]);
    chips[1].onRemove();
    expect(removeTo).toHaveBeenCalled();
    expect(removeFrom).not.toHaveBeenCalled();
    expect(rangeSideChips('x', 'X', { from: ' ', to: null }, { from: noop, to: noop })).toEqual([]);
    expect(rangeSideChips('d', 'Customer since', { to: '2026-10-20' }, { from: noop, to: noop }, () => '20 Oct 2026')[0].label).toBe(
      'Customer since to 20 Oct 2026',
    );
  });

  it('drops the inactive entries and flattens range chips', () => {
    const chips = activeChips([
      false,
      null,
      undefined,
      { key: 'a', label: 'A: 1', onRemove: noop },
      [
        { key: 'b.gte', label: 'B from 1', onRemove: noop },
        { key: 'b.lte', label: 'B to 2', onRemove: noop },
      ],
    ]);
    expect(chips.map((c) => c.key)).toEqual(['a', 'b.gte', 'b.lte']);
  });

  it('offers Clear once there are two or more chips, as the web does', () => {
    expect(showClearAll(0)).toBe(false);
    expect(showClearAll(1)).toBe(false);
    expect(showClearAll(2)).toBe(true);
  });
});

describe('date picker values', () => {
  it('reads a YYYY-MM-DD day as local midnight and writes it back unchanged', () => {
    const d = ymdToDate('2026-10-20')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 20, 0]);
    expect(dateToYmd(d)).toBe('2026-10-20');
    expect(dateToYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('rejects malformed and impossible days', () => {
    expect(ymdToDate('')).toBeNull();
    expect(ymdToDate(null)).toBeNull();
    expect(ymdToDate('20-10-2026')).toBeNull();
    expect(ymdToDate('2026-02-31')).toBeNull();
  });

  it('reads HH:mm (and HH:mm:ss) and writes 24-hour HH:mm', () => {
    const base = new Date(2026, 9, 20, 15, 0);
    const t = hmToDate('08:05', base)!;
    expect([t.getHours(), t.getMinutes()]).toEqual([8, 5]);
    expect(dateToHm(t)).toBe('08:05');
    expect(dateToHm(hmToDate('23:59:00', base)!)).toBe('23:59');
    expect(hmToDate('24:00')).toBeNull();
    expect(hmToDate('7pm')).toBeNull();
  });

  it('clamps a day into its bounds', () => {
    expect(clampYmd('2026-10-25', '2026-10-01', '2026-10-20')).toBe('2026-10-20');
    expect(clampYmd('2026-09-25', '2026-10-01', '2026-10-20')).toBe('2026-10-01');
    expect(clampYmd('2026-10-10', null, undefined)).toBe('2026-10-10');
  });
});
