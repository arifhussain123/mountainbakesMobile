import { open, type DB } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './migrations';
import { runMigrations, type MigrationDb, type MigrationResult } from './runMigrations';

/**
 * Local SQLite connection.
 *
 * op-sqlite over JSI: no bridge serialisation, and a synchronous API available
 * where it helps. Writes always go through `transaction()` — a sale row and its
 * sync_queue row must land together or not at all, since either one without the
 * other is a lost or a phantom transaction.
 *
 * The database is NOT encrypted at rest. It holds business records, never
 * credentials — the session and tokens live in encrypted MMKV keyed from the
 * Keychain. If encryption is later required, op-sqlite must be built against
 * SQLCipher; `encryptionKey` is inert on the default build.
 */

const DATABASE_NAME = 'mountainbakes.db';

let db: DB | null = null;

/**
 * Open the database and bring the schema up to date.
 * Idempotent — safe to call from bootstrap and from a retry.
 */
export async function initDatabase(): Promise<MigrationResult> {
  if (!db) {
    db = open({ name: DATABASE_NAME });

    // WAL lets a read proceed while a write is in flight, which is what keeps
    // the product list responsive while the sync queue drains in the background.
    db.executeSync('PRAGMA journal_mode = WAL');
    // NORMAL is the recommended durability level under WAL: safe against app
    // crashes, and only at risk from an OS-level power loss.
    db.executeSync('PRAGMA synchronous = NORMAL');
    db.executeSync('PRAGMA foreign_keys = ON');
    // Fail fast rather than hang if the queue drain and a UI write collide.
    db.executeSync('PRAGMA busy_timeout = 5000');
  }

  return runMigrations(db as unknown as MigrationDb);
}

export function getDb(): DB {
  if (!db) {
    throw new Error('[db] initDatabase() must be awaited before the database is used.');
  }
  return db;
}

/** Whether the connection is open. Used by diagnostics screens. */
export function isDatabaseOpen(): boolean {
  return db !== null;
}

/**
 * Close the connection. Used by tests and teardown only.
 *
 * Note this does NOT delete anything: unsynced transactions must survive a
 * sign-out, an app update, and a restart.
 */
export function closeDatabase(): void {
  db?.close();
  db = null;
}

export { MIGRATIONS };
export type { MigrationResult };
