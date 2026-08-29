import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBranchDiscount,
  getBranchDiscounts,
  reviseBranchDiscount,
  withdrawBranchDiscount,
} from '@/api/services/discountsService';
import { qk } from '@/api/queryKeys';
import { ApiError } from '@/api/errors';
import { businessDateStr } from '@/shared/utils/timezone';
import type { BranchDiscount } from '@/shared/types/discount.types';

import { isDiscountOpen, sortClaims } from '../helpers/claimState';

/**
 * The branch's discount claims, and the three things it may do to one.
 *
 * ---------------------------------------------------------------------------
 * Every mutation refetches, and that is not belt-and-braces
 * ---------------------------------------------------------------------------
 * The server assigns the id, and — more to the point — it may have *reviewed*
 * something since this list was fetched. A claim the screen still believes is
 * open can already be approved, and the 409 that follows is the honest outcome
 * rather than a bug. Invalidating after every write is what stops the next
 * action being taken against a stale idea of who owns the claim.
 *
 * ---------------------------------------------------------------------------
 * Live, not queued
 * ---------------------------------------------------------------------------
 * The router carries no idempotency keys and `POST` creates rather than
 * upserting, so a queued retry would raise a second claim for one delivery. See
 * `discountsService`.
 */

/** The window asked for. Inside the server's 1–365 clamp, so it may be stated. */
export const WINDOW_DAYS = 90;

export type ClaimBusy = 'create' | 'revise' | 'withdraw' | null;

export interface ClaimTotals {
  /** Every claim in the window, whatever became of it. */
  claimed: number;
  approved: number;
  /** The only figure that is a task — money still under the branch's control. */
  awaitingReview: number;
  awaitingCount: number;
}

export interface BranchDiscountsApi {
  claims: BranchDiscount[];
  totals: ClaimTotals;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => void;

  busy: ClaimBusy;
  actionError: string | null;
  outcome: string | null;
  dismiss: () => void;

  create: (input: { productionOrderId: string; amount: number; reason: string }) => Promise<boolean>;
  revise: (id: string, input: { amount: number; reason: string }) => Promise<boolean>;
  withdraw: (id: string) => Promise<boolean>;
}

export function useBranchDiscounts(days = WINDOW_DAYS): BranchDiscountsApi {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.discounts.list(days),
    queryFn: () => getBranchDiscounts(days),
  });

  const claims = useMemo(() => sortClaims(query.data ?? []), [query.data]);

  const totals = useMemo<ClaimTotals>(() => {
    let claimed = 0;
    let approved = 0;
    let awaitingReview = 0;
    let awaitingCount = 0;

    for (const claim of claims) {
      const amount = Number(claim.amount) || 0;
      claimed += amount;
      if (claim.status === 'approved') approved += amount;
      /*
       * Awaiting review is both open states, not just `pending`. A returned
       * claim is still the branch's to act on — it is money the branch can still
       * recover by correcting and resending — so leaving it out would understate
       * the one figure that is a task.
       */
      if (isDiscountOpen(claim.status)) {
        awaitingReview += amount;
        awaitingCount += 1;
      }
    }
    return { claimed, approved, awaitingReview, awaitingCount };
  }, [claims]);

  const [busy, setBusy] = useState<ClaimBusy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setActionError(null);
    setOutcome(null);
  }, []);

  const refetch = useCallback(() => {
    query.refetch().catch(() => undefined);
  }, [query]);

  /**
   * One wrapper for all three, because their failure handling is identical and
   * the interesting part is the 409.
   *
   * A 409 here always means the same thing — Production got there first — and
   * the server's own sentence says which way it went. Replacing it with "could
   * not save" would send someone to check their connection over a claim that was
   * simply already decided.
   */
  const run = useCallback(
    async (kind: NonNullable<ClaimBusy>, work: () => Promise<unknown>, done: string) => {
      if (busy) return false;
      setBusy(kind);
      setActionError(null);
      setOutcome(null);
      try {
        await work();
        await queryClient.invalidateQueries({ queryKey: qk.discounts.all() });
        setOutcome(done);
        return true;
      } catch (err) {
        setActionError(
          err instanceof ApiError && err.status === 409
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not complete that. Please try again.',
        );
        return false;
      } finally {
        setBusy(null);
      }
    },
    [busy, queryClient],
  );

  const create = useCallback(
    (input: { productionOrderId: string; amount: number; reason: string }) =>
      run(
        'create',
        () =>
          createBranchDiscount({
            ...input,
            // Captured on the device, like every other write here: a claim raised
            // at 21:00 belongs to the evening it was raised, and the day rolls at
            // 02:00 rather than midnight.
            businessDate: businessDateStr(),
          }),
        'Claim raised.',
      ),
    [run],
  );

  const revise = useCallback(
    (id: string, input: { amount: number; reason: string }) =>
      run('revise', () => reviseBranchDiscount(id, input), 'Claim updated and sent back for review.'),
    [run],
  );

  const withdraw = useCallback(
    (id: string) => run('withdraw', () => withdrawBranchDiscount(id), 'Claim withdrawn.'),
    [run],
  );

  return {
    claims,
    totals,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch,
    busy,
    actionError,
    outcome,
    dismiss,
    create,
    revise,
    withdraw,
  };
}
