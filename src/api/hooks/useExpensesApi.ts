import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { qk } from '@/api/queryKeys';
import type { CreateExpenseInput } from '@/shared/schemas/expense.schemas';
import { useAuthStore } from '@/state/authStore';
import { resolveWriteOutcome, type WriteOutcome } from '@/api/sync/writeOutcome';
import { useSyncStore } from '@/state/syncStore';

/**
 * Create an expense, offline-first.
 *
 * ONE code path regardless of connectivity: the expense is always written to
 * SQLite and queued, then a drain is attempted. Branching on `isOnline` at
 * submit time would make the offline case a separate, rarely-exercised path —
 * and that path is the one staff actually use in a basement shop with no signal.
 *
 * The result distinguishes what the user is told. "Saved" is only claimed once
 * the server has confirmed; otherwise it is "Saved offline", which is the honest
 * statement and the one the spec requires.
 */

export type SaveOutcome = WriteOutcome;

export interface CreateExpenseResult {
  outcome: SaveOutcome;
  /** The server's reason, when it refused. */
  reason?: string;
  clientOperationId: string;
  businessDate: string;
}

export function useCreateExpense(): {
  createExpense: (input: CreateExpenseInput) => Promise<CreateExpenseResult>;
  isSaving: boolean;
} {
  const branchId = useAuthStore(s => s.claims?.branchId);
  const sync = useSyncStore(s => s.sync);
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const createExpense = useCallback(
    async (input: CreateExpenseInput): Promise<CreateExpenseResult> => {
      if (!branchId) {
        throw new Error('No branch is associated with this account.');
      }

      setIsSaving(true);
      try {
        const written = await writeOffline({
          entity: 'expense',
          branchId,
          payload: { ...input },
        });

        // Attempt to send immediately. A failure to *start* is not an error the
        // user needs to see — the operation is safely queued and will retry. A
        // refusal by the server is a different thing entirely, and
        // `resolveWriteOutcome` is what tells the two apart.
        try {
          await sync();
        } catch {
          // Left pending, which reads as queued below.
        }

        const { outcome, reason } = await resolveWriteOutcome(written.clientOperationId);

        if (outcome === 'synced') {
          queryClient.invalidateQueries({ queryKey: qk.expenses.all() });
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

  return { createExpense, isSaving };
}
