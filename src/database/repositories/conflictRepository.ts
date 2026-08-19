import { getDb } from '@/database/localDb';
import type { SyncEntity } from '@/database/repositories/syncQueueRepository';
import type { ConflictResolution, ConflictType } from '@/services/sync/conflicts';

/**
 * The conflict record.
 *
 * `sync_conflicts` is the device's account of every disagreement it has had with
 * the server. It is written when a drain detects one and closed when a person
 * resolves it — never deleted, and never pruned. A conflict row outlives the
 * queue row it came from (those are pruned a week after syncing), because "why
 * did this sale end up at a different total" is asked at reconciliation, long
 * after the queue has moved on.
 *
 * Both sides are kept side by side on purpose: `local_payload` is exactly what
 * the operator entered, `server_state` exactly what the server answered. The
 * whole design rule is that neither silently overwrites the other — a person
 * compares them and decides, and the server stays authoritative for money and
 * stock.
 */

export interface ConflictRecord {
  id: number;
  clientOperationId: string;
  entity: SyncEntity;
  type: ConflictType;
  /** What the operator entered. Never modified after it is written. */
  localPayload: unknown;
  /** What the server answered — the whole body, including shortfalls. */
  serverState: unknown;
  /** The server's own words, shown verbatim: they name the products. */
  serverMessage: string | null;
  detectedAt: number;
  resolvedAt: number | null;
  /** How it was closed, e.g. `keep_server` or `resend_as_new:<new id>`. */
  resolution: string | null;
}

export interface RecordConflictInput {
  clientOperationId: string;
  entity: SyncEntity;
  type: ConflictType;
  localPayload: unknown;
  serverState?: unknown;
  serverMessage?: string | null;
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseJson(value: unknown): unknown {
  if (value == null) return null;
  try {
    return JSON.parse(String(value));
  } catch {
    // A stored payload that will not parse must not crash the Sync Center. The
    // raw text is more useful to a person than nothing.
    return String(value);
  }
}

function mapRow(row: Record<string, unknown>): ConflictRecord {
  return {
    id: toNum(row.id),
    clientOperationId: String(row.client_operation_id),
    entity: String(row.entity) as SyncEntity,
    type: String(row.conflict_type) as ConflictType,
    localPayload: parseJson(row.local_payload),
    serverState: parseJson(row.server_state),
    serverMessage: row.server_message == null ? null : String(row.server_message),
    detectedAt: toNum(row.detected_at),
    resolvedAt: row.resolved_at == null ? null : toNum(row.resolved_at),
    resolution: row.resolution == null ? null : String(row.resolution),
  };
}

/**
 * Record a conflict, or refresh the open one for this operation.
 *
 * Upserts against the partial unique index from migration 6: retrying a
 * conflicted row three times updates one record rather than leaving three. The
 * `detected_at` of the FIRST detection is deliberately preserved — how long a
 * conflict has been sitting unresolved is most of what decides whether to act on
 * it, and resetting it on every retry would make an old problem look new.
 *
 * `local_payload` is likewise never overwritten: it is what the operator
 * entered, and it is the half of the comparison the server cannot supply.
 */
export async function recordConflict(
  input: RecordConflictInput,
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  await db.execute(
    `INSERT INTO sync_conflicts
       (client_operation_id, entity, conflict_type, local_payload, server_state,
        server_message, detected_at, resolved_at, resolution)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
     ON CONFLICT(client_operation_id) WHERE resolved_at IS NULL
     DO UPDATE SET
       conflict_type  = excluded.conflict_type,
       server_state   = excluded.server_state,
       server_message = excluded.server_message`,
    [
      input.clientOperationId,
      input.entity,
      input.type,
      JSON.stringify(input.localPayload ?? null),
      input.serverState === undefined ? null : JSON.stringify(input.serverState),
      input.serverMessage ?? null,
      now,
    ],
  );
}

/** Open conflicts, newest first. What the Sync Center's Conflicts tab lists. */
export async function listUnresolved(limit = 100): Promise<ConflictRecord[]> {
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM sync_conflicts WHERE resolved_at IS NULL
      ORDER BY detected_at DESC LIMIT ?`,
    [limit],
  );
  return result.rows.map(mapRow);
}

/** Everything that has ever conflicted, resolved or not. The audit view. */
export async function listAll(limit = 200): Promise<ConflictRecord[]> {
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM sync_conflicts ORDER BY detected_at DESC LIMIT ?`,
    [limit],
  );
  return result.rows.map(mapRow);
}

/** The open conflict for one operation, if it has one. */
export async function getOpenConflict(
  clientOperationId: string,
): Promise<ConflictRecord | null> {
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM sync_conflicts
      WHERE client_operation_id = ? AND resolved_at IS NULL LIMIT 1`,
    [clientOperationId],
  );
  const row = (result.rows as unknown as Record<string, unknown>[] | undefined)?.[0];
  return row ? mapRow(row) : null;
}

/**
 * Close a conflict.
 *
 * `resolution` records what a person chose, not what the app inferred — it is
 * read back during reconciliation to explain why a transaction on this device
 * does not match the server. `resend_as_new` stores the id it was reissued as,
 * so the two records stay linked.
 */
export async function markResolved(
  id: number,
  resolution: ConflictResolution | string,
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  await db.execute(
    `UPDATE sync_conflicts SET resolved_at = ?, resolution = ?
      WHERE id = ? AND resolved_at IS NULL`,
    [now, resolution, id],
  );
}

/**
 * Open conflicts that no queue row is already reporting.
 *
 * The Sync Center's attention count comes from the QUEUE — rows sitting in
 * `failed` or `conflict`. That misses an entire class: a sale the server
 * accepted at a different total has a `synced` queue row and a `price_changed`
 * conflict, so it is counted nowhere and nothing ever tells anyone. Recording a
 * discrepancy that never surfaces is the same as not detecting it.
 *
 * Counted as a difference rather than a total so a conflicted operation is not
 * announced twice — once by its queue row and once by its conflict record.
 */
export async function countUnresolvedNotInQueue(): Promise<number> {
  const db = getDb();
  const result = await db.execute(
    `SELECT COUNT(*) AS n FROM sync_conflicts c
      WHERE c.resolved_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM sync_queue q
           WHERE q.client_operation_id = c.client_operation_id
             AND q.status IN ('failed', 'conflict')
        )`,
  );
  const first = (result.rows as unknown as Record<string, unknown>[] | undefined)?.[0];
  return first ? toNum(Object.values(first)[0]) : 0;
}

export async function countUnresolved(): Promise<number> {
  const db = getDb();
  const result = await db.execute(
    `SELECT COUNT(*) AS n FROM sync_conflicts WHERE resolved_at IS NULL`,
  );
  const first = (result.rows as unknown as Record<string, unknown>[] | undefined)?.[0];
  return first ? toNum(Object.values(first)[0]) : 0;
}
