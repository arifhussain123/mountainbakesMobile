/**
 * @format
 */
import type { DailySaleRecord } from '@/api/types';
import {
  amendPayload,
  canGenerateToday,
  currentAmendValue,
  dailySaleRowActions,
  expectedOf,
  feedPayload,
  findTodayRow,
  initialFeedValues,
  liveDifference,
  unlockReasonProblem,
} from '@/features/admin/utils/dailySaleActions';

const rec = (over: Partial<DailySaleRecord>) =>
  ({
    id: 'r1',
    branchId: 'b1',
    branchName: 'Alabad',
    businessDate: '2026-10-20',
    status: 'open',
    fedAt: null,
    manualCash: null,
    manualEasypaisa: null,
    manualBank: null,
    expectedCashInHand: 900,
    autoCash: 1000,
    autoEasypaisa: 300,
    autoBank: 50,
    ...over,
  }) as DailySaleRecord;

describe('daily sale row actions', () => {
  it('offers only Generate on a day with no stored record', () => {
    expect(dailySaleRowActions(rec({ id: null }))).toEqual({ generate: true, feed: false, amend: false, lock: false, unlock: false });
  });

  it('feeds while open (verify is automatic); nothing admin-only yet', () => {
    expect(dailySaleRowActions(rec({ status: 'pending_verification', fedAt: 'x' }))).toEqual({
      generate: false,
      feed: true,
      amend: false,
      lock: false,
      unlock: false,
    });
  });

  it('locks a verified record, amends only a counted one, and unlocks any closed one', () => {
    expect(dailySaleRowActions(rec({ status: 'verified', fedAt: null }))).toMatchObject({ feed: false, amend: false, lock: true, unlock: true });
    expect(dailySaleRowActions(rec({ status: 'amended', fedAt: 'x' }))).toMatchObject({ amend: true, lock: true, unlock: true });
    expect(dailySaleRowActions(rec({ status: 'locked', fedAt: 'x' }))).toMatchObject({ amend: true, lock: false, unlock: true });
  });
});

describe('today buttons', () => {
  const rows = [rec({ branchId: 'b1', businessDate: '2026-10-19' }), rec({ id: null, branchId: 'b2', businessDate: '2026-10-20' })];
  it('finds today for the picked branch only', () => {
    expect(findTodayRow(rows, '2026-10-20', 'b1')).toBeNull();
    expect(findTodayRow(rows, '2026-10-20', 'b2')?.branchId).toBe('b2');
    expect(findTodayRow(rows, '2026-10-20', null)?.branchId).toBe('b2');
  });
  it('offers Generate Today only for one branch with no record and a window reaching today', () => {
    expect(canGenerateToday(null, 'b1', '2026-10-20', '2026-10-20')).toBe(true);
    expect(canGenerateToday(rec({ id: null }), 'b1', '2026-10-20', '2026-10-20')).toBe(true);
    expect(canGenerateToday(rec({}), 'b1', '2026-10-20', '2026-10-20')).toBe(false);
    expect(canGenerateToday(null, null, '2026-10-20', '2026-10-20')).toBe(false);
    expect(canGenerateToday(null, 'b1', '2026-10-19', '2026-10-20')).toBe(false);
  });
});

describe('manual feed', () => {
  it('checks cash against Cash on Table and the rest against gross', () => {
    const r = rec({});
    expect(expectedOf(r, 'cash')).toBe(900);
    expect(expectedOf(r, 'easypaisa')).toBe(300);
    expect(expectedOf(r, 'bank_account')).toBe(50);
    expect(liveDifference(900, '850')).toBe(-50);
    expect(liveDifference(900, ' ')).toBeNull();
    expect(liveDifference(900, 'abc')).toBeNull();
  });

  it('seeds counted figures and leaves uncounted ones empty', () => {
    expect(initialFeedValues(rec({ manualCash: 500 }))).toEqual({ cash: '500', easypaisa: '', bank_account: '' });
  });

  it('builds the body from filled fields only, naming the branch', () => {
    expect(feedPayload({ cash: '850.5', easypaisa: '', bank_account: '0' }, '2026-10-20', 'b1')).toEqual({
      input: { businessDate: '2026-10-20', branchId: 'b1', cash: 850.5, bank: 0 },
    });
    expect(feedPayload({ cash: '', easypaisa: '', bank_account: '' }, 'd', 'b')).toEqual({ error: 'Enter at least one counted amount' });
    expect(feedPayload({ cash: '-1', easypaisa: '', bank_account: '' }, 'd', 'b')).toEqual({ error: 'Cash: enter a valid amount' });
    expect(feedPayload({ cash: '', easypaisa: '1.234', bank_account: '' }, 'd', 'b')).toEqual({ error: 'Easypaisa: at most 2 decimal places' });
  });
});

describe('amend and unlock', () => {
  it('reads the current counted figure for the picked field', () => {
    expect(currentAmendValue(rec({ manualEasypaisa: 120 }), 'manual_easypaisa')).toBe(120);
    expect(currentAmendValue(rec({}), 'manual_bank')).toBeNull();
  });
  it('needs an amount and a 3+ character reason', () => {
    expect(amendPayload('500', ' found note ')).toEqual({ amount: 500, reason: 'found note' });
    expect(amendPayload('', 'reason')).toEqual({ error: 'Enter the corrected amount' });
    expect(amendPayload('1.005', 'reason')).toEqual({ error: 'An amount can have at most 2 decimal places' });
    expect(amendPayload('5', 'ab')).toEqual({ error: 'Say why this figure is being amended' });
    expect(unlockReasonProblem(' ab ')).toBe('Say why this record is being unlocked');
    expect(unlockReasonProblem('recount')).toBeNull();
  });
});
