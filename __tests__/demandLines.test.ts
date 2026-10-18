/**
 * @format
 */
import {
  effectiveQty,
  fulfilledTotals,
  isActiveOrder,
  isVerified,
  liveItems,
  requestedTotals,
} from '@/features/orders/utils/demandLines';
import type { ProductionOrder, ProductionOrderItem } from '@/api';

function item(overrides: Partial<ProductionOrderItem>): ProductionOrderItem {
  return { productId: 'p1', productName: 'Cream Puff', qty: 10, remarks: '', ...overrides };
}

function order(overrides: Partial<ProductionOrder>): ProductionOrder {
  return {
    id: 'o1',
    demandNumber: 'DMD-000001',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    date: '2026-10-16',
    time: '08:00 PM',
    items: [],
    status: 'pending',
    createdBy: 'u1',
    createdByName: 'User',
    submittedAt: '2026-10-16T15:00:00.000Z',
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    ...overrides,
  };
}

describe('effectiveQty', () => {
  it('reads the branch request until a line is reviewed', () => {
    expect(effectiveQty(item({ qty: 10 }))).toBe(10);
  });

  it('reads the reviewed/verified figure once set, including an explicit 0', () => {
    expect(effectiveQty(item({ qty: 10, approvedQty: 7 }))).toBe(7);
    expect(effectiveQty(item({ qty: 10, approvedQty: 0 }))).toBe(0);
  });
});

describe('liveItems', () => {
  it('drops lines with no quantity behind them', () => {
    const items = [item({ productId: 'a', qty: 5 }), item({ productId: 'b', qty: 10, approvedQty: 0 })];
    expect(liveItems(items).map((i) => i.productId)).toEqual(['a']);
  });
});

describe('requestedTotals', () => {
  it('counts what the branch asked for, excluding lines Production added', () => {
    const o = order({
      items: [
        item({ productId: 'a', qty: 5 }),
        item({ productId: 'b', qty: 3, addedByProduction: true }),
      ],
    });
    expect(requestedTotals(o)).toEqual({ products: 1, qty: 5 });
  });

  it('still counts a line reviewed down to 0 — it was still demanded', () => {
    const o = order({ items: [item({ productId: 'a', qty: 5, approvedQty: 0 })] });
    expect(requestedTotals(o)).toEqual({ products: 1, qty: 5 });
  });
});

describe('fulfilledTotals / isVerified', () => {
  it('is not verified without a verifiedAt stamp, even if status looks settled', () => {
    const o = order({ status: 'approved', items: [item({ qty: 5, approvedQty: 5 })] });
    expect(isVerified(o)).toBe(false);
  });

  it('sums the counted quantity once verified', () => {
    const o = order({ verifiedAt: '2026-10-16T18:00:00.000Z', items: [item({ productId: 'a', qty: 10, approvedQty: 8 })] });
    expect(isVerified(o)).toBe(true);
    expect(fulfilledTotals(o)).toEqual({ products: 1, qty: 8 });
  });
});

describe('isActiveOrder', () => {
  it('treats pending and awaiting_verification as needing branch action', () => {
    expect(isActiveOrder(order({ status: 'pending' }))).toBe(true);
    expect(isActiveOrder(order({ status: 'awaiting_verification' }))).toBe(true);
  });

  it('treats verified, approved, rejected and cancelled as history — the branch has nothing left to do', () => {
    expect(isActiveOrder(order({ status: 'verified' }))).toBe(false);
    expect(isActiveOrder(order({ status: 'approved' }))).toBe(false);
    expect(isActiveOrder(order({ status: 'rejected' }))).toBe(false);
    expect(isActiveOrder(order({ status: 'cancelled' }))).toBe(false);
  });
});
