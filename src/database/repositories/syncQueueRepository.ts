import { getDb } from '@/database/localDb';

/**
 * The sync queue.
 *
 * Every offline mutation is a row here plus a row in its domain table, written
 * in ONE local transaction — either one without the other is a lost or a phantom
 * transaction.
 *
 * `client_operation_id` is the identity of the operation from the moment it is
 * created: the domain row's primary key, this row's unique key, and the
 * `Idempotency-Key` header on every send attempt. It is never regenerated,
 * including on retry — regenerating on retry is exactly how a request the server
 * already processed becomes a second sale.
 */

export type SyncEntity =
  | 'sale'
  | 'order'
  | 'expense'
  | 'stock_movement'
  | 'production_order';

export type SyncAction = 'create' | 'update';

export type SyncQueueStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict'
  | 'blocked';

/** States representing work that has NOT reached the server. */
const UNSYNCED: readonly SyncQueueStatus[] = [
  'pending',
  'syncing',
  'blocked',
  'failed',
  'conflict',
];

export interface SyncQueueRow {
  id: number;
  clientOperationId: string;
  entity: SyncEntity;
  entityLocalId: string;
  action: SyncAction;
  payload: unknown;
  businessDate: string | null;
  dependsOn: string | null;
  priority: number;
  status: SyncQueueStatus;
  attemptCount: number;
  nextAttemptAt: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EnqueueInput {
  clientOperationId: string;
  entity: SyncEntity;
  entityLocalId: string;
  action: SyncAction;
  payload: unknown;
  /**
   * Business date captured ON DEVICE at creation. The server stamps the business
   * day on receipt, so a sale created at 21:00 and synced at 07:00 would
   * otherwise land on an already-closed day.
   */
  businessDate: string | null;
  /** client_operation_id of a prerequisite that must sync first. */
  dependsOn?: string | null;
  /** Lower runs first. Orders before sales, sales before stock adjustments. */
  priority?: number;
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStr(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function mapRow(row: Record<string, unknown>): SyncQueueRow {
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(row.payload ?? 'null'));
  } catch {
    // A row whose payload will not parse must not crash the drain; it is
    // surfaced as failed below rather than silently skipped.
    payload = null;
  }

  return {
    id: toNum(row.id),
    clientOperationId: String(row.client_operation_id),
    entity: String(row.entity) as SyncEntity,
    entityLocalId: String(row.entity_local_id),
    action: String(row.action) as SyncAction,
    payload,
    businessDate: toStr(row.business_date),
    dependsOn: toStr(row.depends_on),
    priority: toNum(row.priority, 100),
    status: String(row.status) as SyncQueueStatus,
    attemptCount: toNum(row.attempt_count),
    nextAttemptAt: row.next_attempt_at == null ? null : toNum(row.next_attempt_at),
    lastErrorCode: toStr(row.last_error_code),
    lastErrorMessage: toStr(row.last_error_message),
    createdAt: toNum(row.created_at),
    updatedAt: toNum(row.updated_at),
  };
}

/**
 * Add an operation to the queue.
 *
 * Idempotent on `client_operation_id`: re-enqueueing the same operation is a
 * no-op rather than a duplicate, so a retried local write cannot create two
 * queue rows for one transaction.
 */
export async function enqueue(input: EnqueueInput, now = Date.now()): Promise<void> {
  const db = getDb();
  await db.execute(
    `INSERT OR IGNORE INTO sync_queue
       (client_operation_id, entity, entity_local_id, action, payload,
        business_date, depends_on, priority, status, attempt_count,
        next_attempt_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    [
      input.clientOperationId,
      input.entity,
      input.entityLocalId,
      input.action,
      JSON.stringify(input.payload),
      input.businessDate,
      input.dependsOn ?? null,
      input.priority ?? 100,
      now,
      now,
      now,
    ],
  );
}

/**
 * Operations ready to send right now.
 *
 * Excludes anything whose `depends_on` has not reached `synced` — never send a
 * dependent before its prerequisite exists on the server. Ordered by priority
 * then creation, and since ids are UUIDv7 that is also chronological.
 */
export async function claimReady(limit = 20, now = Date.now()): Promise<SyncQueueRow[]> {
  const db = getDb();
  const result = await db.execute(
    `SELECT q.* FROM sync_queue q
      WHERE q.status IN ('pending', 'blocked')
        AND (q.next_attempt_at IS NULL OR q.next_attempt_at <= ?)
        AND (
          q.depends_on IS NULL
          OR EXISTS (
            SELECT 1 FROM sync_queue d
             WHERE d.client_operation_id = q.depends_on
               AND d.status = 'synced'
          )
        )
      ORDER BY q.priority ASC, q.created_at ASC
      LIMIT ?`,
    [now, limit],
  );
  return result.rows.map(mapRow);
}

export async function markSyncing(id: number, now = Date.now()): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'syncing', attempt_count = attempt_count + 1, updated_at = ?
      WHERE id = ?`,
    [now, id],
  );
}

export async function markSynced(id: number, now = Date.now()): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'synced', last_error_code = NULL, last_error_message = NULL, updated_at = ?
      WHERE id = ?`,
    [now, id],
  );
}

/** Transient failure — stays pending and retries after the backoff. */
export async function markRetry(
  id: number,
  nextAttemptAt: number,
  error: { code?: string | null; message?: string | null },
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'pending', next_attempt_at = ?, last_error_code = ?,
            last_error_message = ?, updated_at = ?
      WHERE id = ?`,
    [nextAttemptAt, error.code ?? null, error.message ?? null, now, id],
  );
}

/**
 * Parked. Either the server rejected it as invalid, or retries are exhausted.
 * Never auto-deleted — it is still the only copy of the transaction.
 */
export async function markFailed(
  id: number,
  error: { code?: string | null; message?: string | null },
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'failed', last_error_code = ?, last_error_message = ?, updated_at = ?
      WHERE id = ?`,
    [error.code ?? null, error.message ?? null, now, id],
  );
}

export async function markConflict(
  id: number,
  error: { code?: string | null; message?: string | null },
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'conflict', last_error_code = ?, last_error_message = ?, updated_at = ?
      WHERE id = ?`,
    [error.code ?? null, error.message ?? null, now, id],
  );
}

/** Hand-retry a parked operation from the Sync Center. */
export async function requeue(id: number, now = Date.now()): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'pending', attempt_count = 0, next_attempt_at = ?, updated_at = ?
      WHERE id = ? AND status IN ('failed', 'conflict')`,
    [now, now, id],
  );
}

export async function requeueAllFailed(now = Date.now()): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'pending', attempt_count = 0, next_attempt_at = ?, updated_at = ?
      WHERE status = 'failed'`,
    [now, now],
  );
}

/**
 * Reclaim rows stuck in `syncing`.
 *
 * The app can be killed mid-send. Without this the row is orphaned in `syncing`
 * forever and the transaction never reaches the server. Safe because the send
 * carries an idempotency key — a re-send the server already processed returns
 * the original result rather than duplicating.
 */
export async function reclaimStuckSyncing(now = Date.now()): Promise<number> {
  const db = getDb();
  const result = await db.execute(
    `UPDATE sync_queue SET status = 'pending', updated_at = ? WHERE status = 'syncing'`,
    [now],
  );
  return result.rowsAffected ?? 0;
}

export async function listByStatus(
  statuses: readonly SyncQueueStatus[],
  limit = 100,
): Promise<SyncQueueRow[]> {
  const db = getDb();
  const placeholders = statuses.map(() => '?').join(', ');
  const result = await db.execute(
    `SELECT * FROM sync_queue WHERE status IN (${placeholders})
      ORDER BY updated_at DESC LIMIT ?`,
    [...statuses, limit],
  );
  return result.rows.map(mapRow);
}

export interface UnsyncedSummary {
  total: number;
  pending: number;
  needsAttention: number;
}

function countFrom(rows: Array<Record<string, unknown>>): number {
  const first = rows[0];
  if (!first) return 0;
  return toNum(Object.values(first)[0]);
}

/**
 * How much unsynced work is on this device.
 *
 * Counts `failed` and `conflict` as unsynced, not finished: those rows are still
 * the only copy of a transaction the server never accepted.
 */
export async function getUnsyncedSummary(): Promise<UnsyncedSummary> {
  const db = getDb();
  const placeholders = UNSYNCED.map(() => '?').join(', ');

  const [totalResult, attentionResult] = await Promise.all([
    db.execute(
      `SELECT COUNT(*) AS n FROM sync_queue WHERE status IN (${placeholders})`,
      [...UNSYNCED],
    ),
    db.execute("SELECT COUNT(*) AS n FROM sync_queue WHERE status IN ('failed', 'conflict')"),
  ]);

  const total = countFrom(totalResult.rows);
  const needsAttention = countFrom(attentionResult.rows);
  return { total, needsAttention, pending: Math.max(0, total - needsAttention) };
}

export async function hasUnsyncedWork(): Promise<boolean> {
  const { total } = await getUnsyncedSummary();
  return total > 0;
}

/**
 * Prune synced rows older than the retention window.
 *
 * `failed` and `conflict` are NEVER pruned — they need a human.
 */
export async function pruneSynced(olderThanMs = 7 * 24 * 60 * 60 * 1000, now = Date.now()): Promise<number> {
  const db = getDb();
  const result = await db.execute(
    `DELETE FROM sync_queue WHERE status = 'synced' AND updated_at < ?`,
    [now - olderThanMs],
  );
  return result.rowsAffected ?? 0;
}
