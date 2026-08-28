import { DatabaseSync } from 'node:sqlite';

/**
 * A real SQLite database for tests, behind op-sqlite's interface.
 *
 * The other database tests fake `getDb()` and assert on the SQL *text* that was
 * issued. That catches a malformed statement but not a wrong one: a `claimReady`
 * that forgets its `depends_on` clause, or a `markSynced` that updates the queue
 * row and not the domain row, both pass a string comparison and fail in a shop.
 *
 * `node:sqlite` ships with the Node this project already pins (>= 22.11), so the
 * migrations and the repository SQL can run for real with no native module and
 * no new dependency.
 *
 * What this deliberately does NOT try to be is op-sqlite. It implements the four
 * things the repositories actually use — `execute`, `executeBatch`,
 * `transaction`, and the `{rows, rowsAffected}` result shape — and nothing else.
 */

/** op-sqlite's `SQLBatchTuple`: a statement, optionally with parameter sets. */
export type BatchCommand = [string] | [string, unknown[][]];

export interface TestDb {
  execute(sql: string, params?: unknown[]): Promise<{
    rows: Array<Record<string, unknown>>;
    rowsAffected: number;
  }>;
  /**
   * Every command in one transaction, matching op-sqlite's contract — a failure
   * part-way rolls the whole batch back, which is what makes it a safe
   * replacement for the per-row `transaction()` the mirror writers used.
   */
  executeBatch(commands: BatchCommand[]): Promise<{ rowsAffected: number }>;
  transaction(fn: (tx: {
    execute(sql: string, params?: unknown[]): Promise<unknown>;
  }) => Promise<void>): Promise<void>;
  /** Drops every in-memory handle the way killing the app does. */
  close(): void;
  /** The underlying handle, for assertions that bypass the repositories. */
  raw: DatabaseSync;
}

function returnsRows(sql: string): boolean {
  const head = sql.trim().slice(0, 6).toLowerCase();
  // `PRAGMA user_version` reads; `PRAGMA user_version = N` writes. The `=` is
  // what tells them apart, and getting it wrong makes the migration runner
  // read a version it never set.
  if (head.startsWith('pragma')) return !sql.includes('=');
  return head.startsWith('select');
}

/** Params SQLite can bind. `undefined` throws, so it is normalised to null. */
function bindable(params: unknown[]): Array<string | number | null> {
  return params.map(p => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'number' || typeof p === 'string') return p;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return String(p);
  });
}

export function createTestDb(): TestDb {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  const run = async (sql: string, params: unknown[] = []) => {
    if (returnsRows(sql)) {
      const rows = db.prepare(sql).all(...bindable(params)) as Array<Record<string, unknown>>;
      // `all()` returns null-prototype objects; `Object.values` works on them
      // but a spread into a plain object keeps later assertions predictable.
      return { rows: rows.map(r => ({ ...r })), rowsAffected: 0 };
    }
    if (params.length === 0) {
      db.exec(sql);
      return { rows: [], rowsAffected: 0 };
    }
    const result = db.prepare(sql).run(...bindable(params));
    return { rows: [], rowsAffected: Number(result.changes ?? 0) };
  };

  return {
    execute: run,
    async executeBatch(commands) {
      db.exec('BEGIN');
      try {
        let rowsAffected = 0;
        for (const [sql, paramSets] of commands) {
          if (!paramSets) {
            const result = await run(sql);
            rowsAffected += result.rowsAffected;
            continue;
          }
          for (const params of paramSets) {
            const result = await run(sql, params);
            rowsAffected += result.rowsAffected;
          }
        }
        db.exec('COMMIT');
        return { rowsAffected };
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        await fn({ execute: run });
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.close();
    },
    raw: db,
  };
}
