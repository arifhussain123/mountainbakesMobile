import { getOfflineDb } from './db';
import type { QueuedWrite, QueuedWriteStatus, QueueStorage } from './types';

interface WriteQueueRow {
  id: string;
  idempotency_key: string;
  endpoint: string;
  method: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  invalidate_keys: string;
  created_at: number;
  next_attempt_at: number;
}

function rowToWrite(row: WriteQueueRow): QueuedWrite {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    endpoint: row.endpoint,
    method: row.method as QueuedWrite['method'],
    payload: JSON.parse(row.payload),
    status: row.status as QueuedWriteStatus,
    attempts: row.attempts,
    lastError: row.last_error,
    invalidateKeys: JSON.parse(row.invalidate_keys),
    createdAt: row.created_at,
    nextAttemptAt: row.next_attempt_at,
  };
}

/** The real, on-device implementation of `QueueStorage` — SQLite via op-sqlite. */
export function createSqliteQueueStorage(): QueueStorage {
  return {
    async insert(write) {
      const db = getOfflineDb();
      await db.execute(
        `INSERT INTO write_queue
          (id, idempotency_key, endpoint, method, payload, status, attempts, last_error, invalidate_keys, created_at, next_attempt_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          write.id,
          write.idempotencyKey,
          write.endpoint,
          write.method,
          JSON.stringify(write.payload),
          write.status,
          write.attempts,
          write.lastError,
          JSON.stringify(write.invalidateKeys),
          write.createdAt,
          write.nextAttemptAt,
        ],
      );
    },
    async update(id, patch) {
      const db = getOfflineDb();
      const sets: string[] = [];
      const params: unknown[] = [];
      if (patch.status !== undefined) {
        sets.push('status = ?');
        params.push(patch.status);
      }
      if (patch.attempts !== undefined) {
        sets.push('attempts = ?');
        params.push(patch.attempts);
      }
      if (patch.lastError !== undefined) {
        sets.push('last_error = ?');
        params.push(patch.lastError);
      }
      if (patch.nextAttemptAt !== undefined) {
        sets.push('next_attempt_at = ?');
        params.push(patch.nextAttemptAt);
      }
      // Written mid-execution by multi-step writes (`WriteExecutionContext.persist`).
      if (patch.payload !== undefined) {
        sets.push('payload = ?');
        params.push(JSON.stringify(patch.payload));
      }
      if (patch.idempotencyKey !== undefined) {
        sets.push('idempotency_key = ?');
        params.push(patch.idempotencyKey);
      }
      if (sets.length === 0) return;
      params.push(id);
      await db.execute(`UPDATE write_queue SET ${sets.join(', ')} WHERE id = ?`, params as never[]);
    },
    async remove(id) {
      const db = getOfflineDb();
      await db.execute('DELETE FROM write_queue WHERE id = ?', [id]);
    },
    async all() {
      const db = getOfflineDb();
      const result = await db.execute('SELECT * FROM write_queue ORDER BY created_at ASC');
      return (result.rows as unknown as WriteQueueRow[]).map(rowToWrite);
    },
  };
}
