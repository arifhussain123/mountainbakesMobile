import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { qk } from '@/api/queryKeys';
import type { CreatePosSaleInput } from '@/shared/schemas/order.schemas';
import { useAuthStore } from '@/state/authStore';
import { resolveWriteOutcome, type WriteOutcome } from '@/api/sync/writeOutcome';
import { useSyncStore } from '@/state/syncStore';

/**
 * Record a POS sale, offline-first.
 *
 * Same single path as expenses: always written locally and queued, then a drain
 * is attempted. The outcome distinguishes what the cashier is told — a queued
 * sale is never reported as complete.
 *
 * Note what this does NOT do: it does not decrement local stock. The server owns
 * stock, rejects an overdraw with a 409 plus per-product shortfalls, and is the
 * only place two branches selling the last unit can be adjudicated. A local
 * decrement would show a balance the server never agreed to.
 *
 * The outcome has three values, not two. A 409 for insufficient stock is a
 * **refusal**, not a queue — it never syncs by itself — and reporting it as
 * "saved offline" is how a sale that never landed goes unnoticed until someone
 * reconciles the till. See `services/sync/writeOutcome.ts`.
 */

export type SaleOutcome = WriteOutcome;

export interface CreateSaleResult {
  outcome: SaleOutcome;
  /** The server's reason, when it refused. Names the products that were short. */
  reason?: string;
  clientOperationId: string;
  businessDate: string;
}

export function useCreateSale(): {
  createSale: (input: Omit<CreatePosSaleInput, 'branchId'>) => Promise<CreateSaleResult>;
  isSaving: boolean;
} {
  const branchId = useAuthStore(s => s.claims?.branchId);
  const sync = useSyncStore(s => s.sync);
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const createSale = useCallback(
    async (input: Omit<CreatePosSaleInput, 'branchId'>): Promise<CreateSaleResult> => {
      if (!branchId) throw new Error('No branch is associated with this account.');

      setIsSaving(true);
      try {
        const written = await writeOffline({
          entity: 'sale',
          branchId,
          // branchId is included because /api/orders/pos requires it in the body;
          // the server still re-derives authorisation from the JWT.
          payload: { ...input, branchId },
        });

        try {
          await sync();
        } catch {
          // A drain that could not start leaves the row pending, which
          // `resolveWriteOutcome` reads as queued — the honest answer.
        }

        // This row's fate, not the drain's tally: a busy queue routinely syncs
        // other operations in the same pass.
        const { outcome, reason } = await resolveWriteOutcome(written.clientOperationId);

        if (outcome === 'synced') {
          // Stock moved server-side, so the cached balances are now wrong.
          queryClient.invalidateQueries({ queryKey: qk.stock.all() });
          // And the day's register is one sale short of the truth. The branch
          // register reads `/api/orders` for the business day; without this the
          // sale the cashier just made is missing from the list they are
          // returned to, which reads as the write having failed.
          queryClient.invalidateQueries({ queryKey: qk.orders.all() });
        }

        return {
          outcome,
          ...(reason ? { reason } : {}),
          clientOperationId: written.clientOperationId,
          businessDate: written.businessDate,
        };
      } finally {
        setIsSaving(false);
      }
    },
    [branchId, sync, queryClient],
  );

  return { createSale, isSaving };
}
