/**
 * @format
 */
import type { LedgerEntry } from '@/api';
import {
  channelsLabel,
  hideDuplicateManualEntries,
  mergeBranchIncomePairs,
  parseAmount,
  shortBranch,
  toDisplayEntries,
} from '@/features/admin/screens/DailyLedger/ledgerDisplay';

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 'e',
    voucherNo: 'RV-1',
    seq: 1,
    entryDate: '2026-10-20',
    ledgerHeadId: 'h1',
    ledgerHeadName: 'Sales',
    ledgerHeadType: 'income',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    description: 'x',
    debit: 0,
    credit: 0,
    balance: 0,
    account: 'cash',
    paymentMethod: null,
    status: 'posted',
    sourceType: 'manual',
    sourceId: null,
    reversesEntryId: null,
    reversedByEntryId: null,
    approvedBy: null,
    approvedByName: null,
    createdBy: null,
    createdByName: null,
    postedAt: '2026-10-20T10:00:00Z',
    ...over,
  };
}

describe('hideDuplicateManualEntries', () => {
  it('hides a manual entry matching a branch-income entry on head, date and amount', () => {
    const income = entry({ id: 'a', sourceType: 'company_share', debit: 750 });
    const dup = entry({ id: 'b', sourceType: 'manual', debit: 750 });
    const other = entry({ id: 'c', sourceType: 'manual', debit: 100 });
    expect(hideDuplicateManualEntries([income, dup, other]).map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('keeps everything when there is no branch income', () => {
    const rows = [entry({ id: 'a', debit: 5 }), entry({ id: 'b', debit: 5 })];
    expect(hideDuplicateManualEntries(rows)).toBe(rows);
  });
});

describe('mergeBranchIncomePairs', () => {
  it('merges a company/branch share pair into one Branch Income row', () => {
    const company = entry({ id: 'c', seq: 1, voucherNo: 'V1', sourceType: 'company_share', sourceId: 's', debit: 750, balance: 750 });
    const branch = entry({ id: 'b', seq: 2, voucherNo: 'V2', sourceType: 'branch_share', sourceId: 's', debit: 250.5, balance: 1000.5 });
    const rows = mergeBranchIncomePairs([branch, company]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'c+b',
      voucherNo: 'V1 / V2',
      ledgerHeadName: 'Branch Income',
      description: 'Branch income collected — Committee Chowk',
      debit: 1000.5,
      credit: 0,
      balance: 1000.5,
      merged: true,
    });
  });

  it('leaves an unpaired share leg alone', () => {
    const lone = entry({ id: 'c', sourceType: 'company_share', sourceId: 's', debit: 750 });
    expect(mergeBranchIncomePairs([lone])).toEqual([lone]);
  });

  it('runs both steps in toDisplayEntries', () => {
    const company = entry({ id: 'c', seq: 1, sourceType: 'company_share', sourceId: 's', debit: 750 });
    const branch = entry({ id: 'b', seq: 2, sourceType: 'branch_share', sourceId: 's', debit: 250, ledgerHeadId: 'h2' });
    const dup = entry({ id: 'm', sourceType: 'manual', debit: 750 });
    expect(toDisplayEntries([company, branch, dup]).map((e) => e.id)).toEqual(['c+b']);
  });
});

describe('helpers', () => {
  it('labels channels like the web', () => {
    expect(channelsLabel({ cashAmount: 10, easypaisaAmount: 0, bankAmount: 5, fuelCharges: 0 })).toBe('Cash + Bank');
    expect(channelsLabel({ cashAmount: 0, easypaisaAmount: 0, bankAmount: 0, fuelCharges: 50 })).toBe('Fuel only');
    expect(channelsLabel({ cashAmount: 0, easypaisaAmount: 0, bankAmount: 0, fuelCharges: 0 })).toBe('—');
  });

  it('shortens branch names and parses amounts', () => {
    expect(shortBranch('Mountain Bakes Committee Chowk')).toBe('Committee Chowk');
    expect(shortBranch(null)).toBe('—');
    expect(parseAmount(' 25 ')).toBe(25);
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('abc')).toBeUndefined();
  });
});
