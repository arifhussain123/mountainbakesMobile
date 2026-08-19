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
      //
      // **That re-resolution currently uses the price live at commit, not the
      // price effective on the sale's business date.** A sale rung up offline on
      // Monday and drained on Wednesday, across a price change, is committed at
      // Wednesday's price — the customer paid Monday's. The device sends
      // `businessDate` on every queued sale (see services/sync/endpoints.ts) and
      // the server resolves it, but `buildOrderItems` in the server's
      // orders.routes.ts reads `products.price` without consulting it.
      //
      // Nothing here can correct it: `OrderItemSchema` accepts productId, qty
      // and discount only, so the client cannot send a price and would not be
      // trusted with one if it could. The fix belongs in the server, pricing
      // from `product_price_history` as of the business date. Do not "fix" it by
      // widening the schema to let the device dictate money.
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

  {
    version: 4,
    name: '004_stock_movements',
    statements: [
      /**
       * The domain table for the `stock_movement` queue entity.
       *
       * Its absence was a real hole rather than a tidiness issue. `writeOffline`
       * pairs a domain row with a queue row in ONE transaction precisely so that
       * neither can exist alone — a queue row without a domain row is a
       * transaction the app cannot show anyone, and a domain row without a queue
       * row never syncs. `DOMAIN_TABLE` covered `sale`, `expense` and
       * `production_order`; a branch return landed in `sync_queue` and nowhere
       * else, so "what did we hand back today" had no answer offline, and the
       * record vanished entirely once the queue row was pruned after syncing.
       *
       * `movement_type` exists because the queue entity is broader than the one
       * endpoint it currently maps to. Today every row is a `return`
       * (`POST /api/stock/return`); an adjustment would be another, when the
       * server grows an endpoint for one. Keeping the column now means that
       * arrival is a new value rather than a new table.
       *
       * Quantities stay in `payload` — it is byte-for-byte the body that gets
       * POSTed, so there is no assembly step at send time and no way for the
       * stored row and the sent request to disagree.
       */
      `CREATE TABLE IF NOT EXISTS local_stock_movements (
         client_operation_id TEXT PRIMARY KEY,
         server_id           TEXT UNIQUE,
         branch_id           TEXT NOT NULL,
         business_date       TEXT NOT NULL,
         movement_type       TEXT NOT NULL DEFAULT 'return',
         payload             TEXT NOT NULL,
         sync_status         TEXT NOT NULL DEFAULT 'pending',
         created_at          INTEGER NOT NULL,
         updated_at          INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_status ON local_stock_movements(sync_status)`,
      // Mirrors the sales index: "what moved on this business day, in this
      // branch" is the question both the branch and a reconciliation asks.
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON local_stock_movements(branch_id, business_date)`,
    ],
  },

  {
    version: 5,
    name: '005_queue_last_attempt',
    statements: [
      /**
       * When this row was last *tried*, as distinct from when it last *changed*.
       *
       * `updated_at` moves for every transition — a manual retry reset, a
       * conflict being resolved — so it cannot answer "how long has this been
       * stuck". The Sync Center showed a human "3 attempts · Not enough stock"
       * with no way to tell whether that was five minutes or three days ago,
       * which is most of what decides whether to act on it.
       *
       * Nullable, and no backfill: rows queued before this migration genuinely
       * have no recorded attempt time, and inventing one from `updated_at` would
       * put a precise-looking wrong number in front of the person triaging.
       * `ADD COLUMN` is the only non-destructive schema change SQLite offers and
       * is all this needs.
       */
      `ALTER TABLE sync_queue ADD COLUMN last_attempt_at INTEGER`,
    ],
  },

  {
    version: 6,
    name: '006_conflict_records',
    statements: [
      /**
       * One OPEN conflict per operation.
       *
       * `sync_conflicts` has existed since migration 3 and nothing ever wrote to
       * it; conflicts lived only as `conflict`-status queue rows carrying a
       * single line of server text. That is too little to act on — it cannot say
       * whether a stock return already moved half its products, and it loses the
       * server's account of the disagreement entirely.
       *
       * The index is UNIQUE and PARTIAL. Unique because a row retried three
       * times must update one conflict record rather than accumulate three
       * identical ones. Partial — `WHERE resolved_at IS NULL` — because the same
       * operation may legitimately conflict again after a person has resolved
       * it, and the earlier record is history that must survive: this table is
       * the audit trail of every disagreement the device has had with the
       * server, and pruning it would defeat the point.
       *
       * Safe to add: the table has never been written to on any device, so there
       * are no existing rows for a unique index to collide with.
       */
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_conflicts_open_operation
         ON sync_conflicts(client_operation_id) WHERE resolved_at IS NULL`,
      // "What still needs a person", the Sync Center's only query against this
      // table, and the badge count behind it.
      `CREATE INDEX IF NOT EXISTS idx_conflicts_open_detected
         ON sync_conflicts(detected_at) WHERE resolved_at IS NULL`,
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
