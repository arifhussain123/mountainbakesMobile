import { LATEST_SCHEMA_VERSION, pendingMigrations } from './migrations';

/**
 * Migration runner.
 *
 * Kept behind a minimal interface rather than importing op-sqlite directly, so
 * the ordering, transaction and version-advance behaviour can be tested without
 * a native runtime. `localDb.ts` supplies the real connection.
 */

export interface MigrationTx {
  execute(query: string, params?: unknown[]): Promise<unknown>;
}

export interface MigrationDb {
  execute(query: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
  transaction(fn: (tx: MigrationTx) => Promise<void>): Promise<void>;
}

export interface MigrationResult {
  from: number;
  to: number;
  applied: string[];
}

/** Read SQLite's own schema version. A fresh database reports 0. */
export async function readSchemaVersion(db: MigrationDb): Promise<number> {
  const result = await db.execute('PRAGMA user_version');
  const row = result.rows[0];
  if (!row) return 0;
  const value = Object.values(row)[0];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Apply every migration newer than the database's current version.
 *
 * Each migration and its version bump run inside ONE transaction, so a failure
 * rolls back both — the database is never left claiming a version whose
 * statements only half-applied, and the next launch retries the same step
 * cleanly.
 *
 * A database ahead of this build (an older APK opening a newer schema) is left
 * strictly alone. Migrating backwards would destroy data the newer build wrote,
 * including unsynced transactions.
 */
export async function runMigrations(db: MigrationDb): Promise<MigrationResult> {
  const from = await readSchemaVersion(db);

  if (from > LATEST_SCHEMA_VERSION) {
    // Older binary, newer database. Do nothing rather than damage it.
    return { from, to: from, applied: [] };
  }

  const pending = pendingMigrations(from);
  const applied: string[] = [];

  for (const migration of pending) {
    await db.transaction(async tx => {
      for (const statement of migration.statements) {
        await tx.execute(statement);
      }
      // PRAGMA user_version participates in the transaction, so this commits
      // atomically with the statements above.
      await tx.execute(`PRAGMA user_version = ${migration.version}`);
    });
    applied.push(migration.name);
  }

  return { from, to: await readSchemaVersion(db), applied };
}
