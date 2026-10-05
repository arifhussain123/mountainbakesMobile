import { useCallback, useState } from 'react';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { useAuthStore } from '@/state/authStore';
import { resolveWriteOutcome, type WriteOutcome } from '@/api/sync/writeOutcome';
import { useSyncStore } from '@/state/syncStore';

/**
 * Raise a Special Order, offline-first.
 *
 * A Special Order is its OWN document on its own endpoint
 * (`POST /api/special-orders`) — it is not a demand and must never travel as a
 * `production_order`, whose endpoint refuses a non-empty `specialItems`.
 *
 * `branchId` is deliberately NOT part of the payload — the server derives it
 * from the auth token and never trusts a client value. It is still passed to
 * `writeOffline`, which requires it of every write; this entity has no local
 * mirror table, so the queue row is the durable record on the device.
 */

export interface SpecialOrderDraftItem {
  name: string;
  qty: number;
  /** The agreed amount for the WHOLE ROW. Not a unit rate; 0 is a real value. */
  amount: number;
  description: string;
  /** Always empty: this app has no camera or upload. */
  attachmentIds: string[];
}

export interface SpecialOrderDraft {
  items: SpecialOrderDraftItem[];
  /** 'YYYY-MM-DD'. Optional server-side, and left out of the payload when absent. */
  requiredDate?: string;
}

export interface CreateSpecialOrderResult {
  outcome: WriteOutcome;
  /** The server's reason, when it refused. */
  reason?: string;
  clientOperationId: string;
  businessDate: string;
}

export function useCreateSpecialOrder(): {
  createSpecialOrder: (draft: SpecialOrderDraft) => Promise<CreateSpecialOrderResult>;
  isSaving: boolean;
} {
  const branchId = useAuthStore(s => s.claims?.branchId);
  const sync = useSyncStore(s => s.sync);
  const [isSaving, setIsSaving] = useState(false);

  const createSpecialOrder = useCallback(
    async (draft: SpecialOrderDraft): Promise<CreateSpecialOrderResult> => {
      if (!branchId) throw new Error('No branch is associated with this account.');

      setIsSaving(true);
      try {
        const written = await writeOffline({
          entity: 'special_order',
          branchId,
          payload: {
            items: draft.items,
            ...(draft.requiredDate ? { requiredDate: draft.requiredDate } : {}),
          },
        });

        try {
          await sync();
        } catch {
          // Left pending, which reads as queued below.
        }

        // This row's fate, not the drain's tally — see writeOutcome.ts.
        const { outcome, reason } = await resolveWriteOutcome(written.clientOperationId);

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
    [branchId, sync],
  );

  return { createSpecialOrder, isSaving };
}
