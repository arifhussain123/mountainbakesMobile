import { create } from 'zustand';
import type { QueuedWrite } from '@/shared/offline';

interface OfflineQueueState {
  writes: QueuedWrite[];
  pendingCount: number;
  failedCount: number;
  setWrites: (writes: QueuedWrite[]) => void;
}

/**
 * Mirrors the SQLite write queue for `SyncBadge`/list screens — updated by
 * `api/offlineQueue.ts` after every `enqueue`/`flush`, never written to
 * directly from a screen.
 */
export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  writes: [],
  pendingCount: 0,
  failedCount: 0,
  setWrites: (writes) =>
    set({
      writes,
      pendingCount: writes.filter((w) => w.status === 'pending' || w.status === 'syncing').length,
      failedCount: writes.filter((w) => w.status === 'failed').length,
    }),
}));
