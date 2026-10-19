import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  createSqliteQueueStorage,
  createWriteQueue,
  deleteLocalPhotos,
  getOfflineDb,
  pruneLocalPhotos,
  readLocalPhoto,
  type QueuedWrite,
  type WriteExecutionContext,
} from '@/shared/offline';
import { useOfflineQueueStore } from '@/state/offlineQueueStore';
import { apiClient, generateIdempotencyKey } from './client';
import { getCurrentGeoPosition } from './geo';
import { queryClient } from './queryClient';
import { executeQueuedBranchReturn, isQueuedBranchReturn, isQueuedReturnPayload, type QueuedReturnLine } from './queuedBranchReturn';
import { uploadAttachment } from './services/attachmentService';
import type { EnqueueWriteInput } from '@/shared/offline';

/** Uploads a queued return line's kept photo, as a data: URI (see `local_photos` in `shared/offline/db.ts`). */
async function uploadQueuedReturnPhoto(line: QueuedReturnLine): Promise<string> {
  const photo = await readLocalPhoto(line.localPhotoId);
  if (!photo) {
    // 410: not retryable — the copy is gone, so no later attempt can succeed either.
    throw { status: 410, message: `The photo of ${line.productName} is no longer on this phone. Delete this return and enter it again.` };
  }
  const attachment = await uploadAttachment('branch_return', {
    uri: `data:${photo.mimeType};base64,${photo.base64}`,
    type: photo.mimeType,
    fileName: `return-${line.productId}.jpg`,
  });
  return attachment.id;
}

async function executeWrite(write: QueuedWrite, context: WriteExecutionContext): Promise<void> {
  if (isQueuedBranchReturn(write)) {
    await executeQueuedBranchReturn(write, context, {
      uploadPhoto: uploadQueuedReturnPhoto,
      // Geofenced like the online save: the position is read now, at sync time.
      postReturn: async (body, idempotencyKey) => {
        const geoPosition = await getCurrentGeoPosition();
        await apiClient.post('/stock/return', body, { idempotencyKey, geoPosition });
      },
      deleteLocalPhotos,
      newIdempotencyKey: () => generateIdempotencyKey('stock_return'),
    });
    return;
  }
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
  await db.execute('DELETE FROM local_photos');
  useOfflineQueueStore.getState().setWrites([]);
}

/** Kept return photos whose queued return is gone (synced, or a crash between the two deletes). */
async function pruneOrphanedLocalPhotos(): Promise<void> {
  const writes = await queue.all();
  const keep = writes.flatMap((write) => (isQueuedReturnPayload(write.payload) ? write.payload.items.map((line) => line.localPhotoId) : []));
  await pruneLocalPhotos(keep);
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

  // A row left `syncing` by a killed app goes back to `pending` before the first flush.
  void queue
    .resetInterrupted()
    .then(pruneOrphanedLocalPhotos)
    .catch(() => {})
    .then(flushOfflineQueue);

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void flushOfflineQueue();
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushOfflineQueue();
  });
}
