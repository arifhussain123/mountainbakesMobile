import type { EnqueueWriteInput, QueuedWrite, QueueStorage, WriteExecutionContext } from './types';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5 * 60_000;

/** Shape every `apiClient` rejection already has (`@/api`'s `ApiError`) — duplicated locally so `shared/` never depends on `api/` (architecture skill's import direction). */
interface MinimalApiError {
  status: number | null;
}

function hasStatus(error: unknown): error is MinimalApiError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

/** `status: null` is "no internet" (retryable); 429/5xx are transient (retryable); any other 4xx is a rejection the server will repeat (not retryable — a human needs to look at it). */
function isRetryable(error: unknown): boolean {
  if (!hasStatus(error)) return true;
  if (error.status === null) return true;
  return error.status === 429 || error.status >= 500;
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Unknown error';
}

export interface WriteQueueDeps {
  storage: QueueStorage;
  /**
   * Performs the real HTTP call for one queued write — throws on failure, same
   * shape `apiClient` already throws. `context` lets a multi-step write save
   * its progress mid-way (most executors ignore it).
   */
  executor: (write: QueuedWrite, context: WriteExecutionContext) => Promise<void>;
  /** Called with the full queue after every mutation, for a reactive status store (`useOfflineQueueStore`). */
  onQueueChanged?: (writes: QueuedWrite[]) => void;
  /** Invalidates TanStack Query keys once a write syncs — injected so this module never imports `@/api`. */
  invalidate?: (keys: unknown[][]) => void;
  now?: () => number;
}

export interface WriteQueue {
  /** Returns the queued write's id (== its idempotency key) immediately — the caller never waits on the network. */
  enqueue(input: EnqueueWriteInput): Promise<string>;
  /** Processes every due `pending` write in FIFO order. Safe to call repeatedly/concurrently-ish (each row is marked `syncing` before its network call). */
  flush(): Promise<void>;
  all(): Promise<QueuedWrite[]>;
  /**
   * Puts rows left `syncing` back to `pending`. Call once at app start, before
   * the first flush: no flush can be running then, so a `syncing` row is one
   * the app was killed in the middle of — without this it would never be
   * picked up again.
   */
  resetInterrupted(): Promise<void>;
}

/**
 * Storage- and executor-agnostic by design: the app wires this to
 * `createSqliteQueueStorage()` + `apiClient` once (see `useOfflineQueue.ts`);
 * tests wire it to an in-memory storage + a mock executor, so retry/backoff/
 * idempotency logic is verified without touching native SQLite.
 */
export function createWriteQueue(deps: WriteQueueDeps): WriteQueue {
  const now = deps.now ?? Date.now;
  // Rows an executor is working on right now. Two flushes can overlap (a
  // reconnect and an app-foreground arrive together); both read the row as
  // `pending` before either marks it `syncing`, so this is what stops the
  // second from running the same write again.
  const inFlight = new Set<string>();

  async function notifyChanged() {
    if (deps.onQueueChanged) deps.onQueueChanged(await deps.storage.all());
  }

  return {
    async enqueue(input) {
      const write: QueuedWrite = {
        id: input.idempotencyKey,
        idempotencyKey: input.idempotencyKey,
        endpoint: input.endpoint,
        method: input.method,
        payload: input.payload,
        status: 'pending',
        attempts: 0,
        lastError: null,
        invalidateKeys: input.invalidateKeys ?? [],
        createdAt: now(),
        nextAttemptAt: now(),
      };
      await deps.storage.insert(write);
      await notifyChanged();
      return write.id;
    },

    async flush() {
      const writes = await deps.storage.all();
      const currentTime = now();
      const due = writes.filter((write) => write.status === 'pending' && write.nextAttemptAt <= currentTime && !inFlight.has(write.id));
      for (const write of due) inFlight.add(write.id);

      for (const write of due) {
        await deps.storage.update(write.id, { status: 'syncing' });
        const context: WriteExecutionContext = {
          async persist(patch) {
            await deps.storage.update(write.id, patch);
            Object.assign(write, patch);
            await notifyChanged();
          },
        };
        try {
          await deps.executor(write, context);
          await deps.storage.remove(write.id);
          deps.invalidate?.(write.invalidateKeys);
        } catch (error) {
          const attempts = write.attempts + 1;
          if (!isRetryable(error) || attempts >= MAX_ATTEMPTS) {
            await deps.storage.update(write.id, { status: 'failed', attempts, lastError: errorMessage(error) });
          } else {
            const delay = Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), MAX_DELAY_MS);
            await deps.storage.update(write.id, {
              status: 'pending',
              attempts,
              lastError: errorMessage(error),
              nextAttemptAt: currentTime + delay,
            });
          }
        } finally {
          inFlight.delete(write.id);
        }
      }
      if (due.length > 0) await notifyChanged();
    },

    async all() {
      return deps.storage.all();
    },

    async resetInterrupted() {
      const writes = await deps.storage.all();
      const stuck = writes.filter((write) => write.status === 'syncing' && !inFlight.has(write.id));
      for (const write of stuck) await deps.storage.update(write.id, { status: 'pending' });
      if (stuck.length > 0) await notifyChanged();
    },
  };
}
