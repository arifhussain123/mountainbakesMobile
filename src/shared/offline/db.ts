import { open, type DB } from '@op-engineering/op-sqlite';

let db: DB | null = null;

/**
 * One SQLite database, app-wide, shared by every module that needs an
 * offline write queue or a read cache (Production, Finance, and — once
 * retrofitted — Branch) rather than one database per module. Lazily opened
 * on first use so importing this file has no side effect in tests.
 */
export function getOfflineDb(): DB {
  if (db) return db;
  db = open({ name: 'mountainbakes-offline.sqlite' });
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS write_queue (
      id TEXT PRIMARY KEY NOT NULL,
      idempotency_key TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      invalidate_keys TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      next_attempt_at INTEGER NOT NULL
    );
  `);
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS response_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      response TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS stock_check_drafts (
      branch_id TEXT NOT NULL,
      business_date TEXT NOT NULL,
      counts_json TEXT NOT NULL,
      blind_mode INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (branch_id, business_date)
    );
  `);
  // Photos a queued write still has to upload (Return Items taken offline),
  // kept here rather than as files: the picker's own copy lives in a cache
  // directory the OS may empty, and the app has no file-system library.
  // Base64 because that is what the picker hands back and what React
  // Native's multipart encoder reads back (as a data: URI).
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS local_photos (
      id TEXT PRIMARY KEY NOT NULL,
      mime_type TEXT NOT NULL,
      base64 TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

/** Test-only: force the next `getOfflineDb()` call to reopen. Never called from app code. */
export function __resetOfflineDbForTests(): void {
  db = null;
}
