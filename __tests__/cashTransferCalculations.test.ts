/**
 * @format
 */
import type { CashTransfer } from '@/api';
import { computeCashTransferTotals, isTransferFinal, matchesChannel } from '@/features/cash/calculations';

function transfer(overrides: Partial<CashTransfer> = {}): CashTransfer {
  return {
    id: 't1',
    transferNo: 'CT-000055',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    cashAmount: 0,
    easypaisaAmount: 0,
    bankAmount: 0,
    amount: 0,
    fuelCharges: 0,
    paymentMethod: null,
    note: null,
    date: '2026-10-16',
    status: 'pending',
    createdBy: 'u1',
    createdByName: 'User',
    createdAt: '2026-10-16T10:02:00.000Z',
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    approvalNote: null,
    rejectionReason: null,
    voucherNo: null,
    updatedAt: '2026-10-16T10:02:00.000Z',
    attachments: [],
    ...overrides,
  };
}

describe('matchesChannel', () => {
  it('matches a channel only when its own amount is greater than zero', () => {
    const t = transfer({ cashAmount: 500, easypaisaAmount: 0, bankAmount: 0 });
    expect(matchesChannel(t, 'cash')).toBe(true);
    expect(matchesChannel(t, 'easypaisa')).toBe(false);
    expect(matchesChannel(t, 'bank_account')).toBe(false);
  });

  it('a fuel-only transfer matches no channel', () => {
    const t = transfer({ fuelCharges: 300 });
    expect(matchesChannel(t, 'cash')).toBe(false);
    expect(matchesChannel(t, 'easypaisa')).toBe(false);
    expect(matchesChannel(t, 'bank_account')).toBe(false);
  });
});

describe('computeCashTransferTotals', () => {
  it('never includes fuel charges in totalTransferred — fuel is DB-excluded from amount, not a client choice', () => {
    const transfers = [transfer({ amount: 1000, cashAmount: 1000, fuelCharges: 300 })];
    const totals = computeCashTransferTotals(transfers);
    expect(totals.totalTransferred).toBe(1000);
    expect(totals.fuelCharges).toBe(300);
  });

  it('sums each channel and pending amount/count independently', () => {
    const transfers = [
      transfer({ status: 'pending', amount: 500, cashAmount: 500 }),
      transfer({ status: 'approved', amount: 700, easypaisaAmount: 700 }),
      transfer({ status: 'rejected', amount: 200, bankAmount: 200 }),
    ];
    const totals = computeCashTransferTotals(transfers);
    expect(totals.totalTransferred).toBe(1400);
    expect(totals.cash).toBe(500);
    expect(totals.easypaisa).toBe(700);
    expect(totals.bank).toBe(200);
    expect(totals.pendingAmount).toBe(500);
    expect(totals.pendingCount).toBe(1);
  });

  it('supports half-rupee amounts without losing precision', () => {
    const transfers = [transfer({ amount: 19387.5, cashAmount: 19387.5 })];
    expect(computeCashTransferTotals(transfers).totalTransferred).toBe(19387.5);
  });

  it('returns all zeros for an empty list', () => {
    expect(computeCashTransferTotals([])).toEqual({
      totalTransferred: 0,
      cash: 0,
      easypaisa: 0,
      bank: 0,
      fuelCharges: 0,
      pendingAmount: 0,
      pendingCount: 0,
    });
  });
});

describe('isTransferFinal', () => {
  it('pending is not final', () => {
    expect(isTransferFinal('pending')).toBe(false);
  });

  it('approved and rejected are both final — there is no edit/withdraw for either', () => {
    expect(isTransferFinal('approved')).toBe(true);
    expect(isTransferFinal('rejected')).toBe(true);
  });
});
