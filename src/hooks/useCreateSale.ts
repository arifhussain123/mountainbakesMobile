import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { qk } from '@/services/query/queryKeys';
import type { CreatePosSaleInput } from '@/shared/schemas/order.schemas';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

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
 */

export type SaleOutcome = 'synced' | 'queued';

export interface CreateSaleResult {
  outcome: SaleOutcome;
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

        let outcome: SaleOutcome = 'queued';
        try {
          await sync();
          const state = useSyncStore.getState();
          if (state.lastResult && state.lastResult.synced > 0) outcome = 'synced';
        } catch {
          outcome = 'queued';
        }

        if (outcome === 'synced') {
          // Stock moved server-side, so the cached balances are now wrong.
          queryClient.invalidateQueries({ queryKey: qk.stock.all() });
        }

        return {
          outcome,
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
