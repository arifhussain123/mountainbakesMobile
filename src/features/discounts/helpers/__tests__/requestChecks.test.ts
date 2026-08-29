import type { BranchDiscount } from '@/shared/types/discount.types';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';

import {
  claimedAgainst,
  demandEstimate,
  openClaimOn,
  requestProblems,
  sanitiseMoney,
} from '../requestChecks';

/**
 * The quick-raise checks.
 *
 * Two of them are exact and one is not, and keeping that straight is the point:
 * how much has already been claimed is real money from real claims, while what
 * the demand was *worth* has to be summed from an optional per-line price and
 * can therefore come out too low. The first may gate; the second may not.
 */

function claim(over: Partial<BranchDiscount> = {}): BranchDiscount {
  return {
    id: 'c1',
    productionOrderId: 'po1',
    demandNumber: 'DMD-000001',
    amount: 500,
    status: 'pending',
    reason: 'crushed',
    date: '2026-08-28',
    createdAt: '2026-08-28T09:00:00.000Z',
    reviewedAt: null,
    ...over,
  } as BranchDiscount;
}

function order(items: Array<{ qty: number; unitPrice?: number }>): BranchProductionOrder {
  return {
    id: 'po1',
    demandNumber: 'DMD-000001',
    date: '2026-08-28',
    items: items.map((i, n) => ({ productId: `p${n}`, productName: `P${n}`, ...i })),
  } as unknown as BranchProductionOrder;
}

describe('sanitiseMoney', () => {
  it('allows paise, because the server does', () => {
    expect(sanitiseMoney('750.50')).toBe('750.50');
  });

  it('refuses a second point and a third place', () => {
    expect(sanitiseMoney('7.5.0')).toBe('7.50');
    expect(sanitiseMoney('750.555')).toBe('750.55');
  });

  it('drops grouping and anything else that is not a figure', () => {
    expect(sanitiseMoney('1,200')).toBe('1200');
  });

  it('completes a leading point rather than leaving it bare', () => {
    // ".5" is a real thing to type for half a rupee.
    expect(sanitiseMoney('.5')).toBe('0.5');
  });

  it('leaves a bare whole number alone', () => {
    expect(sanitiseMoney('500')).toBe('500');
  });
});

describe('demandEstimate', () => {
  it('sums the lines that carry a rate', () => {
    expect(demandEstimate(order([{ qty: 2, unitPrice: 100 }, { qty: 3, unitPrice: 50 }]))).toEqual({
      value: 350,
      incomplete: false,
    });
  });

  it('flags a demand it cannot total, rather than quietly undercounting', () => {
    /*
     * The reason this figure can never be a ceiling: `unitPrice` is optional, so
     * a demand with one unpriced line sums LOW, and gating on it would refuse a
     * legitimate claim the server would have accepted.
     */
    const est = demandEstimate(order([{ qty: 2, unitPrice: 100 }, { qty: 5 }]));
    expect(est.incomplete).toBe(true);
    expect(est.value).toBe(200);
  });

  it('is empty and complete for no order at all', () => {
    expect(demandEstimate(null)).toEqual({ value: 0, incomplete: false });
  });
});

describe('claimedAgainst', () => {
  it('sums what is still live against one demand', () => {
    const claims = [
      claim({ id: 'a', amount: 300 }),
      claim({ id: 'b', amount: 200, status: 'approved' }),
      claim({ id: 'other', amount: 999, productionOrderId: 'po2' }),
    ];
    expect(claimedAgainst(claims, 'po1')).toBe(500);
  });

  it('excludes a rejected claim, which conceded nothing', () => {
    const claims = [claim({ id: 'a', amount: 300 }), claim({ id: 'b', amount: 400, status: 'rejected' })];
    expect(claimedAgainst(claims, 'po1')).toBe(300);
  });

  it('counts a returned claim, which the branch can still resend', () => {
    const claims = [
      claim({ id: 'b', amount: 400, status: 'returned', reviewedAt: '2026-08-28T11:00:00.000Z' }),
    ];
    expect(claimedAgainst(claims, 'po1')).toBe(400);
  });
});

describe('openClaimOn', () => {
  it('finds a pending claim on the same demand', () => {
    expect(openClaimOn([claim()], 'po1')?.id).toBe('c1');
  });

  it('finds a RETURNED one too — that is the claim to fix, not duplicate', () => {
    const sentBack = claim({ status: 'returned', reviewedAt: '2026-08-28T11:00:00.000Z' });
    expect(openClaimOn([sentBack], 'po1')).not.toBeNull();
  });

  it('ignores a decided claim, which no longer blocks a fresh one', () => {
    expect(openClaimOn([claim({ status: 'approved' })], 'po1')).toBeNull();
    expect(openClaimOn([claim({ status: 'rejected' })], 'po1')).toBeNull();
  });

  it('ignores a claim on a different demand', () => {
    expect(openClaimOn([claim({ productionOrderId: 'po2' })], 'po1')).toBeNull();
  });
});

describe('requestProblems', () => {
  const ok = { productionOrderId: 'po1', amount: '500', reason: 'Two crates crushed', claims: [] };

  it('lets a complete form send', () => {
    const p = requestProblems(ok);
    expect(p.canSend).toBe(true);
    expect(p.demand).toBeNull();
    expect(p.amount).toBeNull();
    expect(p.reason).toBeNull();
  });

  it('asks for a demand first', () => {
    const p = requestProblems({ ...ok, productionOrderId: null });
    expect(p.demand).toMatch(/Pick the demand/);
    expect(p.canSend).toBe(false);
  });

  it('blocks a second claim while one is still open, and says where to go', () => {
    const p = requestProblems({ ...ok, claims: [claim()] });
    expect(p.demand).toMatch(/already a claim/);
    expect(p.demand).toMatch(/Discount Claims/);
    expect(p.canSend).toBe(false);
  });

  it('does not block when the earlier claim was decided', () => {
    const p = requestProblems({ ...ok, claims: [claim({ status: 'approved' })] });
    expect(p.canSend).toBe(true);
  });

  it.each([
    ['', /Enter the amount/],
    ['0', /more than 0/],
    ['20000000', /looks wrong/],
  ])('refuses the amount %p', (amount, matcher) => {
    const p = requestProblems({ ...ok, amount: amount as string });
    expect(p.amount).toMatch(matcher as RegExp);
    expect(p.canSend).toBe(false);
  });

  it('requires a reason, because Production decides on it', () => {
    const p = requestProblems({ ...ok, reason: '   ' });
    expect(p.reason).toMatch(/Say what the claim is for/);
    expect(p.canSend).toBe(false);
  });

  it('hints at a short reason without blocking it', () => {
    const p = requestProblems({ ...ok, reason: 'damaged' });
    expect(p.reason).toBeNull();
    expect(p.reasonHint).toMatch(/settles it faster/);
    // Advisory, and that is the whole distinction.
    expect(p.canSend).toBe(true);
  });

  it('never gates on the demand value — that figure can be too low', () => {
    // A claim far above any plausible demand still sends: the server accepts it,
    // and the estimate that would refuse it is not reliable enough to say no.
    const p = requestProblems({ ...ok, amount: '9999999' });
    expect(p.canSend).toBe(true);
  });
});
