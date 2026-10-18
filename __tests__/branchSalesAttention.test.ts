/**
 * @format
 */
import type { FinanceDailySaleRow } from '@/api/types';
import { dateAttention, dayKey, findOutliers, needsAttention } from '@/features/finance/utils/branchSalesAttention';

function row(over: Partial<FinanceDailySaleRow> & { recon?: FinanceDailySaleRow['reconciliation']['status'] }): FinanceDailySaleRow {
  const { recon = 'matched', ...rest } = over;
  return {
    id: 'r',
    branchId: 'alabad',
    branchName: 'Alabad',
    businessDate: '2026-10-10',
    autoTotalSale: 30000,
    companySharePct: 75,
    companyShare: 22500,
    branchSharePct: 25,
    branchShare: 7500,
    autoCash: 30000,
    autoEasypaisa: 0,
    autoFoodpanda: 0,
    autoBank: 0,
    autoOther: 0,
    autoStaff: 0,
    discount: 0,
    cashExpense: 0,
    expenseTotal: 0,
    orderCount: 10,
    generatedAt: '2026-10-10T20:00:00.000Z',
    manualCash: null,
    manualEasypaisa: null,
    manualBank: null,
    fedBy: null,
    fedByName: null,
    fedAt: null,
    cashDifference: null,
    easypaisaDifference: null,
    bankDifference: null,
    overallDifference: 0,
    paymentTotal: 30000,
    expectedCashInHand: 30000,
    status: 'verified',
    verifiedBy: null,
    verifiedByName: null,
    verifiedAt: null,
    reconciliation: { expected: 22500, received: 22500, pending: 0, difference: 0, status: recon, match: 'amount', provisional: false, deposits: [] },
    ...rest,
  };
}

// Alabad's ordinary days, then 17 Oct at Rs. 1,047,650.
const normal = [10, 11, 12, 13, 14, 15].map((d, i) => row({ businessDate: `2026-10-${d}`, autoTotalSale: 28000 + i * 1000 }));
const spike = row({ businessDate: '2026-10-17', autoTotalSale: 1047650 });

describe('findOutliers', () => {
  it('flags a day far above the branch median', () => {
    const out = findOutliers([...normal, spike]);
    expect([...out]).toEqual([dayKey(spike)]);
  });

  it('needs enough other days before flagging anything', () => {
    expect(findOutliers([...normal.slice(0, 3), spike]).size).toBe(0);
  });

  it('compares branches only with themselves', () => {
    const big = [10, 11, 12, 13, 14, 15].map((d) => row({ branchId: 'big', branchName: 'Big', businessDate: `2026-10-${d}`, autoTotalSale: 900000 }));
    const out = findOutliers([...normal, ...big]);
    expect(out.size).toBe(0);
  });
});

describe('needsAttention', () => {
  it('sorts days into the four lists, newest first', () => {
    const rows = [
      ...normal,
      spike,
      row({ businessDate: '2026-10-16', recon: 'not_received', status: 'locked' }),
      row({ businessDate: '2026-10-18', recon: 'not_received', status: 'open' }),
      row({ businessDate: '2026-10-15', branchId: 'x', branchName: 'Dhok', recon: 'discrepancy' }),
      row({ businessDate: '2026-10-14', branchId: 'y', branchName: 'Zafar', recon: 'pending' }),
      row({ businessDate: '2026-10-16', branchId: 'y', branchName: 'Zafar', recon: 'pending' }),
    ];
    const lists = needsAttention(rows);
    expect(lists.notReceived.map((r) => r.businessDate)).toEqual(['2026-10-16']);
    expect(lists.discrepancy.map((r) => r.branchName)).toEqual(['Dhok']);
    expect(lists.awaitingApproval.map((r) => r.businessDate)).toEqual(['2026-10-16', '2026-10-14']);
    expect(lists.outlier.map((r) => r.businessDate)).toEqual(['2026-10-17']);
  });
});

describe('dateAttention', () => {
  it('counts unmatched deposits and outliers for one date', () => {
    const rows = [...normal, spike, row({ businessDate: '2026-10-17', branchId: 'x', branchName: 'Dhok', recon: 'discrepancy' })];
    expect(dateAttention(rows, '2026-10-17', ['2026-10-17', '2026-10-12'])).toEqual({ unmatchedDeposits: 2, outlierSales: 1 });
    expect(dateAttention(rows, '2026-10-11', [])).toEqual({ unmatchedDeposits: 0, outlierSales: 0 });
  });
});
