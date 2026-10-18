import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { createSqliteQueueStorage, createWriteQueue, getOfflineDb, type QueuedWrite } from '@/shared/offline';
import { useOfflineQueueStore } from '@/state/offlineQueueStore';
import { apiClient } from './client';
import { queryClient } from './queryClient';
import type { EnqueueWriteInput } from '@/shared/offline';

async function executeWrite(write: QueuedWrite): Promise<void> {
  const options = { idempotencyKey: write.idempotencyKey };
  if (write.method === 'delete') {
    await apiClient.delete(write.endpoint, options);
  } else {
    await apiClient[write.method](write.endpoint, write.payload, options);
  }
}

function invalidate(keys: unknown[][]): void {
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * The one app-wide write queue instance — storage is SQLite
 * (`createSqliteQueueStorage`), the executor is the real `apiClient`, and its
 * status mirrors into `useOfflineQueueStore` for `SyncBadge`/list screens.
 * `@/shared/offline` itself never imports `@/api` (architecture skill's
 * import direction) — this file is the one place that wires them together.
 */
const queue = createWriteQueue({
  storage: createSqliteQueueStorage(),
  executor: executeWrite,
  invalidate,
  onQueueChanged: (writes) => useOfflineQueueStore.getState().setWrites(writes),
});

export function enqueueOfflineWrite(input: EnqueueWriteInput): Promise<string> {
  return queue.enqueue(input);
}

export function flushOfflineQueue(): Promise<void> {
  return queue.flush();
}

/**
 * Sign-out's "sign out anyway" path (the Drawer's Sign Out sheet): the user
 * was told these entries would be deleted from the phone, so this makes that
 * literally true rather than leaving orphaned rows a future session's flush
 * would try to replay under a token that no longer exists.
 */
export async function clearOfflineQueue(): Promise<void> {
  const db = getOfflineDb();
  await db.execute('DELETE FROM write_queue');
  useOfflineQueueStore.getState().setWrites([]);
}

let retryWorkerStarted = false;

/**
 * Starts the retry worker: flushes once immediately, then again on every
 * reconnect and every app-foreground. Idempotent — calling twice (e.g. a
 * fast-refresh remount of `App.tsx`) does not register duplicate listeners.
 */
export function startOfflineQueueRetryWorker(): void {
  if (retryWorkerStarted) return;
  retryWorkerStarted = true;

  void flushOfflineQueue();

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void flushOfflineQueue();
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushOfflineQueue();
  });
}
