import { createTestDb, type TestDb } from '@/test-utils/sqliteTestDb';

/**
 * Fetching the catalogue, against a real database.
 *
 * The write path was offline-first from the start; the READ path was not, and
 * that made the whole engine unreachable — you cannot build a cart without a
 * product list, so a cold start with no signal produced an error state and the
 * excellent offline transaction queue could never be used.
 *
 * `readThrough.test.ts` covers the decision (serve live, fall back, never fall
 * back over a refusal) with the repository mocked. This covers the other half:
 * that what the mirror stores can actually be read back, with the server's own
 * filters applied, through real SQL. A `LIKE` clause with its wildcards in the
 * wrong place passes a string comparison and returns nothing on a shop floor.
 */

const shared = globalThis as unknown as { __mirrorDb: TestDb };

jest.mock('@/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__mirrorDb,
}));

import {
  readBranches,
  readCategories,
  readProducts,
  readStock,
  saveBranches,
  saveCategories,
  saveProducts,
  saveStock,
} from '../repositories/referenceRepository';
import { runMigrations } from '../runMigrations';

const NOW = 1_760_000_000_000;
const BRANCH = 'branch-1';

function product(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'p-1',
    name: 'Milk Rusk',
    categoryId: 'c-1',
    categoryName: 'Rusks',
    sku: 'MR-100',
    price: 100,
    costPrice: 60,
    description: '',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  } as never;
}

let db: TestDb;

beforeEach(async () => {
  db = createTestDb();
  shared.__mirrorDb = db;
  await runMigrations(db);
});

afterEach(() => db.close());

describe('products', () => {
  it('round-trips the server payload verbatim', async () => {
    await saveProducts([product()], NOW);
    const read = await readProducts();

    // The whole response is stored, so a mirror-served list is the same shape
    // as a live one and no call site has to know which it got.
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0]).toEqual(
      expect.objectContaining({ id: 'p-1', name: 'Milk Rusk', price: 100, costPrice: 60 }),
    );
    expect(read.savedAt).toBe(NOW);
  });

  it('reports nothing mirrored rather than an empty catalogue', async () => {
    const read = await readProducts();
    expect(read.rows).toEqual([]);
    // `savedAt: null` is what lets a screen say "never synced" instead of
    // showing an empty shop as though the catalogue were genuinely empty.
    expect(read.savedAt).toBeNull();
  });

  /**
   * Replace, don't merge. Upserting row by row would leave a product deleted on
   * the server alive on the device forever — and a deleted product that can
   * still be added to a cart is a sale the server will refuse.
   */
  it('replaces the collection so a deleted product disappears', async () => {
    await saveProducts([product({ id: 'p-1' }), product({ id: 'p-2', name: 'Cake Rusk' })], NOW);
    expect((await readProducts()).rows).toHaveLength(2);

    await saveProducts([product({ id: 'p-1' })], NOW);
    const read = await readProducts();
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0]!.id).toBe('p-1');
  });

  /**
   * The batch that replaces a collection skips its INSERT tuple when there is
   * nothing to insert — a parameterised statement with no parameter sets binds
   * nothing. The DELETE must still run: a catalogue the server now reports as
   * empty has to empty here too, or the till keeps selling withdrawn products.
   */
  it('empties the mirror when the server returns nothing', async () => {
    await saveProducts([product({ id: 'p-1' })], NOW);
    expect((await readProducts()).rows).toHaveLength(1);

    await saveProducts([], NOW);
    expect((await readProducts()).rows).toHaveLength(0);
  });

  it('hides inactive products the way the API does', async () => {
    await saveProducts(
      [product({ id: 'p-1' }), product({ id: 'p-2', name: 'Retired', isActive: false })],
      NOW,
    );
    const read = await readProducts();
    expect(read.rows.map(r => r.id)).toEqual(['p-1']);
  });

  it('filters by category', async () => {
    await saveProducts(
      [
        product({ id: 'p-1', categoryId: 'c-1' }),
        product({ id: 'p-2', name: 'Biscuit', categoryId: 'c-2' }),
      ],
      NOW,
    );
    const read = await readProducts({ categoryId: 'c-2' });
    expect(read.rows.map(r => r.id)).toEqual(['p-2']);
  });

  it('searches name and SKU by substring, not prefix', async () => {
    await saveProducts(
      [
        product({ id: 'p-1', name: 'Milk Rusk', sku: 'MR-100' }),
        product({ id: 'p-2', name: 'Cake Rusk', sku: 'CR-200' }),
      ],
      NOW,
    );

    // A substring in the MIDDLE — the case a prefix LIKE would miss.
    expect((await readProducts({ search: 'Rusk' })).rows).toHaveLength(2);
    expect((await readProducts({ search: 'Milk' })).rows.map(r => r.id)).toEqual(['p-1']);
    // ...and by SKU, which is how staff actually look a product up.
    expect((await readProducts({ search: 'CR-2' })).rows.map(r => r.id)).toEqual(['p-2']);
    expect((await readProducts({ search: 'nothing' })).rows).toEqual([]);
  });

  it('ignores a blank search rather than matching nothing', async () => {
    await saveProducts([product()], NOW);
    expect((await readProducts({ search: '   ' })).rows).toHaveLength(1);
  });

  it('sorts by name, as the server does', async () => {
    await saveProducts(
      [
        product({ id: 'p-1', name: 'Zebra Cake' }),
        product({ id: 'p-2', name: 'Almond Rusk' }),
      ],
      NOW,
    );
    expect((await readProducts()).rows.map(r => r.name)).toEqual(['Almond Rusk', 'Zebra Cake']);
  });
});

describe('categories and branches', () => {
  /**
   * The mirror preserves the order the SERVER sent, not the `sortOrder` field.
   *
   * `saveCategories` writes the array index into `sort_order`, so the read
   * reproduces the response exactly. That looks like a bug and is not: the
   * server sorts in Postgres (`.order('sort_order', {ascending: true})` in
   * products.routes.ts), so the response order already IS sort order — and
   * re-sorting on a field the device holds a stale copy of could only disagree
   * with what the server just said.
   *
   * The consequence worth knowing: a `sortOrder` value that disagrees with the
   * response order is ignored. Asserted here so the behaviour is deliberate
   * rather than discovered.
   */
  it('preserves the order the server sent, ignoring the sortOrder field', async () => {
    await saveCategories(
      [
        { id: 'c-2', name: 'Cakes', slug: 'cakes', sortOrder: 99, isActive: true, createdAt: '' },
        { id: 'c-1', name: 'Rusks', slug: 'rusks', sortOrder: 1, isActive: true, createdAt: '' },
      ],
      NOW,
    );
    const read = await readCategories();
    // Response order, NOT sortOrder order (which would be c-1, c-2).
    expect(read.rows.map(c => c.id)).toEqual(['c-2', 'c-1']);
  });

  it('hides an inactive category, as a second line of defence', async () => {
    // The server already filters these out; the mirror does not rely on that.
    await saveCategories(
      [
        { id: 'c-1', name: 'Rusks', slug: 'rusks', sortOrder: 1, isActive: true, createdAt: '' },
        { id: 'c-3', name: 'Old', slug: 'old', sortOrder: 3, isActive: false, createdAt: '' },
      ],
      NOW,
    );
    expect((await readCategories()).rows.map(c => c.id)).toEqual(['c-1']);
  });

  /** A branch NAME has to render offline, and only the server knows it. */
  it('mirrors branches so a branch name renders with no signal', async () => {
    await saveBranches(
      [{ id: BRANCH, name: 'Skardu Main' } as never],
      NOW,
    );
    const read = await readBranches();
    expect(read.rows[0]).toEqual(expect.objectContaining({ id: BRANCH, name: 'Skardu Main' }));
  });
});

describe('stock', () => {
  const rows = [
    { productId: 'p-1', productName: 'Milk Rusk', balance: 12 },
    { productId: 'p-2', productName: 'Cake Rusk', balance: 3 },
  ] as never[];

  /**
   * The business date is the SERVER's for these balances, kept in app_metadata
   * rather than invented from the device clock — a mirrored read that made one
   * up would show a day the balances are not from.
   */
  it('keeps the server business date alongside the balances', async () => {
    await saveStock(BRANCH, rows, '2026-08-18', NOW);
    const read = await readStock(BRANCH);

    expect(read.rows).toHaveLength(2);
    expect(read.businessDate).toBe('2026-08-18');
    expect(read.savedAt).toBe(NOW);
  });

  it('reports an empty business date when nothing was ever mirrored', async () => {
    const read = await readStock(BRANCH);
    expect(read.rows).toEqual([]);
    expect(read.businessDate).toBe('');
    expect(read.savedAt).toBeNull();
  });

  /** Balances are per branch; one branch's refresh must not wipe another's. */
  it('scopes a replace to the branch it is for', async () => {
    await saveStock(BRANCH, rows, '2026-08-18', NOW);
    await saveStock('branch-2', [rows[0]!], '2026-08-18', NOW);

    await saveStock('branch-2', [], '2026-08-19', NOW);

    expect((await readStock(BRANCH)).rows).toHaveLength(2);
    expect((await readStock('branch-2')).rows).toHaveLength(0);
  });

  /**
   * Advisory only. The server rejects an overdraw with a 409 and is the only
   * place two branches selling the last unit can be adjudicated — so a mirrored
   * balance is never a reason to allow or block a sale locally.
   */
  it('stores a balance verbatim, including one that has gone negative', async () => {
    await saveStock(
      BRANCH,
      [{ productId: 'p-1', productName: 'Milk Rusk', balance: -2 }] as never[],
      '2026-08-18',
      NOW,
    );
    expect((await readStock(BRANCH)).rows[0]).toEqual(
      expect.objectContaining({ balance: -2 }),
    );
  });
});

describe('the mirror and the queue share one database', () => {
  /**
   * The catalogue is disposable and the queue is not. A catalogue refresh
   * deletes and rewrites whole collections; if that could ever reach the queue,
   * a routine sync would destroy a shift's unsynced takings.
   */
  it('a catalogue refresh cannot touch queued transactions', async () => {
    db.raw
      .prepare(
        `INSERT INTO sync_queue
           (client_operation_id, entity, entity_local_id, action, payload,
            business_date, priority, status, attempt_count, created_at, updated_at)
         VALUES ('op-1', 'sale', 'op-1', 'create', '{}', '2026-08-18', 30, 'pending', 0, ?, ?)`,
      )
      .run(NOW, NOW);

    await saveProducts([product()], NOW);
    await saveCategories([], NOW);
    await saveStock(BRANCH, [], '2026-08-18', NOW);

    const queued = db.raw.prepare('SELECT COUNT(*) AS n FROM sync_queue').get() as { n: number };
    expect(queued.n).toBe(1);
  });
});
