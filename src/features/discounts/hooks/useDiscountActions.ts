import { useRef, useState } from 'react';
import { enqueueOfflineWrite, generateIdempotencyKey, isApiError, useReviseBranchDiscount, useWithdrawBranchDiscount } from '@/api';
import { useNetworkStatus } from '@/shared/hooks';
import { useOfflineQueueStore } from '@/state';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ReviseBranchDiscountInput } from '@/api';

export const CLAIM_ALREADY_REVIEWED_MESSAGE = "Production has already reviewed this claim. It's now final.";

/** `true` while a queued-but-not-yet-synced revise/withdraw exists for this claim id — disables further edits so offline actions never stack. */
export function useHasPendingDiscountAction(discountId: string): boolean {
  const writes = useOfflineQueueStore((state) => state.writes);
  return writes.some((w) => (w.status === 'pending' || w.status === 'syncing') && w.endpoint === `/branch-discounts/${discountId}`);
}

/**
 * Revise and withdraw are naturally idempotent (a PUT/DELETE retried with the
 * same body converges to the same end state), unlike create — so both go
 * through the offline write-queue with an idempotency key. Both also race
 * against Production's own review: the server's `.in('status', ['pending',
 * 'returned'])` guard on these same routes returns 409 the instant that race
 * is lost, and this hook never leaves an optimistic edit in place when that
 * happens — it always refetches the real row.
 */
export function useDiscountActions() {
  const revise = useReviseBranchDiscount();
  const withdraw = useWithdrawBranchDiscount();
  const { isOffline } = useNetworkStatus();
  const [raceError, setRaceError] = useState<string | null>(null);

  const idempotencyKeys = useRef(new Map<string, string>());
  const keyFor = (id: string, action: 'revise' | 'withdraw') => {
    const cacheKey = `${action}:${id}`;
    if (!idempotencyKeys.current.has(cacheKey)) {
      idempotencyKeys.current.set(cacheKey, generateIdempotencyKey(`discount_${action}`));
    }
    return idempotencyKeys.current.get(cacheKey)!;
  };

  const reviseDiscount = async (id: string, input: ReviseBranchDiscountInput): Promise<{ ok: boolean; queued?: boolean; error?: string }> => {
    setRaceError(null);
    const idempotencyKey = keyFor(id, 'revise');

    if (isOffline) {
      try {
        await enqueueOfflineWrite({ endpoint: `/branch-discounts/${id}`, method: 'put', payload: input, idempotencyKey, invalidateKeys: [['branchDiscounts'], ['branchDiscountsList'], ['branchDiscountSummary']] });
        return { ok: true, queued: true };
      } catch (error) {
        return { ok: false, error: mapErrorToMessage(error) };
      }
    }

    try {
      await revise.mutateAsync({ id, input });
      return { ok: true };
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        setRaceError(CLAIM_ALREADY_REVIEWED_MESSAGE);
        return { ok: false, error: CLAIM_ALREADY_REVIEWED_MESSAGE };
      }
      if (isApiError(error) && error.status === null) {
        try {
          await enqueueOfflineWrite({ endpoint: `/branch-discounts/${id}`, method: 'put', payload: input, idempotencyKey, invalidateKeys: [['branchDiscounts'], ['branchDiscountsList'], ['branchDiscountSummary']] });
          return { ok: true, queued: true };
        } catch (queueError) {
          return { ok: false, error: mapErrorToMessage(queueError) };
        }
      }
      return { ok: false, error: mapErrorToMessage(error) };
    }
  };

  const withdrawDiscount = async (id: string): Promise<{ ok: boolean; queued?: boolean; error?: string }> => {
    setRaceError(null);
    const idempotencyKey = keyFor(id, 'withdraw');

    if (isOffline) {
      try {
        await enqueueOfflineWrite({ endpoint: `/branch-discounts/${id}`, method: 'delete', payload: undefined, idempotencyKey, invalidateKeys: [['branchDiscounts'], ['branchDiscountsList'], ['branchDiscountSummary']] });
        return { ok: true, queued: true };
      } catch (error) {
        return { ok: false, error: mapErrorToMessage(error) };
      }
    }

    try {
      await withdraw.mutateAsync(id);
      return { ok: true };
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        setRaceError(CLAIM_ALREADY_REVIEWED_MESSAGE);
        return { ok: false, error: CLAIM_ALREADY_REVIEWED_MESSAGE };
      }
      if (isApiError(error) && error.status === null) {
        try {
          await enqueueOfflineWrite({ endpoint: `/branch-discounts/${id}`, method: 'delete', payload: undefined, idempotencyKey, invalidateKeys: [['branchDiscounts'], ['branchDiscountsList'], ['branchDiscountSummary']] });
          return { ok: true, queued: true };
        } catch (queueError) {
          return { ok: false, error: mapErrorToMessage(queueError) };
        }
      }
      return { ok: false, error: mapErrorToMessage(error) };
    }
  };

  return {
    reviseDiscount,
    withdrawDiscount,
    isRevising: revise.isPending,
    isWithdrawing: withdraw.isPending,
    raceError,
    clearRaceError: () => setRaceError(null),
  };
}
