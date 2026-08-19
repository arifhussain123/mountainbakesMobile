import { useCallback, useState } from 'react';
import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

/**
 * Raise a production order (a branch's demand), offline-first.
 *
 * `branchId` is deliberately NOT part of the payload — the server derives it
 * from the auth token and never trusts a client value. It is still passed to
 * `writeOffline` because the LOCAL row is scoped by branch, so the device can
 * show its own pending demands.
 */

export interface ProductionOrderDraft {
  items: Array<{ productId: string; qty: number; remarks: string }>;
  requiredDate: string;
}

export interface CreateProductionOrderResult {
  outcome: 'synced' | 'queued';
  clientOperationId: string;
  businessDate: string;
}

export function useCreateProductionOrder(): {
  createProductionOrder: (draft: ProductionOrderDraft) => Promise<CreateProductionOrderResult>;
  isSaving: boolean;
} {
  const branchId = useAuthStore(s => s.claims?.branchId);
  const sync = useSyncStore(s => s.sync);
  const [isSaving, setIsSaving] = useState(false);

  const createProductionOrder = useCallback(
    async (draft: ProductionOrderDraft): Promise<CreateProductionOrderResult> => {
      if (!branchId) throw new Error('No branch is associated with this account.');

      setIsSaving(true);
      try {
        const written = await writeOffline({
          entity: 'production_order',
          branchId,
          payload: {
            items: draft.items,
            requiredDate: draft.requiredDate,
            // Sent explicitly so an absent key behaves like the pre-packing
            // payload rather than relying on the server's default.
            packingItems: [],
            specialItems: [],
          },
        });

        let outcome: 'synced' | 'queued' = 'queued';
        try {
          await sync();
          const state = useSyncStore.getState();
          if (state.lastResult && state.lastResult.synced > 0) outcome = 'synced';
        } catch {
          outcome = 'queued';
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
    [branchId, sync],
  );

  return { createProductionOrder, isSaving };
}
