/**
 * @format
 *
 * The web Branch-page changes synced into mobile on 2026-10-18 — see
 * docs/branch-mobile-change-audit.md. Each rule is tested as the pure function
 * the screens call, and the two Data Engine calls by the exact request they send.
 */
const mockGet = jest.fn();
jest.mock('@/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
  generateIdempotencyKey: () => 'key',
}));

import type { MonthlyCashTransferSummary, MonthlyDiscountSummary } from '@/api';
import { getBusinessMonthStart } from '@/api/businessDate';
import { queryKeys } from '@/api/queryKeys';
import { getExpensesTotal, listExpensesData } from '@/api/services/expenseService';
import { getMonthlyCashTransferSummary } from '@/api/services/cashTransferService';
import { buildCashTransferSummaryTiles } from '@/features/cash/cashTransferSummary';
import {
  DAILY_SALE_START_DATE,
  dailySaleAllBeforeStartEmpty,
  dailySaleBeforeStartNotice,
  resolveDailySaleWindow,
} from '@/features/closing/dailySaleWindow';
import { buildOwnBranchDiscountTotal } from '@/features/discounts/discountSummary';
import { describeExpensesWindow } from '@/features/expenses/expensesWindow';
import { formatMonthToDateLine, formatSummaryWindow } from '@/shared/utils/monthToDate';
import { includesTerm } from '@/shared/utils/search';

/** A Karachi wall-clock instant (+05:00, no DST). */
const karachi = (local: string) => new Date(`${local}+05:00`);

beforeEach(() => mockGet.mockReset());

describe('getBusinessMonthStart — the month-to-date window start', () => {
  it('is the 1st of the business month in the middle of it', () => {
    expect(getBusinessMonthStart(karachi('2026-10-18T10:00:00'))).toBe('2026-10-01');
  });

  it('turns over at the 02:00 business-day rollover on the 1st, not at midnight', () => {
    expect(getBusinessMonthStart(karachi('2026-11-01T01:59:00'))).toBe('2026-10-01');
    expect(getBusinessMonthStart(karachi('2026-11-01T02:00:00'))).toBe('2026-11-01');
  });

  it('crosses December → January into the new year', () => {
    expect(getBusinessMonthStart(karachi('2027-01-01T01:30:00'))).toBe('2026-12-01');
    expect(getBusinessMonthStart(karachi('2027-01-01T02:30:00'))).toBe('2027-01-01');
  });

  it('keeps a leap-year February to its own month', () => {
    expect(getBusinessMonthStart(karachi('2028-02-29T12:00:00'))).toBe('2028-02-01');
    expect(getBusinessMonthStart(karachi('2028-03-01T01:00:00'))).toBe('2028-02-01');
  });

  it('is read in Karachi, not UTC: 21:00Z on the 31st is already 02:00 on the 1st', () => {
    expect(getBusinessMonthStart(new Date('2026-10-31T20:59:00Z'))).toBe('2026-10-01');
    expect(getBusinessMonthStart(new Date('2026-10-31T21:00:00Z'))).toBe('2026-11-01');
  });
});

describe('month-to-date wording (shared with the web summaries)', () => {
  it('states the server window and when it starts again', () => {
    expect(formatSummaryWindow('2026-10-01', '2026-10-18')).toBe('1 October 2026 – 18 October 2026');
    expect(formatMonthToDateLine('2026-10-01')).toBe('Month to date, Karachi business day · starts again on 1 November 2026');
  });

  it('names January of the next year from December', () => {
    expect(formatMonthToDateLine('2026-12-01')).toBe('Month to date, Karachi business day · starts again on 1 January 2027');
  });
});

describe('Cash Transfers — monthly summary', () => {
  const summary: MonthlyCashTransferSummary = {
    from: '2026-10-01',
    to: '2026-10-18',
    branchId: 'b',
    transfers: 5,
    totals: {
      transferred: { amount: 30000, count: 4 },
      cash: { amount: 20000, count: 3 },
      easypaisa: { amount: 7000, count: 1 },
      bank: { amount: 3000, count: 1 },
      approved: { amount: 25000, count: 3 },
      pending: { amount: 5000, count: 1 },
      rejected: { amount: 0, count: 0 },
      fuel: { amount: 600, count: 2 },
    },
  };

  it('asks the server for this branch’s month, with no list filter', async () => {
    mockGet.mockResolvedValue(summary);
    await getMonthlyCashTransferSummary();
    expect(mockGet).toHaveBeenCalledWith('/cash-transfers/monthly-summary');
  });

  it('lays out the web’s eight figures, in its order and words', () => {
    const tiles = buildCashTransferSummaryTiles(summary);
    expect(tiles.map((t) => t.label)).toEqual([
      'Total Transferred', 'Cash', 'Easypaisa', 'Bank', 'Approved', 'Awaiting Finance', 'Rejected', 'Fuel Charges',
    ]);
    expect(tiles[0]).toMatchObject({ value: 'Rs. 30,000', sub: '4 transfers · every status', highlight: true });
    expect(tiles.find((t) => t.key === 'easypaisa')!.sub).toBe('1 transfer');
    expect(tiles.find((t) => t.key === 'rejected')!).toMatchObject({ value: 'Rs. 0', sub: '0 transfers', tone: 'danger' });
  });

  it('shows Fuel Charges as its own figure, never added to Total Transferred', () => {
    const tiles = buildCashTransferSummaryTiles(summary);
    expect(tiles.find((t) => t.key === 'fuel')!).toMatchObject({ value: 'Rs. 600', sub: 'across 2 transfers' });
    expect(tiles[0]!.value).toBe('Rs. 30,000');
  });
});

describe('Shop Expenses — month to date, totalled on the server', () => {
  it('lists from the 1st of the month through the Data Engine, newest first', async () => {
    mockGet.mockResolvedValue({ data: [], page: 1, pageSize: 50, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
    await listExpensesData({ from: '2026-10-01' });
    expect(mockGet).toHaveBeenCalledWith('/data/expenses', { 'businessDate.gte': '2026-10-01', page: 1, pageSize: 50, sort: 'createdAt:desc' });
  });

  it('passes a search to the server, so it covers the whole month and not just loaded pages', async () => {
    mockGet.mockResolvedValue({ data: [], page: 2, pageSize: 50, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
    await listExpensesData({ from: '2026-10-01', page: 2, search: 'gas' });
    expect(mockGet).toHaveBeenCalledWith('/data/expenses', { 'businessDate.gte': '2026-10-01', page: 2, pageSize: 50, sort: 'createdAt:desc', search: 'gas' });
  });

  it('takes the total from the database aggregate over the same window and search', async () => {
    mockGet.mockResolvedValue({ rows: [{ values: { 'sum:amount': 12200.5, count: 9 } }] });
    await expect(getExpensesTotal({ from: '2026-10-01', search: 'gas' })).resolves.toEqual({ amount: 12200.5, count: 9 });
    expect(mockGet).toHaveBeenCalledWith('/data/expenses/aggregate', { 'businessDate.gte': '2026-10-01', metrics: 'sum:amount,count', search: 'gas' });
  });

  it('a month with no expenses totals Rs. 0, not an error', async () => {
    mockGet.mockResolvedValue({ rows: [{ values: { 'sum:amount': null, count: 0 } }] });
    await expect(getExpensesTotal({ from: '2026-11-01' })).resolves.toEqual({ amount: 0, count: 0 });
    mockGet.mockResolvedValue({ rows: [] });
    await expect(getExpensesTotal({ from: '2026-11-01' })).resolves.toEqual({ amount: 0, count: 0 });
  });

  it('names its window', () => {
    expect(describeExpensesWindow('2026-10-01', '2026-10-18')).toBe('This month · 1–18 Oct');
    expect(describeExpensesWindow('2026-11-01', '2026-11-01')).toBe('This month · 1 Nov');
  });
});

describe('Branch → Discounts — one total card', () => {
  const zero = { amount: 0, count: 0 };
  const summary = (approved = { amount: 12200, count: 17 }, pending = zero): MonthlyDiscountSummary => {
    const totals = { submitted: zero, pending, approved, rejected: zero, returned: zero };
    return { from: '2026-10-01', to: '2026-10-18', branches: [{ branchId: 'b', branchName: 'Committee Chowk Branch', ...totals }], totals };
  };

  it('states the approved total with the web’s label', () => {
    expect(buildOwnBranchDiscountTotal(summary())).toEqual({
      label: 'Total discount (since 2026-10-01)',
      total: 'Rs. 12,200',
      approvedLine: '17 claims approved',
      pendingLine: null,
    });
  });

  it('keeps awaiting review as its own line, never added in', () => {
    const t = buildOwnBranchDiscountTotal(summary({ amount: 650, count: 1 }, { amount: 300, count: 1 }));
    expect(t.total).toBe('Rs. 650');
    expect(t.pendingLine).toBe('Rs. 300 awaiting review · 1 claim');
  });

  it('says so when nothing is approved yet', () => {
    expect(buildOwnBranchDiscountTotal(summary(zero)).approvedLine).toBe('No approved claims yet');
  });
});

describe('Daily Sale Record — month to date, kept from 1 Sep 2026', () => {
  it('requests the window as picked when it lies after the start', () => {
    expect(resolveDailySaleWindow({ from: '2026-10-01', to: '2026-10-18' })).toEqual({
      queryFrom: '2026-10-01', to: '2026-10-18', beforeStart: false, allBeforeStart: false,
    });
  });

  it('never requests before the start, and flags the notice', () => {
    expect(resolveDailySaleWindow({ from: '2026-08-15', to: '2026-09-10' })).toEqual({
      queryFrom: DAILY_SALE_START_DATE, to: '2026-09-10', beforeStart: true, allBeforeStart: false,
    });
  });

  it('requests nothing for a window wholly before the start', () => {
    expect(resolveDailySaleWindow({ from: '2026-07-01', to: '2026-08-31' }).allBeforeStart).toBe(true);
  });

  it('a window starting on the start date itself shows no notice', () => {
    expect(resolveDailySaleWindow({ from: '2026-09-01', to: '2026-09-30' }).beforeStart).toBe(false);
  });

  it('words the notice and the empty state as the web does', () => {
    expect(dailySaleBeforeStartNotice().body).toMatch(/^This record is maintained from .+, so there is no data for those days\.$/);
    expect(dailySaleAllBeforeStartEmpty().title).toMatch(/^No record before /);
  });
});

describe('null-safe search (the web’s malformed-row crash fixes)', () => {
  it('matches text and ignores a missing field instead of throwing', () => {
    expect(includesTerm('DMD-000123', '0001')).toBe(true);
    expect(includesTerm('Fudge Pastry', 'lotus')).toBe(false);
    expect(includesTerm(undefined, 'x')).toBe(false);
    expect(includesTerm(null, 'x')).toBe(false);
    expect(includesTerm(42, '4')).toBe(false);
  });
});

describe('summary cache keys stay off the list roots that are read as lists', () => {
  // useNavBadges reads the first ['branchDiscounts'] entry as a claim list and the
  // Help Desk's recent records read ['cashTransfers'] and ['expenses'] as lists;
  // a summary or a paged Data Engine result under those roots would crash them.
  it.each([
    [queryKeys.branchDiscountSummary('2026-10-18'), 'branchDiscounts'],
    [queryKeys.cashTransferMonthlySummary('2026-10-18'), 'cashTransfers'],
    [queryKeys.expensesData({ from: '2026-10-01' }), 'expenses'],
    [queryKeys.expensesTotal({ from: '2026-10-01' }), 'expenses'],
  ])('%j is not under %s', (key, listRoot) => {
    expect(key[0]).not.toBe(listRoot);
  });

  it('change with the business date or window, so a new month is a new key', () => {
    expect(queryKeys.cashTransferMonthlySummary('2026-11-01')).not.toEqual(queryKeys.cashTransferMonthlySummary('2026-10-31'));
    expect(queryKeys.expensesTotal({ from: '2026-11-01' })).not.toEqual(queryKeys.expensesTotal({ from: '2026-10-01' }));
  });
});
