/**
 * @format
 */
import type { BranchDayDeposit, FinanceDailySaleDay } from '@/api';
import {
  businessDateOf,
  dailySalesWindow,
  findShareMatch,
  shareMatchLabel,
  shortDay,
  submittedAt,
  submittedOnAnotherDay,
} from '@/features/finance/utils/cashTransferMatch';

function deposit(id: string, amount: number, overrides: Partial<BranchDayDeposit> = {}): BranchDayDeposit {
  return {
    id,
    transferNo: `CT-${id}`,
    voucherNo: null,
    status: 'pending',
    branchId: 'b1',
    branchName: 'Committee Chowk Branch',
    businessDate: '2026-10-16',
    amount,
    cashAmount: amount,
    easypaisaAmount: 0,
    bankAmount: 0,
    ...overrides,
  };
}

function day(companyShare: number, deposits: BranchDayDeposit[], overrides: Partial<FinanceDailySaleDay> = {}): FinanceDailySaleDay {
  return {
    id: 'd1',
    branchId: 'b1',
    branchName: 'Committee Chowk Branch',
    businessDate: '2026-10-15',
    status: 'verified',
    autoTotalSale: companyShare / 0.75,
    companySharePct: 75,
    companyShare,
    reconciliation: {
      expected: companyShare,
      received: 0,
      pending: deposits.reduce((s, d) => s + d.amount, 0),
      difference: companyShare,
      status: 'pending',
      match: 'amount',
      provisional: false,
      deposits,
    },
    ...overrides,
  };
}

describe('findShareMatch — reads the day the server set the deposit against', () => {
  it('matches when the deposits set against the day equal its Company Share', () => {
    const m = findShareMatch({ id: 't1' }, [day(23720, [deposit('t1', 23720)])]);
    expect(m.kind).toBe('matches');
    expect(shareMatchLabel(m)).toBe('Matches share');
    expect(m.day?.businessDate).toBe('2026-10-15');
  });

  it('allows the server\'s one-rupee tolerance', () => {
    expect(findShareMatch({ id: 't1' }, [day(23720.6, [deposit('t1', 23720)])]).kind).toBe('matches');
  });

  it('reports over and short by the difference', () => {
    expect(shareMatchLabel(findShareMatch({ id: 't1' }, [day(23560, [deposit('t1', 23720)])]))).toBe('Rs. 160 over');
    expect(shareMatchLabel(findShareMatch({ id: 't1' }, [day(25720, [deposit('t1', 23720)])]))).toBe('Rs. 2,000 short');
  });

  it('counts every deposit set against the day, and lists the others', () => {
    const m = findShareMatch({ id: 't2' }, [day(30000, [deposit('t1', 20000, { status: 'approved' }), deposit('t2', 10000)])]);
    expect(m.kind).toBe('matches');
    expect(m.deposited).toBe(30000);
    expect(m.otherDeposits.map((d) => d.transferNo)).toEqual(['CT-t1']);
  });

  it('finds the claiming day among several branches and days', () => {
    const days = [day(5000, [deposit('x', 5000)], { branchId: 'b2' }), day(9000, [deposit('t1', 9500)], { businessDate: '2026-10-14' })];
    const m = findShareMatch({ id: 't1' }, days);
    expect(m.kind).toBe('over');
    expect(m.day?.businessDate).toBe('2026-10-14');
  });

  it('no share found: unclaimed, no data yet, or nothing due', () => {
    expect(shareMatchLabel(findShareMatch({ id: 't9' }, [day(100, [deposit('t1', 100)])]))).toBe('No share found');
    expect(findShareMatch({ id: 't1' }, undefined).kind).toBe('none');
    expect(findShareMatch({ id: 't1' }, [day(0, [deposit('t1', 100)])]).kind).toBe('none');
  });
});

describe('dailySalesWindow', () => {
  it('reaches two days back from the earliest transfer, to the latest', () => {
    expect(dailySalesWindow([{ date: '2026-10-16' }, { date: '2026-10-01' }, { date: '2026-10-12' }])).toEqual({ from: '2026-09-29', to: '2026-10-16' });
    expect(dailySalesWindow([])).toBeNull();
  });
});

describe('the 2 AM business-day cutoff', () => {
  // CT-000057: dated 16 Oct, submitted 17 Oct 12:19 AM Karachi = 16 Oct 19:19 UTC.
  const ct57 = { date: '2026-10-16', createdAt: '2026-10-16T19:19:00.000Z' };

  it('a submit at 12:19 AM belongs to the previous business day', () => {
    expect(businessDateOf(ct57.createdAt)).toBe('2026-10-16');
    expect(submittedAt(ct57.createdAt)).toBe('17 Oct, 12:19 AM');
    expect(submittedOnAnotherDay(ct57)).toBe(true);
  });

  it('2:00 AM is the new day; 1:59 AM is not', () => {
    expect(businessDateOf('2026-10-16T21:00:00.000Z')).toBe('2026-10-17'); // 17 Oct 02:00 PKT
    expect(businessDateOf('2026-10-16T20:59:00.000Z')).toBe('2026-10-16'); // 17 Oct 01:59 PKT
  });

  it('an evening submit is the same day', () => {
    const evening = { date: '2026-10-16', createdAt: '2026-10-16T17:53:00.000Z' }; // 10:53 PM PKT
    expect(submittedAt(evening.createdAt)).toBe('16 Oct, 10:53 PM');
    expect(submittedOnAnotherDay(evening)).toBe(false);
  });

  it('noon and midnight read as 12', () => {
    expect(submittedAt('2026-10-17T07:05:00.000Z')).toBe('17 Oct, 12:05 PM');
    expect(shortDay('2026-10-06')).toBe('6 Oct');
  });
});
