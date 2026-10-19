export type QueuedWriteMethod = 'post' | 'put' | 'delete';

export type QueuedWriteStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * One queued mutation. `idempotencyKey` is minted ONCE at `enqueueWrite` time
 * and resent verbatim on every retry of this same row — never regenerated —
 * so a retry can never double-post (productionApp.md Step 4 / financeApp.md
 * rule 8).
 */
export interface QueuedWrite {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  method: QueuedWriteMethod;
  /** JSON-serializable request body. */
  payload: unknown;
  status: QueuedWriteStatus;
  attempts: number;
  lastError: string | null;
  /** Query keys (TanStack Query, JSON-serialized) to invalidate once this write syncs. */
  invalidateKeys: unknown[][];
  createdAt: number;
  /** Backoff gate — `flush()` skips a `pending` row until `Date.now() >= nextAttemptAt`. */
  nextAttemptAt: number;
}

export interface EnqueueWriteInput {
  endpoint: string;
  method: QueuedWriteMethod;
  payload: unknown;
  idempotencyKey: string;
  invalidateKeys?: unknown[][];
}

/**
 * Handed to the executor with each write. A write that is really several
 * requests (a queued return uploads each line's photo, then posts once) saves
 * its progress here, so the next attempt resumes instead of starting over.
 */
export interface WriteExecutionContext {
  /**
   * Persists a new `payload` and/or `idempotencyKey` for this row now, before
   * the executor finishes. The row keeps its `id`; only a write the server
   * provably did not apply may take a new key.
   */
  persist(patch: { payload?: unknown; idempotencyKey?: string }): Promise<void>;
}

/** Storage port — one SQLite-backed implementation for the app, one in-memory fake for tests. Neither is imported directly outside `writeQueue.ts`. */
export interface QueueStorage {
  insert(write: QueuedWrite): Promise<void>;
  update(id: string, patch: Partial<QueuedWrite>): Promise<void>;
  remove(id: string): Promise<void>;
  all(): Promise<QueuedWrite[]>;
}
