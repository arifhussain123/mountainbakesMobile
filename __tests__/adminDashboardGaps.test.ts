/**
 * @format
 */
import type { ProductionCurrentStockRow } from '@/api/types';
import type { AppHeaderAction } from '@/shared/ui';
import { composeAdminHeaderActions, headerActionBudget } from '@/features/admin/utils/adminHeaderActions';
import {
  RECORD_INFO,
  RECORD_REFERENCE_KIND,
  bucketLabel,
  deltaDisplay,
  filterStockRows,
  heatCell,
  pctLabel,
  planCounts,
  planCoverage,
  rangeLabel,
  recordAuditLine,
  recordDetailError,
  recordsRangeText,
  toggleBranch,
  trendPoints,
  whenLabel,
} from '@/features/admin/utils/dashboardGaps';

const noop = () => {};
const act = (icon: AppHeaderAction['icon'], label = icon): AppHeaderAction => ({ icon, onPress: noop, accessibilityLabel: label });

describe('Live Production plan coverage', () => {
  it('is covered when output alone meets demand', () => {
    expect(planCoverage({ demand: 10, produced: 12, stock: 0 })).toEqual({ pct: 120, balance: 2, tone: 'good', label: 'Covered' });
  });
  it('comes from stock when only the shelf closes the gap', () => {
    expect(planCoverage({ demand: 10, produced: 6, stock: 5 })).toMatchObject({ tone: 'warn', label: 'From stock', balance: 1 });
  });
  it('is short by what is still missing', () => {
    expect(planCoverage({ demand: 1200, produced: 100, stock: 50 })).toMatchObject({ tone: 'bad', label: 'Short 1,050', balance: -1050, pct: 13 });
  });
  it('counts no demand as fully covered', () => {
    expect(planCoverage({ demand: 0, produced: 0, stock: 0 })).toMatchObject({ pct: 100, tone: 'good' });
  });
  it('counts the three badges', () => {
    expect(
      planCounts([
        { demand: 5, produced: 5, stock: 0 },
        { demand: 5, produced: 1, stock: 9 },
        { demand: 5, produced: 0, stock: 0 },
        { demand: 5, produced: 0, stock: 1 },
      ]),
    ).toEqual({ good: 1, warn: 1, bad: 2 });
  });
});

describe('Live Production labels', () => {
  it('labels buckets as the web axis does', () => {
    expect(bucketLabel('2026-10-14T09', 'hour')).toBe('9a');
    expect(bucketLabel('2026-10-14T15', 'hour')).toBe('3p');
    expect(bucketLabel('2026-10-14', 'day')).toBe('Wed 14');
    expect(bucketLabel('2026-10-12', 'week')).toBe('w/c Oct 12');
    expect(bucketLabel('nonsense', 'day')).toBe('nonsense');
  });
  it('names a window, or one day', () => {
    expect(rangeLabel('2026-10-12', '2026-10-18')).toBe('Oct 12 to Oct 18');
    expect(rangeLabel('2026-10-20', '2026-10-20')).toBe('Oct 20');
  });
  it('says when a branch last sent a demand', () => {
    const now = new Date(2026, 9, 20, 15, 0);
    expect(whenLabel(null, now)).toBe('Never');
    expect(whenLabel('2026-10-20T10:30:00', now)).toBe('Today 10:30');
    expect(whenLabel('2026-10-12T09:15:00', now)).toBe('Oct 12, 09:15');
  });
  it('formats rates and leaves a missing one blank', () => {
    expect(pctLabel(98.25)).toBe('98.3%');
    expect(pctLabel(null)).toBe('—');
  });
});

describe('Demand vs production trend', () => {
  const week = {
    hourly: [
      { hour: '2026-10-20T08', demand: 4, produced: 2 },
      { hour: '2026-10-20T13', demand: 1, produced: 0 },
    ],
    trend: [
      { date: '2026-10-19', demand: 10, produced: 8 },
      { date: '2026-10-20', demand: 3, produced: 5 },
    ],
  };
  it('is hourly for Today', () => {
    expect(trendPoints(week, 'today')).toEqual([
      { label: '8a', demand: 4, produced: 2 },
      { label: '1p', demand: 1, produced: 0 },
    ]);
  });
  it('is daily otherwise, labelled by weekday for a week and by date for a month', () => {
    expect(trendPoints(week, 'week').map((p) => p.label)).toEqual(['Mon 19', 'Tue 20']);
    expect(trendPoints(week, 'month').map((p) => p.label)).toEqual(['Oct 19', 'Oct 20']);
  });
  it('is empty before the overview loads', () => {
    expect(trendPoints(undefined, 'week')).toEqual([]);
  });
});

describe('deltas, branch toggle, heat and stock filter', () => {
  it('colours a delta by direction, inverted where a rise is bad', () => {
    expect(deltaDisplay({ value: 12.34, unit: '%' })).toEqual({ text: '+12.3%', tone: 'good' });
    expect(deltaDisplay({ value: 12.34, unit: '%' }, true)).toEqual({ text: '+12.3%', tone: 'bad' });
    expect(deltaDisplay({ value: -2, unit: 'pts' })).toEqual({ text: '-2.0 pts', tone: 'bad' });
    expect(deltaDisplay({ value: 0, unit: '%' })).toEqual({ text: '0.0%', tone: 'flat' });
    expect(deltaDisplay(null)).toBeNull();
  });
  it('toggles the branch filter', () => {
    expect(toggleBranch(null, 'b1')).toBe('b1');
    expect(toggleBranch('b1', 'b1')).toBeNull();
    expect(toggleBranch('b1', 'b2')).toBe('b2');
  });
  it('eases heat cells and leaves zero empty', () => {
    expect(heatCell(0, 10)).toEqual({ alpha: 0, strong: false });
    expect(heatCell(10, 10)).toEqual({ alpha: 0.96, strong: true });
    const small = heatCell(1, 100);
    expect(small.strong).toBe(false);
    expect(small.alpha).toBeGreaterThan(0.08);
  });
  it('filters current stock by search and low stock', () => {
    const row = (productName: string, state: ProductionCurrentStockRow['state']): ProductionCurrentStockRow => ({
      productId: productName,
      productName,
      production: 0,
      branch: 0,
      total: 0,
      state,
    });
    const rows = [row('Cream Puff', 'ok'), row('Cream Roll', 'low'), row('Pastry', 'out')];
    expect(filterStockRows(rows, ' cream ', false).map((r) => r.productName)).toEqual(['Cream Puff', 'Cream Roll']);
    expect(filterStockRows(rows, '', true).map((r) => r.productName)).toEqual(['Cream Roll', 'Pastry']);
  });
});

describe('records drill-down', () => {
  it('opens vouchers for ledger figures, demands for demand figures, nothing for returns', () => {
    expect(RECORD_REFERENCE_KIND.received).toBe('voucher');
    expect(RECORD_REFERENCE_KIND.ledger).toBe('voucher');
    expect(RECORD_REFERENCE_KIND.demand).toBe('demand');
    expect(RECORD_REFERENCE_KIND.share).toBe('demand');
    expect(RECORD_REFERENCE_KIND.discount).toBe('demand');
    expect(RECORD_REFERENCE_KIND.return).toBeNull();
  });
  it('describes every metric', () => {
    for (const info of Object.values(RECORD_INFO)) {
      expect(info.source && info.rule && info.status && info.date).toBeTruthy();
    }
  });
  it('states the page range', () => {
    expect(recordsRangeText(1, 25, 0)).toBe('No records');
    expect(recordsRangeText(2, 25, 60)).toBe('26–50 of 60 records');
    expect(recordsRangeText(3, 25, 60)).toBe('51–60 of 60 records');
  });
  it('names creator and approver, or says neither is recorded', () => {
    expect(recordAuditLine('Ali', 'Sara')).toBe('Created by Ali · Approved by Sara');
    expect(recordAuditLine(null, 'Sara')).toBe('Approved by Sara');
    expect(recordAuditLine(null, null)).toBe('No creator / approver recorded');
  });
  it('words a detail failure as the web dialog does', () => {
    expect(recordDetailError({ status: 404 }, 'voucher')).toEqual({ message: 'This voucher could not be found. It may have been deleted.', retry: false });
    expect(recordDetailError({ status: 403 }, 'demand')).toEqual({ message: 'You do not have permission to view this demand.', retry: false });
    expect(recordDetailError({ status: 500 }, 'demand')).toEqual({ message: 'This demand could not be loaded.', retry: true });
  });
});

describe('Super Admin header actions', () => {
  const search = act('search');
  const bell = act('bell');
  const menu = act('menu');
  const palette = { ...act('palette'), onPress: jest.fn() };
  const theme = { ...act('moon'), onLongPress: noop };

  it('fits more buttons on a wider screen, never fewer than four', () => {
    expect(headerActionBudget(320)).toBe(4);
    expect(headerActionBudget(393)).toBe(5);
    expect(headerActionBudget(800)).toBe(13);
  });
  it('orders search, appearance, bell, extras, menu', () => {
    const out = composeAdminHeaderActions({ search, appearance: [palette, theme], bell, nav: menu, width: 393 });
    expect(out.map((a) => a.icon)).toEqual(['search', 'palette', 'moon', 'bell', 'menu']);
  });
  it('folds the appearance pair into one button when the header is crowded', () => {
    const exportCsv = act('file-spreadsheet');
    const out = composeAdminHeaderActions({ search, appearance: [palette, theme], bell, extras: [exportCsv], nav: menu, width: 393 });
    expect(out.map((a) => a.icon)).toEqual(['search', 'moon', 'bell', 'file-spreadsheet', 'menu']);
    expect(out[1]!.onPress).toBe(palette.onPress);
    expect(out[1]!.onLongPress).toBeUndefined();
    expect(out[1]!.accessibilityLabel).toBe('Change appearance');
  });
  it('keeps a single appearance button as it is', () => {
    const out = composeAdminHeaderActions({ search, appearance: [theme], bell, nav: menu, width: 320 });
    expect(out.map((a) => a.icon)).toEqual(['search', 'moon', 'bell', 'menu']);
  });
});
