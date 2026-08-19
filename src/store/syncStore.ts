import { create } from 'zustand';
import { countUnresolvedNotInQueue } from '@/database/repositories/conflictRepository';
import { getUnsyncedSummary } from '@/database/repositories/syncQueueRepository';
import { drainQueue, type DrainResult } from '@/services/sync/syncManager';
import { isOnlineNow } from '@/store/networkStore';

/**
 * Sync status for the UI.
 *
 * Counts are refreshed from SQLite rather than tracked incrementally — the queue
 * is the single source of truth, and a counter that drifts from it would report
 * "all synced" while work sat waiting.
 */

export type SyncPhase = 'idle' | 'syncing';

interface SyncState {
  phase: SyncPhase;
  pending: number;
  needsAttention: number;
  lastSyncAt: number | null;
  lastResult: DrainResult | null;

  refreshCounts: () => Promise<void>;
  sync: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  phase: 'idle',
  pending: 0,
  needsAttention: 0,
  lastSyncAt: null,
  lastResult: null,

  refreshCounts: async () => {
    try {
      // Two sources, because they describe different things. The queue knows
      // what has not reached the server; `sync_conflicts` also holds
      // disagreements about work that DID — a sale the server priced
      // differently has a synced queue row and still needs a person. Counting
      // only the queue would leave that permanently invisible.
      const [summary, orphanConflicts] = await Promise.all([
        getUnsyncedSummary(),
        countUnresolvedNotInQueue(),
      ]);
      set({
        pending: summary.pending,
        needsAttention: summary.needsAttention + orphanConflicts,
      });
    } catch {
      // The database may not be open yet during bootstrap. Counts stay at their
      // last known values rather than being reset to a misleading zero.
    }
  },

  sync: async () => {
    if (get().phase === 'syncing') return;
    set({ phase: 'syncing' });
    try {
      const result = await drainQueue({ isOnline: isOnlineNow });
      set({
        lastResult: result,
        lastSyncAt: result.synced > 0 ? Date.now() : get().lastSyncAt,
      });
    } finally {
      set({ phase: 'idle' });
      await get().refreshCounts();
    }
  },
}));
