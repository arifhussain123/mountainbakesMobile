import { getDb } from '@/database/localDb';
import type { Branch } from '@/shared/types/branch.types';
import type { Category, Product } from '@/shared/types/product.types';
import type { StockRow } from '@/shared/types/stock.types';

/**
 * The reference-data mirror.
 *
 * ---------------------------------------------------------------------------
 * Why this exists at all
 * ---------------------------------------------------------------------------
 * The write path has always been genuinely offline-first — a sale is written to
 * SQLite and queued in one transaction, and syncs later. But the **read** path
 * was not: `useProducts()` went straight to the API, and on a cold start with no
 * signal it produced an error state. So the excellent transaction engine was
 * unreachable, because you cannot build a cart without a product list.
 *
 * These four tables were created for this and nothing had ever written to them.
 * `docs/cache-policy.md` claimed offline catalogue reads "fall back to the
 * persisted query cache"; there is no persisted cache, and `gcTime` is memory
 * that dies with the process.
 *
 * ---------------------------------------------------------------------------
 * What is stored, and what is authoritative
 * ---------------------------------------------------------------------------
 * Each row keeps the server's response verbatim in `payload`, plus the few
 * columns worth indexing or filtering on. Reads return the parsed payload, so a
 * mirror-served list is the same shape as a live one and no call site has to
 * care which it got.
 *
 * **None of it is authoritative.** Prices here are for display and preview;
 * the server re-resolves the price at commit (see the note on `local_products`
 * in the migration). Stock balances here are advisory; the server rejects an
 * overdraw with a 409 and is the only place two branches selling the last unit
 * can be adjudicated. Mirroring makes the app *usable* offline — it does not
 * move any decision onto the device.
 *
 * ---------------------------------------------------------------------------
 * Replace, don't merge
 * ---------------------------------------------------------------------------
 * A successful fetch of a full collection replaces that collection. Upserting
 * row-by-row would leave products deleted on the server alive on the device
 * forever, and a deleted product that can still be added to a cart is a sale
 * the server will refuse. Filtered fetches (a search) are therefore **not**
 * mirrored — see `saveProducts`.
 */

type Row = Record<string, unknown>;

type Scalar = string | number | null;

/**
 * One statement, or one statement plus a list of parameter sets to run it with.
 * op-sqlite's `SQLBatchTuple`, narrowed to the two forms used here.
 */
type BatchCommand = [string] | [string, Scalar[][]];

async function rows(sql: string, params: Scalar[] = []): Promise<Row[]> {
  const db = getDb();
  const res = await db.execute(sql, params);
  return (res.rows as unknown as Row[] | undefined) ?? [];
}

/**
 * Replace a mirrored collection in ONE native call.
 *
 * This used to be a `transaction()` with an `await tx.execute()` per row, which
 * for a 400-product catalogue is 400 JSI crossings and 400 promise resolutions
 * on the JS thread — every one of them while the user is looking at a spinner
 * on a first sign-in or a pull-to-refresh. `executeBatch` sends the whole thing
 * over once and runs it inside a single transaction on the native side, so the
 * atomicity that made the loop a transaction in the first place is preserved:
 * the DELETE and every INSERT land together or not at all, and a mirror is
 * never left half-replaced for a screen to read.
 *
 * `rowsFor` is not applied to an empty list — a batch tuple with no parameter
 * sets is a statement with nothing to bind. The DELETE still runs, because a
 * collection the server now reports as empty must empty here too.
 */
async function replaceCollection<T>(
  deleteSql: string,
  deleteParams: Scalar[] | null,
  insertSql: string,
  list: readonly T[],
  rowsFor: (item: T, index: number) => Scalar[],
  extra: readonly BatchCommand[] = [],
): Promise<void> {
  const db = getDb();
  const commands: BatchCommand[] = [
    deleteParams ? [deleteSql, [deleteParams]] : [deleteSql],
  ];
  if (list.length > 0) commands.push([insertSql, list.map(rowsFor)]);
  commands.push(...extra);
  await db.executeBatch(commands as Parameters<typeof db.executeBatch>[0]);
}

function parse<T>(list: Row[]): T[] {
  return list.map(r => JSON.parse(String(r.payload)) as T);
}

/** Newest `synced_at` in a result set — what "as of" means for a mirrored read. */
function ageOf(list: Row[]): number | null {
  if (list.length === 0) return null;
  return list.reduce((max, r) => Math.max(max, Number(r.synced_at) || 0), 0) || null;
}

export interface MirrorRead<T> {
  rows: T[];
  /** Epoch ms of the newest mirrored row, or null when nothing is stored. */
  savedAt: number | null;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Replace the mirrored catalogue.
 *
 * Only ever called with an **unfiltered** fetch. A search result is a slice, and
 * writing a slice would delete every product the search did not match.
 */
export async function saveProducts(list: readonly Product[], now = Date.now()): Promise<void> {
  await replaceCollection(
    'DELETE FROM local_products',
    null,
    `INSERT INTO local_products
       (server_id, name, sku, category_id, price, is_active, is_special, payload, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    list,
    p => [
      p.id,
      p.name,
      p.sku ?? null,
      p.categoryId ?? null,
      String(p.price ?? '0'),
      p.isActive === false ? 0 : 1,
      p.isSpecial ? 1 : 0,
      JSON.stringify(p),
      now,
    ],
  );
}

/**
 * Read the mirrored catalogue, applying the same filters the API would.
 *
 * Search is `LIKE` on name and SKU rather than the server's full-text match —
 * close enough to find a product on a shop floor, and honest about being a
 * fallback. Sorting matches the server's: name, ascending.
 */
export async function readProducts(
  filters: { search?: string; categoryId?: string } = {},
): Promise<MirrorRead<Product>> {
  const where: string[] = ['is_active = 1'];
  const params: Scalar[] = [];

  if (filters.categoryId) {
    where.push('category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.search?.trim()) {
    where.push('(name LIKE ? OR sku LIKE ?)');
    const like = `%${filters.search.trim()}%`;
    params.push(like, like);
  }

  const list = await rows(
    `SELECT payload, synced_at FROM local_products WHERE ${where.join(' AND ')} ORDER BY name`,
    params,
  );
  return { rows: parse<Product>(list), savedAt: ageOf(list) };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategories(list: readonly Category[], now = Date.now()): Promise<void> {
  await replaceCollection(
    'DELETE FROM local_categories',
    null,
    `INSERT INTO local_categories (server_id, name, sort_order, is_active, payload, synced_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    list,
    // The server's order is the sort order; there is no orderable field on the
    // resource, so position in the response is the only thing carrying it.
    (c, i) => [c.id, c.name, i, c.isActive === false ? 0 : 1, JSON.stringify(c), now],
  );
}

export async function readCategories(): Promise<MirrorRead<Category>> {
  const list = await rows(
    'SELECT payload, synced_at FROM local_categories WHERE is_active = 1 ORDER BY sort_order',
  );
  return { rows: parse<Category>(list), savedAt: ageOf(list) };
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export async function saveBranches(list: readonly Branch[], now = Date.now()): Promise<void> {
  await replaceCollection(
    'DELETE FROM local_branches',
    null,
    `INSERT INTO local_branches (server_id, name, slug, is_active, payload, synced_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    list,
    b => [b.id, b.name, b.slug ?? null, b.isActive === false ? 0 : 1, JSON.stringify(b), now],
  );
}

export async function readBranches(): Promise<MirrorRead<Branch>> {
  const list = await rows(
    'SELECT payload, synced_at FROM local_branches WHERE is_active = 1 ORDER BY name',
  );
  return { rows: parse<Branch>(list), savedAt: ageOf(list) };
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

/**
 * Replace one branch's mirrored balances.
 *
 * Scoped to the branch rather than wiping the table: an admin device may hold
 * several branches, and fetching one must not forget the others.
 */
export async function saveStock(
  branchId: string,
  list: readonly StockRow[],
  businessDate: string,
  now = Date.now(),
): Promise<void> {
  await replaceCollection(
    'DELETE FROM local_stock WHERE branch_id = ?',
    [branchId],
    `INSERT INTO local_stock (branch_id, product_id, balance, payload, synced_at)
     VALUES (?, ?, ?, ?, ?)`,
    list,
    s => [branchId, s.productId, String(s.balance ?? '0'), JSON.stringify(s), now],
    [
      // The business date the SERVER stamped these balances with. It has no
      // column of its own on `local_stock` because it belongs to the response,
      // not the row — and the screen shows it, so a mirrored read that invented
      // one from the device clock would display a day the balances are not
      // from. In the same batch as the rows, so the balances and the day they
      // belong to can never be written apart.
      [
        'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
        [[stockDateKey(branchId), businessDate]],
      ],
    ],
  );
}

function stockDateKey(branchId: string): string {
  return `stock.businessDate.${branchId}`;
}

export interface MirrorStockRead extends MirrorRead<StockRow> {
  /** The server's own business date for these balances; '' when never stored. */
  businessDate: string;
}

export async function readStock(branchId: string): Promise<MirrorStockRead> {
  const list = await rows(
    'SELECT payload, synced_at FROM local_stock WHERE branch_id = ? ORDER BY product_id',
    [branchId],
  );
  const meta = await rows('SELECT value FROM app_metadata WHERE key = ?', [
    stockDateKey(branchId),
  ]);
  return {
    rows: parse<StockRow>(list),
    savedAt: ageOf(list),
    businessDate: meta[0] ? String(meta[0].value) : '',
  };
}
