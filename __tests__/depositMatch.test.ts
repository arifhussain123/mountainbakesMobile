/**
 * @format
 */
import { findLikelyDeposit } from '@/features/closing/calculations/depositMatch';
import type { CashTransfer } from '@/api';

function makeTransfer(overrides: Partial<CashTransfer>): CashTransfer {
  return {
    id: 'ct-1',
    transferNo: 'CT-000055',
    branchId: 'branch-1',
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
    createdBy: null,
    createdByName: null,
    createdAt: '2026-10-16T05:00:00Z',
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    approvalNote: null,
    rejectionReason: null,
    voucherNo: null,
    updatedAt: '2026-10-16T05:00:00Z',
    attachments: [],
    ...overrides,
  };
}

describe('findLikelyDeposit', () => {
  it('matches a deposit dated the day after the sale, to the rupee (ignoring the share\'s 50 paisa)', () => {
    // Reference: 15-10 Company Share Rs. 22,537.50, deposited 16-10 as CT-000055 Rs. 22,537.
    const transfer = makeTransfer({ amount: 22537, date: '2026-10-16' });
    expect(findLikelyDeposit(22537.5, '2026-10-15', [transfer])).toBe(transfer);
  });

  it('matches a deposit dated the same day', () => {
    const transfer = makeTransfer({ amount: 1000, date: '2026-10-15' });
    expect(findLikelyDeposit(1000, '2026-10-15', [transfer])).toBe(transfer);
  });

  it('does not match a deposit dated beyond the 2-day window', () => {
    const transfer = makeTransfer({ amount: 1000, date: '2026-10-18' });
    expect(findLikelyDeposit(1000, '2026-10-15', [transfer])).toBeNull();
  });

  it('does not match a deposit dated before the sale day', () => {
    const transfer = makeTransfer({ amount: 1000, date: '2026-10-14' });
    expect(findLikelyDeposit(1000, '2026-10-15', [transfer])).toBeNull();
  });

  it('does not match on a different amount', () => {
    const transfer = makeTransfer({ amount: 1500, date: '2026-10-16' });
    expect(findLikelyDeposit(1000, '2026-10-15', [transfer])).toBeNull();
  });

  it('picks the nearest-dated match when more than one transfer agrees on amount', () => {
    const far = makeTransfer({ id: 'ct-far', amount: 1000, date: '2026-10-17' });
    const near = makeTransfer({ id: 'ct-near', amount: 1000, date: '2026-10-15' });
    expect(findLikelyDeposit(1000, '2026-10-15', [far, near])).toBe(near);
  });

  it('returns null for a zero or negative Company Share — nothing to match', () => {
    const transfer = makeTransfer({ amount: 0, date: '2026-10-15' });
    expect(findLikelyDeposit(0, '2026-10-15', [transfer])).toBeNull();
  });
});
