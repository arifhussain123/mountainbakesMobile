/**
 * @format
 */
import type { FinanceAuditLog } from '@/api/types';
import {
  checklistNeedsAttention,
  closeOrderBlocker,
  computeClosingChecklist,
  oldestOpenDay,
  shiftDate,
} from '@/features/finance/utils/closingChecklist';
import { computeReviewSpeeds, describeDuration, isApproveUnlocked, isFastApproval } from '@/features/finance/utils/reviewSpeed';
import { cashBookClosing, computeCashBookBalances, groupByDate } from '@/features/finance/utils/cashBookBalance';

describe('computeClosingChecklist', () => {
  it('is all green on a clean day', () => {
    const items = computeClosingChecklist({ pendingApprovals: 0, unmatchedDeposits: 0, outlierSales: 0, previousDayClosed: true });
    expect(items.map((i) => i.state)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(checklistNeedsAttention(items)).toBe(false);
    expect(items.every((i) => i.hint === null)).toBe(true);
  });

  it('marks every problem amber with a hint, never hiding one', () => {
    const items = computeClosingChecklist({ pendingApprovals: 2, unmatchedDeposits: 1, outlierSales: 1, previousDayClosed: false });
    expect(items.map((i) => i.state)).toEqual(['attention', 'attention', 'attention', 'attention']);
    expect(items[0]!.label).toBe('2 approvals pending for this date');
    expect(items[1]!.label).toBe('1 branch deposit not matched');
    expect(items.every((i) => i.hint)).toBe(true);
    expect(checklistNeedsAttention(items)).toBe(true);
  });
});

describe('sequential closing', () => {
  const first = '2026-10-01';
  const today = '2026-10-19';

  it('shifts across month ends', () => {
    expect(shiftDate('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds the oldest open day', () => {
    expect(oldestOpenDay(['2026-10-01', '2026-10-02', '2026-10-04'], first, today)).toBe('2026-10-03');
    expect(oldestOpenDay([], first, first)).toBe(first);
  });

  it('returns null when everything up to today is closed', () => {
    const all: string[] = [];
    for (let d = first; d <= '2026-10-03'; d = shiftDate(d, 1)) all.push(d);
    expect(oldestOpenDay(all, first, '2026-10-03')).toBeNull();
  });

  it('allows the oldest open day and blocks a later one', () => {
    const closed = ['2026-10-01', '2026-10-02'];
    expect(closeOrderBlocker('2026-10-03', closed, first, today)).toBeNull();
    expect(closeOrderBlocker('2026-10-05', closed, first, today)).toBe('Close 2026-10-03 first. Days close in order.');
  });

  it('allows the first day of the books and refuses future or closed days', () => {
    expect(closeOrderBlocker(first, [], first, today)).toBeNull();
    expect(closeOrderBlocker('2026-10-20', [], first, today)).toBe('A future business date cannot be closed.');
    expect(closeOrderBlocker('2026-10-01', ['2026-10-01'], first, today)).toBe('This day is already closed.');
  });
});

const log = (over: Partial<FinanceAuditLog>): FinanceAuditLog => ({
  id: 'x',
  entity: 'finance_transaction',
  entityId: 'e1',
  entityRef: 'FTX-1',
  action: 'created',
  actorId: 'u1',
  actorName: 'finance@mountainbakes.com',
  actorRole: 'finance_admin',
  previousValues: null,
  newValues: null,
  ipAddress: null,
  deviceInfo: null,
  createdAt: '2026-10-18T10:00:00.000Z',
  ...over,
});

describe('computeReviewSpeeds', () => {
  it('measures from the latest submission and badges approvals under 10 seconds', () => {
    const logs = [
      log({ id: 'c', action: 'created', createdAt: '2026-10-18T09:00:00.000Z' }),
      log({ id: 's', action: 'submitted', createdAt: '2026-10-18T10:00:00.000Z' }),
      log({ id: 'a', action: 'approved', createdAt: '2026-10-18T10:00:04.000Z' }),
    ];
    const speed = computeReviewSpeeds(logs).get('a')!;
    expect(speed).toMatchObject({ gapMs: 4000, from: 'submitted', fast: true, burstNote: null });
    expect(isFastApproval(speed)).toBe(true);
  });

  it('falls back to creation and leaves the gap null when the start is outside the window', () => {
    const speeds = computeReviewSpeeds([
      log({ id: 'c', action: 'created', createdAt: '2026-10-18T10:00:00.000Z' }),
      log({ id: 'a', action: 'approved', createdAt: '2026-10-18T10:05:00.000Z' }),
      log({ id: 'b', entityId: 'e2', action: 'approved', actorId: 'u2', createdAt: '2026-10-18T11:00:00.000Z' }),
    ]);
    expect(speeds.get('a')).toMatchObject({ gapMs: 300_000, from: 'created', fast: false });
    expect(speeds.get('b')).toMatchObject({ gapMs: null, from: null, fast: false, burstNote: null });
    expect(isFastApproval(speeds.get('a'))).toBe(false);
  });

  it('notes a burst of approvals by one person within a minute', () => {
    const approvals = ['10:00:00', '10:00:01', '10:00:02', '10:00:03'].map((t, i) =>
      log({ id: `a${i}`, entityId: `e${i}`, action: 'approved', createdAt: `2026-10-18T${t}.000Z` }),
    );
    const other = log({ id: 'o', entityId: 'e9', action: 'approved', actorId: 'u2', createdAt: '2026-10-18T10:00:02.000Z' });
    const speeds = computeReviewSpeeds([...approvals, other]);
    for (let i = 0; i < 4; i++) expect(speeds.get(`a${i}`)!.burstNote).toBe('4 approvals in 3 seconds');
    expect(speeds.get('o')!.burstNote).toBeNull();
  });

  it('describes durations in words', () => {
    expect(describeDuration(1000)).toBe('1 second');
    expect(describeDuration(65_000)).toBe('1 minute 5 seconds');
    expect(describeDuration(120_000)).toBe('2 minutes');
  });
});

describe('isApproveUnlocked', () => {
  it('needs the photo or the end of the detail, and two seconds', () => {
    expect(isApproveUnlocked({ enabled: true, openedPhoto: false, scrolledToEnd: false, msOnDetail: 5000 })).toBe(false);
    expect(isApproveUnlocked({ enabled: true, openedPhoto: true, scrolledToEnd: false, msOnDetail: 1999 })).toBe(false);
    expect(isApproveUnlocked({ enabled: true, openedPhoto: true, scrolledToEnd: false, msOnDetail: 2000 })).toBe(true);
    expect(isApproveUnlocked({ enabled: true, openedPhoto: false, scrolledToEnd: true, msOnDetail: 2500 })).toBe(true);
  });

  it('is unlocked straight away when the flag is off', () => {
    expect(isApproveUnlocked({ enabled: false, openedPhoto: false, scrolledToEnd: false, msOnDetail: 0 })).toBe(true);
  });
});

describe('computeCashBookBalances', () => {
  // Stored balances follow posting order: the 17 Oct voucher was posted after 18 Oct's first rows.
  const rows = [
    { entryDate: '2026-10-18', debit: 24262.5, credit: null, balance: 45940.99 },
    { entryDate: '2026-10-18', debit: null, credit: 1000, balance: 62040.99 },
    { entryDate: '2026-10-19', debit: 300, credit: null, balance: 62340.99 },
  ];

  it('follows the displayed order from the opening balance', () => {
    const out = computeCashBookBalances(38778.49, rows);
    expect(out.map((r) => r.runningBalance)).toEqual([63040.99, 62040.99, 62340.99]);
    expect(out.map((r) => r.postingOrderDiffers)).toEqual([true, false, false]);
  });

  it('ends on the summary closing balance', () => {
    const out = computeCashBookBalances(38778.49, rows);
    expect(out[out.length - 1]!.runningBalance).toBe(cashBookClosing(38778.49, rows));
    expect(cashBookClosing(100, [])).toBe(100);
  });

  it('shows no running balance on a filtered book', () => {
    const out = computeCashBookBalances(38778.49, rows, { filtered: true });
    expect(out.every((r) => r.runningBalance === null && !r.postingOrderDiffers)).toBe(true);
  });

  it('groups by date without reordering', () => {
    const groups = groupByDate(computeCashBookBalances(0, rows));
    expect(groups.map((g) => [g.date, g.rows.length])).toEqual([
      ['2026-10-18', 2],
      ['2026-10-19', 1],
    ]);
  });
});
