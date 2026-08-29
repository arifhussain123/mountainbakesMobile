import type { BranchDiscount } from '@/shared/types/discount.types';

import { isDiscountOpen, isFinal, matchesClaim, sortClaims, turnaround } from '../claimState';

/**
 * What "still open" means, and the one way of getting it wrong that costs money.
 *
 * The tempting rule is "open until it has been reviewed". It is wrong here:
 * `reviewedAt` is stamped on all three review outcomes, `returned` included,
 * because a send-back IS a review. A returned claim therefore carries a review
 * timestamp and must still be editable — being editable again is the entire
 * point of Production returning it. Gating on the timestamp would strand exactly
 * the claims the branch was asked to correct.
 */

function claim(over: Partial<BranchDiscount> = {}): BranchDiscount {
  return {
    id: 'c1',
    branchId: 'b1',
    branchName: 'Saddar',
    productionOrderId: 'po1',
    demandNumber: 'DMD-000001',
    amount: 500,
    reason: 'Two crates arrived crushed',
    status: 'pending',
    date: '2026-08-28',
    createdBy: 'u1',
    createdByName: 'Ayesha',
    createdAt: '2026-08-28T09:00:00.000Z',
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    ...over,
  } as BranchDiscount;
}

describe('isDiscountOpen', () => {
  it('treats a pending claim as the branch’s to change', () => {
    expect(isDiscountOpen('pending')).toBe(true);
  });

  it('treats a RETURNED claim as open — it is a request to correct', () => {
    expect(isDiscountOpen('returned')).toBe(true);
  });

  it.each(['approved', 'rejected'] as const)('treats %s as final', status => {
    expect(isDiscountOpen(status)).toBe(false);
    expect(isFinal(claim({ status }))).toBe(true);
  });

  it('does not follow the review timestamp', () => {
    /*
     * The case that breaks a timestamp-based rule: Production sent this back,
     * which stamped `reviewedAt` — and the branch must still be able to fix it.
     */
    const sentBack = claim({
      status: 'returned',
      reviewedAt: '2026-08-28T11:00:00.000Z',
      reviewedByName: 'Production',
      reviewNote: 'Which crates? Give the item names.',
    });
    expect(sentBack.reviewedAt).not.toBeNull();
    expect(isDiscountOpen(sentBack.status)).toBe(true);
    expect(isFinal(sentBack)).toBe(false);
  });
});

describe('turnaround', () => {
  it('says nothing for a claim nobody has looked at', () => {
    // Not "0 min" — an unreviewed claim has no turnaround, and zero reads as
    // instant.
    expect(turnaround(claim())).toBeNull();
  });

  it('reports minutes under the hour', () => {
    expect(
      turnaround(
        claim({
          createdAt: '2026-08-28T09:00:00.000Z',
          reviewedAt: '2026-08-28T09:25:00.000Z',
        }),
      ),
    ).toBe('25 min');
  });

  it('switches to hours, then days, so it stays sayable', () => {
    expect(
      turnaround(
        claim({
          createdAt: '2026-08-28T09:00:00.000Z',
          reviewedAt: '2026-08-28T14:00:00.000Z',
        }),
      ),
    ).toBe('5 hours');

    expect(
      turnaround(
        claim({
          createdAt: '2026-08-20T09:00:00.000Z',
          reviewedAt: '2026-08-23T09:00:00.000Z',
        }),
      ),
    ).toBe('3 days');
  });

  it('returns null rather than NaN on an unusable timestamp', () => {
    expect(turnaround(claim({ reviewedAt: 'not-a-date' }))).toBeNull();
  });
});

describe('sortClaims', () => {
  it('puts what can still be changed first, then newest', () => {
    const sorted = sortClaims([
      claim({ id: 'old-approved', status: 'approved', createdAt: '2026-08-27T09:00:00.000Z' }),
      claim({ id: 'new-approved', status: 'approved', createdAt: '2026-08-29T09:00:00.000Z' }),
      claim({ id: 'returned', status: 'returned', createdAt: '2026-08-20T09:00:00.000Z' }),
      claim({ id: 'pending', status: 'pending', createdAt: '2026-08-28T09:00:00.000Z' }),
    ]);

    // Both open ones lead, newest first among them — even though the returned
    // claim is the oldest row in the list.
    expect(sorted.map(c => c.id)).toEqual(['pending', 'returned', 'new-approved', 'old-approved']);
  });
});

describe('matchesClaim', () => {
  it('finds a claim by its demand number and by its reason', () => {
    const c = claim();
    expect(matchesClaim(c, 'dmd-000001')).toBe(true);
    expect(matchesClaim(c, 'crushed')).toBe(true);
    expect(matchesClaim(c, 'nothing like this')).toBe(false);
  });

  it('matches everything on an empty query', () => {
    expect(matchesClaim(claim(), '')).toBe(true);
  });
});
