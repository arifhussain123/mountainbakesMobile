import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { qk } from '@/api/queryKeys';
import { resolveWriteOutcome, type WriteOutcome } from '@/api/sync/writeOutcome';
import type { CreateBranchReturnInput } from '@/shared/schemas/production-ops.schemas';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';

/**
 * Return unsold or damaged stock from a branch to production, offline-first.
 *
 * ONE code path regardless of connectivity, like every other write that records
 * something a shift did: the return is written to SQLite and queued, then a
 * drain is attempted. A branch closing out at 9pm with no signal is exactly the
 * case this exists for.
 *
 * ---------------------------------------------------------------------------
 * The unique transaction ID
 * ---------------------------------------------------------------------------
 * `writeOffline` mints a **UUIDv7 `client_operation_id` when the return is
 * created**, not when it is sent, and that one value is the domain row's primary
 * key, the queue row's id, and the `Idempotency-Key` header on every attempt.
 * It is returned here so the screen can show it: a return that is still queued
 * has no server reference yet, and this is the only identifier that exists for
 * it — the one to quote if someone has to go looking.
 *
 * Never regenerate it on retry. The server honours the header on this endpoint
 * (migration 84) and replays the original response, which is what stops a
 * retried return handing back the same units twice.
 *
 * ---------------------------------------------------------------------------
 * What the server does with it, and why the result is not "saved"
 * ---------------------------------------------------------------------------
 * `POST /api/stock/return` applies immediately — branch balance down, production
 * pool up — and commits **product by product**, not as one transaction. The
 * route pre-validates the whole batch against balances first, so the realistic
 * failure (returning more than is on hand) is caught before anything moves; a
 * sale landing between validate and commit can still fail a later line, and its
 * 409 names what did commit. Those committed lines stay committed, because they
 * are real stock movements.
 *
 * That shortfall is why this reports **three** outcomes rather than two.
 * `resolveWriteOutcome` reads the queue row itself, so a return the server
 * refused — the realistic case here, asking for more units than the branch holds
 * — is reported as refused rather than as "on its way". A refusal never clears
 * by waiting, and a branch told its return is queued will not go looking for it.
 */

export type SaveOutcome = WriteOutcome;

export interface CreateStockReturnResult {
  outcome: SaveOutcome;
  /** The server's own words when it refused — they name the products. */
  reason?: string;
  /** The UUIDv7 that identifies this return everywhere. */
  clientOperationId: string;
  businessDate: string;
}

export function useCreateStockReturn(): {
  createReturn: (input: CreateBranchReturnInput) => Promise<CreateStockReturnResult>;
  isSaving: boolean;
} {
  const branchId = useAuthStore(s => s.claims?.branchId);
  const sync = useSyncStore(s => s.sync);
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const createReturn = useCallback(
    async (input: CreateBranchReturnInput): Promise<CreateStockReturnResult> => {
      if (!branchId) {
        throw new Error('No branch is associated with this account.');
      }

      setIsSaving(true);
      try {
        // `stock_movement` is the queue entity for this endpoint — see
        // `services/sync/endpoints.ts`, where its business date is sent as
        // `businessDate`. The field name is per endpoint and sending the wrong
        // one is silently ignored by the server.
        const written = await writeOffline({
          entity: 'stock_movement',
          branchId,
          payload: { ...input },
        });

        // A failure to send now is not an error the user needs to see: the
        // return is queued and will retry. What they do need is the difference
        // between queued and refused, which the drain tally cannot answer.
        try {
          await sync();
        } catch {
          // Swallowed on purpose — the row's own status is the answer below.
        }
        const { outcome, reason } = await resolveWriteOutcome(written.clientOperationId);

        // Only once the server has it have any units actually moved.
        if (outcome === 'synced') {
          queryClient.invalidateQueries({ queryKey: qk.stock.all() });
        }

        return {
          outcome,
          reason,
          clientOperationId: written.clientOperationId,
          businessDate: written.businessDate,
        };
      } finally {
        setIsSaving(false);
      }
    },
    [branchId, sync, queryClient],
  );

  return { createReturn, isSaving };
}
