import type { FinanceDashboardDay, FinanceMonthlyDashboard } from '@/api/types';
import {
  balanceMeaning,
  branchTotals,
  bucketLabel,
  compact,
  contextLabel,
  csvFilename,
  dailySeries,
  dashboardCsv,
  dayRangeLabel,
  expenseRows,
  expenseTotals,
  incomeRows,
  incomeTotals,
  karachiTime,
  isIdleIncomeRow,
  ledgerHeadTotals,
  monthOptions,
  niceCeil,
  pct,
  PRODUCTION_HEAD_FILTER,
  resolveFilter,
  searchExpense,
  searchIncome,
  sortExpense,
  sortIncome,
  UNASSIGNED_LABEL,
} from '@/features/finance/utils/dashboardModel';

const A = 'aaaaaaaa-0000-4000-8000-000000000001';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';
const C = 'cccccccc-0000-4000-8000-000000000003';

const day = (o: Partial<FinanceDashboardDay>): FinanceDashboardDay => ({
  date: '2026-10-01',
  branchId: A,
  demand: 0,
  companyShare: 0,
  received: 0,
  returns: 0,
  discount: 0,
  orders: 0,
  unpricedLines: 0,
  receipts: 0,
  returnCount: 0,
  discountCount: 0,
  ...o,
});

function fixture(over: Partial<FinanceMonthlyDashboard> = {}): FinanceMonthlyDashboard {
  return {
    month: '2026-10',
    previousMonth: '2026-09',
    from: '2026-10-01',
    to: '2026-10-31',
    branchId: null,
    businessDate: '2026-10-19',
    generatedAt: '2026-10-19T17:28:00Z',
    branches: [
      { id: A, name: 'Alabad Branch', isActive: true },
      { id: B, name: 'Banigala Stall', isActive: true },
      { id: C, name: 'Dhok Khaba Branch', isActive: false },
    ],
    summary: {
      demand: 2000, companyShare: 1500.5, received: 1700, balance: -199.5, lastMonthBalance: 300,
      ledgerExpense: 900, returns: 50, discount: 20, orders: 3, receipts: 2, ledgerEntries: 3,
      returnCount: 1, discountCount: 1, unpricedLines: 0, ledgerIncome: 1700, ledgerExpenseTotal: 900, ledgerNet: 800,
    },
    days: [
      day({ date: '2026-10-01', branchId: A, demand: 1000, companyShare: 750.25, received: 1000, orders: 1, receipts: 1 }),
      day({ date: '2026-10-08', branchId: A, demand: 600, companyShare: 450.25, orders: 1, returns: 50, returnCount: 1 }),
      day({ date: '2026-10-02', branchId: B, demand: 400, companyShare: 300, received: 700, orders: 1, receipts: 1 }),
      // Production adjustment only — an expense row, never an income row.
      day({ date: '2026-10-03', branchId: B, discount: 20, discountCount: 1 }),
    ],
    ledger: [
      { date: '2026-10-01', branchId: null, ledgerHeadId: 'h-raw', ledgerHeadName: 'Raw Materials', amount: 600, entries: 2 },
      { date: '2026-10-09', branchId: null, ledgerHeadId: 'h-fuel', ledgerHeadName: 'Fuel', amount: 300, entries: 1 },
    ],
    previous: [
      { branchId: A, balance: 100 },
      // Inactive, no activity this month, still carries a balance.
      { branchId: C, balance: 200 },
      { branchId: B, balance: null },
    ],
    trend: [],
    ...over,
  };
}

describe('dashboardModel — formatting and wording', () => {
  it('pct guards a zero base and keeps one decimal', () => {
    expect(pct(929322.5, 1232500)).toBe('75.4%');
    expect(pct(888587.5, 929322.5)).toBe('95.6%');
    expect(pct(5, 0)).toBe('—');
  });

  it('compact axis ticks', () => {
    expect(compact(1_234_567)).toBe('1.2M');
    expect(compact(40_735)).toBe('41k');
    expect(compact(-12_000)).toBe('−12k');
    expect(compact(900)).toBe('900');
  });

  it('rounds an axis ceiling up to 1 / 2 / 2.5 / 5 × 10^k', () => {
    expect(niceCeil(46_250)).toBe(50_000);
    expect(niceCeil(929_322.5)).toBe(1_000_000);
    expect(niceCeil(1_800)).toBe(2_000);
    expect(niceCeil(2_100)).toBe(2_500);
    expect(niceCeil(0)).toBe(0);
  });

  it('stamps the update time in Karachi time', () => {
    expect(karachiTime('2026-10-19T17:28:00Z')).toBe('10:28 pm');
    expect(karachiTime('2026-10-19T19:05:00Z')).toBe('12:05 am');
  });

  it('names what a balance means instead of relying on red', () => {
    expect(balanceMeaning(40735)).toBe('owed');
    expect(balanceMeaning(-37184)).toBe('overpaid');
    expect(balanceMeaning(0)).toBe('settled');
    expect(balanceMeaning(null)).toBeNull();
  });
});

describe('dashboardModel — filters', () => {
  it('a full month sends no from/to; a range is clamped to the month', () => {
    expect(resolveFilter({ month: '2026-10', dayFrom: 1, dayTo: 31, branchId: null }).query).toEqual({ month: '2026-10' });
    const feb = resolveFilter({ month: '2026-02', dayFrom: 5, dayTo: 31, branchId: A });
    expect(feb.query).toEqual({ month: '2026-02', from: '2026-02-05', to: '2026-02-28', branchId: A });
    expect(feb.fullMonth).toBe(false);
    expect(dayRangeLabel(feb)).toBe('05 to 28');
    // to never falls behind from
    expect(resolveFilter({ month: '2026-10', dayFrom: 20, dayTo: 3, branchId: null }).query).toEqual({ month: '2026-10', from: '2026-10-20', to: '2026-10-20' });
    // Feb 1–28 is the whole month
    expect(resolveFilter({ month: '2026-02', dayFrom: 1, dayTo: 31, branchId: null }).fullMonth).toBe(true);
  });

  it('context line and CSV name match the web', () => {
    const r = resolveFilter({ month: '2026-10', dayFrom: 5, dayTo: 12, branchId: A });
    expect(contextLabel('2026-10', 'Alabad Branch', r)).toBe('October 2026 · Alabad Branch · 05–12 Oct');
    expect(csvFilename('2026-10', 'Alabad Branch', true, r)).toBe('finance-2026-10-alabad-branch-05-12.csv');
    const full = resolveFilter({ month: '2026-10', dayFrom: 1, dayTo: 31, branchId: null });
    expect(contextLabel('2026-10', 'All Branches', full)).toBe('October 2026 · All Branches');
    expect(csvFilename('2026-10', 'All Branches', false, full)).toBe('finance-2026-10.csv');
  });

  it('offers 24 months, newest first, across the year boundary', () => {
    const months = monthOptions('2026-01');
    expect(months).toHaveLength(24);
    expect(months.slice(0, 2)).toEqual(['2026-01', '2025-12']);
    expect(months.at(-1)).toBe('2024-02');
  });
});

describe('dashboardModel — income table', () => {
  it('monthly rows sum per branch, carry last month, and add carry-only branches', () => {
    const rows = sortIncome(incomeRows(fixture(), 'monthly'));
    expect(rows.map((r) => r.branch)).toEqual(['Alabad Branch', 'Banigala Stall', 'Dhok Khaba Branch (inactive)']);
    const [alabad, banigala, dhok] = rows;
    expect(alabad).toMatchObject({ demand: 1600, companyShare: 1200.5, received: 1000, balance: 200.5, lastMonthBalance: 100 });
    expect(banigala).toMatchObject({ balance: -400, lastMonthBalance: null });
    expect(dhok).toMatchObject({ demand: 0, companyShare: 0, received: 0, lastMonthBalance: 200 });
    expect(rows.map(isIdleIncomeRow)).toEqual([false, false, true]);
  });

  it('totals agree with the summary card, and last month only on the monthly view', () => {
    const data = fixture();
    const monthly = incomeTotals(incomeRows(data, 'monthly'), 'monthly');
    expect(monthly).toEqual({ demand: 2000, companyShare: 1500.5, received: 1700, balance: -199.5, lastMonthBalance: 300 });
    expect(monthly.balance).toBe(data.summary.balance);
    expect(incomeTotals(incomeRows(data, 'daily'), 'daily').lastMonthBalance).toBeNull();
  });

  it('weekly buckets are days 1–7, 8–14 …, labelled and clipped to the window', () => {
    const rows = sortIncome(incomeRows(fixture(), 'weekly')).filter((r) => r.branchId === A);
    expect(rows.map((r) => r.period)).toEqual(['Week 1 · 01–07 Oct', 'Week 2 · 08–14 Oct']);
    expect(bucketLabel('weekly', '2026-10-W5', '2026-10-01', '2026-10-30')).toBe('Week 5 · 29–30 Oct');
  });

  it('search matches branch or date', () => {
    const rows = incomeRows(fixture(), 'daily');
    expect(searchIncome(rows, 'bani').map((r) => r.branch)).toEqual(['Banigala Stall']);
    expect(searchIncome(rows, '08 Oct').map((r) => r.period)).toEqual(['08 Oct 2026']);
    expect(searchIncome(rows, '  ')).toHaveLength(rows.length);
  });
});

describe('dashboardModel — expense table', () => {
  it('ledger rows are unassigned company expense; production rows carry return / discount', () => {
    const rows = sortExpense(expenseRows(fixture(), 'monthly'));
    expect(rows.map((r) => [r.branch, r.ledgerHead, r.amount, r.returns, r.discount])).toEqual([
      ['Alabad Branch', 'Production · Return / Discount', null, 50, 0],
      ['Banigala Stall', 'Production · Return / Discount', null, 0, 20],
      [UNASSIGNED_LABEL, 'Fuel', 300, null, null],
      [UNASSIGNED_LABEL, 'Raw Materials', 600, null, null],
    ]);
    expect(expenseTotals(rows)).toEqual({ amount: 900, returns: 50, discount: 20 });
  });

  it('filters by head, by the production rows, and by search', () => {
    const rows = expenseRows(fixture(), 'monthly');
    expect(searchExpense(rows, '', 'h-fuel').map((r) => r.ledgerHead)).toEqual(['Fuel']);
    expect(searchExpense(rows, '', PRODUCTION_HEAD_FILTER).every((r) => r.kind === 'production')).toBe(true);
    expect(searchExpense(rows, 'raw', '').map((r) => r.ledgerHead)).toEqual(['Raw Materials']);
  });
});

describe('dashboardModel — charts', () => {
  it('daily series zero-fills every date of the window', () => {
    const series = dailySeries(fixture());
    expect(series).toHaveLength(31);
    expect(series[0]).toMatchObject({ label: '01', companyShare: 750.25, received: 1000, ledger: 600 });
    expect(series[4]).toMatchObject({ companyShare: 0, received: 0, ledger: 0 });
  });

  it('branch totals put unassigned last; ledger heads rank largest first', () => {
    const totals = branchTotals(fixture());
    expect(totals.map((t) => t.branch)).toEqual(['Alabad Branch', 'Banigala Stall', UNASSIGNED_LABEL]);
    expect(totals[1]).toMatchObject({ balance: -400, discount: 20 });
    expect(totals[2]).toMatchObject({ ledger: 900 });
    expect(ledgerHeadTotals(fixture()).map((h) => [h.name, h.amount, h.entries])).toEqual([
      ['Raw Materials', 600, 2],
      ['Fuel', 300, 1],
    ]);
  });
});

describe('dashboardModel — CSV', () => {
  it('writes both tables with the web headers; null is an empty cell', () => {
    const csv = dashboardCsv(fixture(), 'October 2026 · All Branches', 'monthly', 'monthly').split('\n');
    expect(csv[0]).toBe('Mountain Bakes Finance — October 2026 · All Branches');
    expect(csv[2]).toBe('INCOME');
    expect(csv[3]).toBe('Period,Branch Name,Demand Amount,Company Share,Received Amount,Balance,Last Month Balance');
    expect(csv).toContain('October 2026,Banigala Stall,400,300,700,-400,');
    expect(csv).toContain('Period,Branch Name,Ledger Head,Amount,Return,Discount');
    expect(csv).toContain('October 2026,Alabad Branch,Production · Return / Discount,,50,0');
  });
});
