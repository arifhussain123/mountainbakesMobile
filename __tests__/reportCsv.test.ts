/**
 * @format
 */
import type { FinanceReport } from '@/api/types';
import { reportToCsv } from '@/features/finance/utils/reportCsv';
import { approverLabel, formatMoney2, formatStamp, moneyWords } from '@/features/finance/utils/financeFormat';

const report: FinanceReport = {
  type: 'daily_cash_book',
  title: 'Daily Cash Book',
  subtitle: 'Cash book for 2026-10-18',
  periodFrom: '2026-10-18',
  periodTo: '2026-10-18',
  generatedAt: '2026-10-18T21:00:00.000Z',
  generatedBy: 'finance@mountainbakes.com',
  columns: [
    { key: 'voucherNo', label: 'Voucher No' },
    { key: 'description', label: 'Description' },
    { key: 'debit', label: 'Debit', format: 'money' },
    { key: 'credit', label: 'Credit', format: 'money' },
    { key: 'balance', label: 'Balance', format: 'money' },
  ],
  rows: [
    { voucherNo: 'RV-1', description: 'CT-000061, Alabad', debit: 24262.5, credit: null, balance: 45940.99 },
    { voucherNo: 'PV-2', description: 'Fuel "van"', debit: null, credit: 300, balance: 45640.99 },
  ],
  totals: { debit: 24262.5, credit: 300 },
  summary: [{ label: 'Opening Balance', value: 38778.49, format: 'money' }],
};

describe('reportToCsv', () => {
  it('writes the screen balances in place of the stored ones and quotes text cells', () => {
    const csv = reportToCsv(report, [63040.99, 62740.99]).split('\n');
    expect(csv[0]).toBe('Mountain Bakes · Daily Cash Book');
    expect(csv).toContain('Opening Balance,38778.49');
    expect(csv).toContain('Voucher No,Description,Debit,Credit,Balance');
    expect(csv).toContain('RV-1,"CT-000061, Alabad",24262.50,,63040.99');
    expect(csv).toContain('PV-2,"Fuel ""van""",,300.00,62740.99');
    expect(csv[csv.length - 1]).toBe('Total,,24262.50,300.00,');
  });

  it('leaves the balance empty for a filtered book and keeps server balances when none are given', () => {
    expect(reportToCsv(report, [null, null])).toContain('RV-1,"CT-000061, Alabad",24262.50,,\n');
    expect(reportToCsv(report)).toContain('24262.50,,45940.99');
  });
});

describe('finance formatting', () => {
  it('always shows two decimals and a leading minus', () => {
    expect(formatMoney2(24262.5)).toBe('Rs. 24,262.50');
    expect(formatMoney2(-6128)).toBe('-Rs. 6,128.00');
    expect(formatMoney2(null)).toBe('—');
    expect(moneyWords(-40735)).toBe('minus 40,735.00 rupees');
  });

  it('stamps in Karachi time', () => {
    expect(formatStamp('2026-10-17T21:04:00.000Z')).toBe('18 Oct 2026 · 02:04 AM');
    expect(formatStamp(null)).toBe('—');
  });

  it('labels an approver by name when one is known', () => {
    expect(approverLabel('finance@mountainbakes.com', 'Finance Admin')).toBe('Finance Admin (finance@mountainbakes.com)');
    expect(approverLabel('finace@mountainbakes.com')).toBe('finace@mountainbakes.com');
    expect(approverLabel(null)).toBe('—');
  });
});
