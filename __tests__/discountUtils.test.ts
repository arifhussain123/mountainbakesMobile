/**
 * @format
 */
import { discountChangeActionLabel, findExistingClaim, isDiscountOpen } from '@/features/discounts/utils';
import { CreateDiscountSchema, ReviseDiscountSchema } from '@/features/discounts/schemas';
import type { BranchDiscount } from '@/api';

describe('isDiscountOpen', () => {
  it('is open while pending or returned', () => {
    expect(isDiscountOpen('pending')).toBe(true);
    expect(isDiscountOpen('returned')).toBe(true);
  });

  it('is terminal once approved or rejected', () => {
    expect(isDiscountOpen('approved')).toBe(false);
    expect(isDiscountOpen('rejected')).toBe(false);
  });
});

describe('discountChangeActionLabel', () => {
  it('reads "Correct" once Production has sent the claim back', () => {
    expect(discountChangeActionLabel('returned')).toBe('Correct');
  });

  it('reads "Change" while still awaiting Production', () => {
    expect(discountChangeActionLabel('pending')).toBe('Change');
  });
});

function makeDiscount(overrides: Partial<BranchDiscount> = {}): BranchDiscount {
  return {
    id: 'd1',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    productionOrderId: 'o1',
    demandNumber: 'DMD-000233',
    amount: 450,
    reason: 'Damaged in transit',
    status: 'pending',
    date: '2026-09-27',
    createdBy: 'u1',
    createdByName: 'Staff',
    createdAt: '2026-09-27T12:01:00.000Z',
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    ...overrides,
  };
}

describe('findExistingClaim', () => {
  it('finds a claim already raised against the same demand', () => {
    const discounts = [makeDiscount({ id: 'd1', productionOrderId: 'o1' }), makeDiscount({ id: 'd2', productionOrderId: 'o2' })];
    expect(findExistingClaim('o1', discounts)?.id).toBe('d1');
  });

  it('returns null when the demand has no existing claim', () => {
    const discounts = [makeDiscount({ id: 'd1', productionOrderId: 'o1' })];
    expect(findExistingClaim('o9', discounts)).toBeNull();
  });
});

describe('CreateDiscountSchema', () => {
  it('accepts a valid claim', () => {
    expect(CreateDiscountSchema.safeParse({ productionOrderId: 'o1', amount: 450, reason: 'Damaged in transit' }).success).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    expect(CreateDiscountSchema.safeParse({ productionOrderId: 'o1', amount: 0, reason: 'abc' }).success).toBe(false);
    expect(CreateDiscountSchema.safeParse({ productionOrderId: 'o1', amount: -5, reason: 'abc' }).success).toBe(false);
  });

  it('rejects an amount with more than 2 decimal places', () => {
    expect(CreateDiscountSchema.safeParse({ productionOrderId: 'o1', amount: 450.123, reason: 'abc' }).success).toBe(false);
  });

  it('rejects a reason under 3 characters', () => {
    expect(CreateDiscountSchema.safeParse({ productionOrderId: 'o1', amount: 450, reason: 'ab' }).success).toBe(false);
  });

  it('rejects a missing demand', () => {
    expect(CreateDiscountSchema.safeParse({ productionOrderId: '', amount: 450, reason: 'abc' }).success).toBe(false);
  });
});

describe('ReviseDiscountSchema', () => {
  it('has no demand field — a revision cannot re-point to a different demand', () => {
    expect('productionOrderId' in ReviseDiscountSchema.shape).toBe(false);
  });

  it('applies the same amount/reason rules as create', () => {
    expect(ReviseDiscountSchema.safeParse({ amount: 600, reason: 'Corrected amount' }).success).toBe(true);
    expect(ReviseDiscountSchema.safeParse({ amount: -1, reason: 'Corrected amount' }).success).toBe(false);
  });
});
