import { getDb } from '@/common/database/localDb';

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
  | 'blocked'
  /**
   * Closed in the server's favour by a person, without ever being sent.
   *
   * The terminal state of `keep_server`: the operator looked at the conflict and
   * accepted that the server's version wins. It is NOT `synced` — this
   * transaction never reached the server and must never be counted as though it
   * had — and it is NOT `failed`, because nothing is outstanding and it must
   * stop asking for attention.
   *
   * The row stays forever. `pruneSynced` only deletes `synced`, so the operator's
   * original entry survives as the record of what was actually rung up, which is
   * the whole reason resolving a conflict never deletes anything.
   */
  | 'superseded';

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
  /** When the drain may next pick this row up. */
  nextAttemptAt: number | null;
  /** When it was last actually tried. Null on rows queued before migration 5. */
  lastAttemptAt: number | null;
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

/** Money is stored as TEXT to preserve the exact numeric(14,2) decimal. */
function numericText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '0';
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
    // Null on rows queued before migration 5 — no attempt time was recorded, and
    // `updated_at` is not a substitute for one.
    lastAttemptAt: row.last_attempt_at == null ? null : toNum(row.last_attempt_at),
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

/**
 * Claim a row for sending.
 *
 * This is the moment an attempt happens, so it is where `last_attempt_at` is
 * stamped — alongside the counter it belongs to. Recording it on failure
 * instead would leave a row that is still in flight looking untried.
 */
export async function markSyncing(id: number, now = Date.now()): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_queue
        SET status = 'syncing', attempt_count = attempt_count + 1,
            last_attempt_at = ?, updated_at = ?
      WHERE id = ?`,
    [now, now, id],
  );
}

/** Which local table mirrors each entity. Mirrors `offlineWriteRepository`. */
const DOMAIN_TABLE: Partial<Record<SyncEntity, string>> = {
  sale: 'local_sales',
  expense: 'local_expenses',
  production_order: 'local_production_orders',
  stock_movement: 'local_stock_movements',
};

/**
 * Mark an operation synced — **and update the record it belongs to**.
 *
 * The domain row used to be left untouched, so `local_sales.sync_status` stayed
 * `'pending'` for the life of the row and the `server_id` column — which exists
 * for exactly this — was never written. The queue row is then pruned after a
 * week, and with it the only evidence the sale ever reached the server: the
 * device would be left holding a transaction that looks permanently unsent.
 *
 * Both writes go in **one transaction**. A queue row marked synced beside a
 * domain row still marked pending is the same class of inconsistency that
 * pairing the two inserts at write time exists to prevent.
 *
 * `serverId` is best-effort (see `serverIdFrom`). A null one still flips the
 * status — knowing it synced matters more than knowing its id.
 */
export async function markSynced(
  id: number,
  now = Date.now(),
  operation?: { entity: SyncEntity; clientOperationId: string; serverId: string | null },
): Promise<void> {
  const db = getDb();
  const table = operation ? DOMAIN_TABLE[operation.entity] : undefined;

  await db.transaction(async tx => {
    await tx.execute(
      `UPDATE sync_queue
          SET status = 'synced', last_error_code = NULL, last_error_message = NULL, updated_at = ?
        WHERE id = ?`,
      [now, id],
    );

    if (table && operation) {
      await tx.execute(
        `UPDATE ${table}
            SET sync_status = 'synced', server_id = COALESCE(?, server_id), updated_at = ?
          WHERE client_operation_id = ?`,
        [operation.serverId, now, operation.clientOperationId],
      );
    }
  });
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

/**
 * What became of one operation, by the id it was created with.
 *
 * Exists because a drain's counters are drain-wide: a `DrainResult` saying
 * `{synced: 3, conflicts: 1}` cannot tell the cashier standing at the till
 * whether *their* sale was one of the three or the one. Answering that needs the
 * row, not the tally.
 */
export async function getOperationOutcome(
  clientOperationId: string,
): Promise<{ status: SyncQueueStatus; message: string | null } | null> {
  const db = getDb();
  const res = await db.execute(
    `SELECT status, last_error_message FROM sync_queue WHERE client_operation_id = ? LIMIT 1`,
    [clientOperationId],
  );
  const row = (res.rows as unknown as Record<string, unknown>[] | undefined)?.[0];
  if (!row) return null;
  return {
    status: String(row.status) as SyncQueueStatus,
    message: row.last_error_message == null ? null : String(row.last_error_message),
  };
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

/**
 * How much unsynced work is on this device.
 *
 * Counts `failed` and `conflict` as unsynced, not finished: those rows are still
 * the only copy of a transaction the server never accepted.
 *
 * One statement rather than two counts. This is the query behind the sync badge
 * on every screen's header, and it is re-run after every drain and on every
 * mount of the authenticated tree — two passes over the same table to answer two
 * questions about the same rows is one pass too many, and `SUM(CASE ...)` reads
 * no worse than the pair it replaces.
 */
export async function getUnsyncedSummary(): Promise<UnsyncedSummary> {
  const db = getDb();
  const placeholders = UNSYNCED.map(() => '?').join(', ');

  const result = await db.execute(
    `SELECT
       SUM(CASE WHEN status IN (${placeholders}) THEN 1 ELSE 0 END) AS total,
       SUM(CASE WHEN status IN ('failed', 'conflict') THEN 1 ELSE 0 END) AS attention
     FROM sync_queue`,
    [...UNSYNCED],
  );

  const row = (result.rows as unknown as Array<Record<string, unknown>> | undefined)?.[0];
  // SUM over no rows is NULL, not 0 — an empty queue must read as nothing
  // pending rather than as NaN in a badge.
  const total = toNum(row?.total);
  const needsAttention = toNum(row?.attention);
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

/** One queue row by the operation id it was created with. */
export async function getByClientOperationId(
  clientOperationId: string,
): Promise<SyncQueueRow | null> {
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM sync_queue WHERE client_operation_id = ? LIMIT 1`,
    [clientOperationId],
  );
  const row = (result.rows as unknown as Record<string, unknown>[] | undefined)?.[0];
  return row ? mapRow(row) : null;
}

/** One queue row by its local id. Needed to act on a row the UI has selected. */
export async function getById(id: number): Promise<SyncQueueRow | null> {
  const db = getDb();
  const result = await db.execute(`SELECT * FROM sync_queue WHERE id = ? LIMIT 1`, [id]);
  const row = (result.rows as unknown as Record<string, unknown>[] | undefined)?.[0];
  return row ? mapRow(row) : null;
}

/**
 * Close an operation in the server's favour, without sending it.
 *
 * The queue row and the domain row move together, in one transaction, for the
 * same reason they are created together: a domain row still marked `pending`
 * beside a closed queue row is a transaction that looks eternally unsent.
 *
 * Nothing is deleted. The operator's entry remains readable — it is the only
 * evidence of what was rung up at the counter, and a reconciliation that finds a
 * till short needs to see it.
 */
export async function markSuperseded(
  id: number,
  operation: { entity: SyncEntity; clientOperationId: string },
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  const table = DOMAIN_TABLE[operation.entity];

  await db.transaction(async tx => {
    await tx.execute(
      `UPDATE sync_queue SET status = 'superseded', updated_at = ? WHERE id = ?`,
      [now, id],
    );
    if (table) {
      await tx.execute(
        `UPDATE ${table} SET sync_status = 'superseded', updated_at = ?
          WHERE client_operation_id = ?`,
        [now, operation.clientOperationId],
      );
    }
  });
}

/**
 * Re-issue an operation under a NEW client_operation_id.
 *
 * ---------------------------------------------------------------------------
 * Why the id has to change, when everywhere else says never change it
 * ---------------------------------------------------------------------------
 * `client_operation_id` is the `Idempotency-Key`, and the rule is that it is
 * never regenerated on retry — regenerating it turns a request the server
 * already processed into a second sale.
 *
 * This is the one case that is not a retry. The payload or the business date has
 * been CHANGED by a person resolving a conflict — different quantities, a
 * different day — so it is a different transaction. Sending different content
 * under the old key is refused by the server outright (422, "already used for a
 * different request"), and rightly: the key is a promise about the content.
 *
 * The safety comes from the caller, not from here. `conflicts.ts` only offers
 * `resend_as_new` for conflicts where the original CERTAINLY never landed. For
 * anything that may have partially committed, a new key would bypass the
 * server's duplicate protection and execute a second time — so it is not
 * offered, and this function must not be called.
 *
 * Both rows move in one transaction, including the denormalised money columns,
 * which would otherwise still show the pre-edit total on the branch's own
 * screens.
 */
export async function reissueOperation(
  id: number,
  next: {
    entity: SyncEntity;
    previousClientOperationId: string;
    clientOperationId: string;
    payload: unknown;
    businessDate: string | null;
  },
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  const table = DOMAIN_TABLE[next.entity];
  const payloadJson = JSON.stringify(next.payload);
  const record = (next.payload ?? {}) as Record<string, unknown>;

  await db.transaction(async tx => {
    await tx.execute(
      `UPDATE sync_queue
          SET client_operation_id = ?, payload = ?, business_date = ?,
              status = 'pending', attempt_count = 0, next_attempt_at = ?,
              last_error_code = NULL, last_error_message = NULL, updated_at = ?
        WHERE id = ?`,
      [next.clientOperationId, payloadJson, next.businessDate, now, now, id],
    );

    if (!table) return;

    await tx.execute(
      `UPDATE ${table}
          SET client_operation_id = ?, payload = ?, business_date = ?,
              sync_status = 'pending', updated_at = ?
        WHERE client_operation_id = ?`,
      [
        next.clientOperationId,
        payloadJson,
        next.businessDate,
        now,
        next.previousClientOperationId,
      ],
    );

    // The mirrored money columns exist so branch screens can list transactions
    // without parsing every payload. An edit that changed the amount has to
    // reach them too, or the list and the transaction disagree.
    if (table === 'local_sales') {
      await tx.execute(
        `UPDATE local_sales SET grand_total = ?, payment_method = ? WHERE client_operation_id = ?`,
        [
          numericText(record.grandTotal),
          String(record.paymentMethod ?? 'cash'),
          next.clientOperationId,
        ],
      );
    } else if (table === 'local_expenses') {
      await tx.execute(
        `UPDATE local_expenses SET amount = ?, category = ? WHERE client_operation_id = ?`,
        [numericText(record.amount), String(record.category ?? ''), next.clientOperationId],
      );
    }
  });
}
