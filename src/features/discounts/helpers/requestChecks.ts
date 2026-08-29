import type { BranchDiscount } from '@/shared/types/discount.types';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';

import { isDiscountOpen } from './claimState';

/**
 * The checks the quick-raise form runs before it will send.
 *
 * All of them are the client explaining itself, not a control: the create route
 * verifies the demand belongs to the branch and validates the amount as *money*
 * (positive, ≤10,000,000, two decimals) and nothing else. It does not compare
 * the amount to anything, and it does not look for an existing claim. So every
 * rule below exists to save a round trip and a bounced claim, and none of it may
 * be described as something the server would have caught.
 */

/**
 * Keep a money field to one point and two places.
 *
 * The server takes `multipleOf(0.01)`, so paise are legal — a short delivery can
 * genuinely be Rs. 750.50. What is not legal is `7.5.0` or `750.555`, and the
 * cheapest place to stop those is the keystroke rather than a 400.
 */
export function sanitiseMoney(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [first = '', ...rest] = cleaned.split('.');
  // A leading point is a real thing to type — ".5" means half a rupee — and
  // leaving it bare gives a value `Number` reads but nobody proof-reads.
  const whole = first === '' && rest.length > 0 ? '0' : first;
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

export interface DemandEstimate {
  /** Σ qty × unitPrice over the lines that carry a price. */
  value: number;
  /**
   * True when at least one line has no `unitPrice`.
   *
   * Load-bearing: `unitPrice` is optional and its own type comment says to treat
   * a missing one as an unknown rate rather than zero. So a sum over incomplete
   * lines UNDERSTATES the demand, and anything built on it has to say so — which
   * is exactly why this figure is advisory and never a ceiling. Blocking on a
   * total that is too low would refuse a legitimate claim the server would have
   * accepted, on the screen whose whole purpose is claiming money back.
   */
  incomplete: boolean;
}

/**
 * What a demand came to, as far as the lines can say.
 *
 * There is no order-level total in this system — a demand carries quantities and
 * Production works out the money — so this is summed here and marked as an
 * estimate wherever it is shown.
 */
export function demandEstimate(order: BranchProductionOrder | null | undefined): DemandEstimate {
  if (!order) return { value: 0, incomplete: false };
  let value = 0;
  let incomplete = false;
  for (const item of order.items ?? []) {
    const rate = item.unitPrice;
    if (rate === undefined || rate === null) {
      incomplete = true;
      continue;
    }
    value += (item.approvedQty ?? item.qty ?? 0) * rate;
  }
  return { value, incomplete };
}

/**
 * What has already been claimed against one demand.
 *
 * Exact, unlike the estimate above — these are real claims with real amounts.
 *
 * `rejected` is excluded because Production refused it: that money was never
 * conceded and does not consume the demand. `returned` IS counted — it is a
 * claim the branch still owns and can still resend, so treating it as spent is
 * the honest reading.
 */
export function claimedAgainst(
  claims: readonly BranchDiscount[],
  productionOrderId: string,
): number {
  return claims
    .filter(c => c.productionOrderId === productionOrderId && c.status !== 'rejected')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}

/**
 * An existing claim on this demand that the branch should fix instead of
 * raising a second one.
 *
 * `isDiscountOpen`, not "unreviewed". A `returned` claim has been reviewed — a
 * send-back is a review — and it is precisely the one to correct rather than
 * duplicate. Raising a second claim before the first is answered is how a branch
 * ends up with both bounced.
 */
export function openClaimOn(
  claims: readonly BranchDiscount[],
  productionOrderId: string,
): BranchDiscount | null {
  return (
    claims.find(c => c.productionOrderId === productionOrderId && isDiscountOpen(c.status)) ?? null
  );
}

/** Below this, the reason earns a hint. Advisory — never a block. */
export const REASON_HINT_MIN = 12;

export interface RequestProblems {
  /** Stated next to the field that caused it. Empty when the form would send. */
  demand: string | null;
  amount: string | null;
  reason: string | null;
  /** Advisory only: shown, but does not stop Send. */
  reasonHint: string | null;
  canSend: boolean;
}

/**
 * Everything wrong with the form, in the order a person would fix it.
 *
 * The over-claim case is deliberately NOT here. It is surfaced as guidance
 * beside the amount instead, because the figure it would test against is an
 * estimate that can be too low — see `DemandEstimate.incomplete`.
 */
export function requestProblems(input: {
  productionOrderId: string | null;
  amount: string;
  reason: string;
  claims: readonly BranchDiscount[];
}): RequestProblems {
  const { productionOrderId, amount, reason, claims } = input;

  const demand = !productionOrderId
    ? 'Pick the demand this claim is against.'
    : openClaimOn(claims, productionOrderId)
      ? 'There is already a claim on this demand waiting on Production. Change that one from Discount Claims rather than raising a second.'
      : null;

  const parsed = Number(amount);
  const amountProblem =
    amount.trim() === ''
      ? 'Enter the amount claimed.'
      : !Number.isFinite(parsed) || parsed <= 0
        ? 'Amount must be more than 0.'
        : parsed > 10_000_000
          ? 'That amount looks wrong — check the figure.'
          : null;

  const trimmed = reason.trim();
  const reasonProblem = trimmed === '' ? 'Say what the claim is for.' : null;
  const reasonHint =
    reasonProblem === null && trimmed.length < REASON_HINT_MIN
      ? 'Production reads this to decide. A line more detail usually settles it faster.'
      : null;

  return {
    demand,
    amount: amountProblem,
    reason: reasonProblem,
    reasonHint,
    canSend: demand === null && amountProblem === null && reasonProblem === null,
  };
}
