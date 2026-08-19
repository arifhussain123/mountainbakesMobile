/**
 * Local SQLite migrations.
 *
 * Rules:
 * - Migrations are append-only and forward-only. Never edit a shipped migration;
 *   add a new one. An edited migration has already run on real devices, so the
 *   change simply never applies there and the schema silently diverges.
 * - Never destructive. An app update must not drop a table holding unsynced
 *   transactions — that is a staff member's shift of work.
 * - Each runs inside a transaction; a failure rolls back and leaves
 *   `user_version` untouched, so the next launch retries the same step.
 *
 * Versioning uses SQLite's own `PRAGMA user_version`, so no bootstrap table is
 * needed and version 0 is a correct description of an empty database.
 */

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: '001_initial',
    statements: [
      // ── Reference data mirrored from the server for offline reads ──────────
      // `server_id` is the API's UUID. Reference rows always have one; rows the
      // device originates do not until they sync.
      `CREATE TABLE IF NOT EXISTS local_branches (
         server_id   TEXT PRIMARY KEY,
         name        TEXT NOT NULL,
         slug        TEXT,
         is_active   INTEGER NOT NULL DEFAULT 1,
         payload     TEXT NOT NULL,
         synced_at   INTEGER NOT NULL
       )`,

      `CREATE TABLE IF NOT EXISTS local_categories (
         server_id   TEXT PRIMARY KEY,
         name        TEXT NOT NULL,
         sort_order  INTEGER NOT NULL DEFAULT 0,
         is_active   INTEGER NOT NULL DEFAULT 1,
         payload     TEXT NOT NULL,
         synced_at   INTEGER NOT NULL
       )`,

      // `price` is cached for display and offline preview only. The server
      // re-resolves and stamps the authoritative unit price at commit time.
      `CREATE TABLE IF NOT EXISTS local_products (
         server_id   TEXT PRIMARY KEY,
         name        TEXT NOT NULL,
         sku         TEXT,
         category_id TEXT,
         price       TEXT NOT NULL,
         is_active   INTEGER NOT NULL DEFAULT 1,
         is_special  INTEGER NOT NULL DEFAULT 0,
         payload     TEXT NOT NULL,
         synced_at   INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_products_category ON local_products(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_active ON local_products(is_active)`,

      // Cached stock balances. Advisory only — the server rejects overdrawing
      // with a 409 and is the only authority on what is actually in stock.
      `CREATE TABLE IF NOT EXISTS local_stock (
         branch_id   TEXT NOT NULL,
         product_id  TEXT NOT NULL,
         balance     TEXT NOT NULL,
         payload     TEXT NOT NULL,
         synced_at   INTEGER NOT NULL,
         PRIMARY KEY (branch_id, product_id)
       )`,

      // ── Device-originated transactions ─────────────────────────────────────
      // client_operation_id is the identity of the transaction from creation.
      // It is the Idempotency-Key sent to the server and is NEVER regenerated,
      // including across retries — regenerating it on retry is precisely how a
      // duplicate sale gets created.
      //
      // Money is stored as TEXT to preserve the exact decimal the server sent
      // (numeric(14,2) arrives as a string); binding a float here would
      // reintroduce the drift migration 20260719000001 removed.
      `CREATE TABLE IF NOT EXISTS local_sales (
         client_operation_id TEXT PRIMARY KEY,
         server_id           TEXT UNIQUE,
         branch_id           TEXT NOT NULL,
         business_date       TEXT NOT NULL,
         payload             TEXT NOT NULL,
         grand_total         TEXT NOT NULL,
         payment_method      TEXT NOT NULL,
         sync_status         TEXT NOT NULL DEFAULT 'pending',
         created_at          INTEGER NOT NULL,
         updated_at          INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_sales_status ON local_sales(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_sales_business_date ON local_sales(branch_id, business_date)`,

      `CREATE TABLE IF NOT EXISTS local_expenses (
         client_operation_id TEXT PRIMARY KEY,
         server_id           TEXT UNIQUE,
         branch_id           TEXT NOT NULL,
         business_date       TEXT NOT NULL,
         category            TEXT NOT NULL,
         amount              TEXT NOT NULL,
         payload             TEXT NOT NULL,
         sync_status         TEXT NOT NULL DEFAULT 'pending',
         created_at          INTEGER NOT NULL,
         updated_at          INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_status ON local_expenses(sync_status)`,

      `CREATE TABLE IF NOT EXISTS local_production_orders (
         client_operation_id TEXT PRIMARY KEY,
         server_id           TEXT UNIQUE,
         branch_id           TEXT NOT NULL,
         business_date       TEXT NOT NULL,
         status              TEXT NOT NULL,
         payload             TEXT NOT NULL,
         sync_status         TEXT NOT NULL DEFAULT 'pending',
         created_at          INTEGER NOT NULL,
         updated_at          INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON local_production_orders(sync_status)`,

      // ── Key/value bookkeeping ──────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS app_metadata (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    ],
  },

  {
    version: 2,
    name: '002_sync_queue',
    statements: [
      // Schema follows mountain-bakes-rn-agentic-prompt.md §5.1 (the concrete
      // SQL version), chosen over offline-sync.md's prose field list because it
      // is specific, carries indexes, and includes the `blocked` status needed
      // for dependency ordering.
      //
      // `business_date` is captured HERE, at creation, on the device. The server
      // stamps the business day on receipt, so a sale created at 21:00 and
      // synced at 07:00 would otherwise land on an already-closed day.
      `CREATE TABLE IF NOT EXISTS sync_queue (
         id                  INTEGER PRIMARY KEY AUTOINCREMENT,
         client_operation_id TEXT NOT NULL UNIQUE,
         entity              TEXT NOT NULL,
         entity_local_id     TEXT NOT NULL,
         action              TEXT NOT NULL,
         payload             TEXT NOT NULL,
         business_date       TEXT,
         depends_on          TEXT,
         priority            INTEGER NOT NULL DEFAULT 100,
         status              TEXT NOT NULL DEFAULT 'pending',
         attempt_count       INTEGER NOT NULL DEFAULT 0,
         next_attempt_at     INTEGER,
         last_error_code     TEXT,
         last_error_message  TEXT,
         created_at          INTEGER NOT NULL,
         updated_at          INTEGER NOT NULL
       )`,
      // Drives the drain query: "what is ready to send right now".
      `CREATE INDEX IF NOT EXISTS idx_queue_ready ON sync_queue(status, next_attempt_at)`,
      `CREATE INDEX IF NOT EXISTS idx_queue_depends ON sync_queue(depends_on)`,
    ],
  },

  {
    version: 3,
    name: '003_conflicts',
    statements: [
      // A conflict is never resolved silently. The local payload is preserved
      // alongside the server's state so a human can compare them, and financial
      // and stock integrity always resolves toward the server.
      `CREATE TABLE IF NOT EXISTS sync_conflicts (
         id                  INTEGER PRIMARY KEY AUTOINCREMENT,
         client_operation_id TEXT NOT NULL,
         entity              TEXT NOT NULL,
         conflict_type       TEXT NOT NULL,
         local_payload       TEXT NOT NULL,
         server_state        TEXT,
         server_message      TEXT,
         detected_at         INTEGER NOT NULL,
         resolved_at         INTEGER,
         resolution          TEXT
       )`,
      `CREATE INDEX IF NOT EXISTS idx_conflicts_unresolved ON sync_conflicts(resolved_at)`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);

/** Migrations that still need to run against a database at `currentVersion`. */
export function pendingMigrations(currentVersion: number): Migration[] {
  return MIGRATIONS.filter(m => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );
}
