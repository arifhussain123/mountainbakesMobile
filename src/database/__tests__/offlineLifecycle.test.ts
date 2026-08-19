/**
 * The whole offline story, end to end, against a real SQLite database.
 *
 * Every step of this is covered somewhere in isolation — `offlineWrite.test.ts`
 * for the write, `syncManager.test.ts` for the drain, `conflicts.test.ts` for the
 * classification. What none of them covers is the **sequence**, and the sequence
 * is what a branch actually does:
 *
 *   ring up three transactions with no signal
 *     → close the app (mid-send, as a task-killer does it)
 *     → open it again
 *     → signal returns
 *     → everything syncs, once, and nothing is sent twice
 *
 * The restart is the part that has never been tested and is the easiest to break:
 * the queue is read back by a process that shares nothing with the one that wrote
 * it, so anything held in module state — the drain lock, a cached row — is gone,
 * and a row left `syncing` by the kill has to be reclaimed or it is stranded
 * forever. `reclaimStuckSyncing` is unit-tested; that it runs on a cold start
 * against rows a previous process wrote was not.
 *
 * This runs the REAL migrations and the REAL repository SQL through `node:sqlite`
 * (see `test-utils/sqliteTestDb.ts`), so a `claimReady` that loses its
 * `depends_on` clause fails here rather than passing a string comparison.
 */

import { createTestDb, type TestDb } from '@/test-utils/sqliteTestDb';

/**
 * The database outlives module resets, which is exactly what makes a "restart"
 * simulable: process state goes, disk state stays.
 *
 * It hangs off `globalThis` rather than a module-scope `let` because a
 * `jest.mock` factory may not close over one — the factories below run before
 * this file's body, and Jest rejects the reference outright.
 */
const shared = globalThis as unknown as {
  __testDb: TestDb;
  __apiPost: jest.Mock;
  __getToken: jest.Mock;
};

jest.mock('@/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__testDb,
}));

// Indirected through globals so the SAME jest.fn survives `jest.resetModules()`
// — otherwise the restart hands the reloaded modules a fresh mock and the
// assertions below watch a spy nothing is calling.
jest.mock('@/services/api/client', () => ({
  api: {
    post: (...args: unknown[]) => (globalThis as Record<string, any>).__apiPost(...args),
    put: (...args: unknown[]) => (globalThis as Record<string, any>).__apiPost(...args),
  },
}));

jest.mock('@/services/supabase/client', () => ({
  getAccessToken: () => (globalThis as Record<string, any>).__getToken(),
}));

const apiPost = jest.fn();
const getToken = jest.fn(async (): Promise<string | null> => 'jwt');

shared.__apiPost = apiPost;
shared.__getToken = getToken;

const BUSINESS_DATE = '2026-08-18';

/**
 * Load the modules the way a fresh process does.
 *
 * `resetModules` is the restart: `syncManager`'s `draining` flag, and every other
 * module-level value, is discarded. The database handle is not.
 */
function boot() {
  jest.resetModules();
  return {
    writeOffline: require('@/database/repositories/offlineWriteRepository').writeOffline,
    queue: require('@/database/repositories/syncQueueRepository'),
    drainQueue: require('@/services/sync/syncManager').drainQueue,
  };
}

async function migrate(db: TestDb): Promise<void> {
  const { runMigrations } = require('@/database/runMigrations');
  await runMigrations(db);
}

function rowFor(db: TestDb, clientOperationId: string) {
  return db.raw
    .prepare('SELECT * FROM sync_queue WHERE client_operation_id = ?')
    .get(clientOperationId) as Record<string, unknown> | undefined;
}

describe('offline lifecycle', () => {
  let db: TestDb;

  beforeEach(async () => {
    jest.clearAllMocks();
    getToken.mockResolvedValue('jwt');
    db = createTestDb();
    shared.__testDb = db;
    await migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  it('carries three offline transactions through a restart to a clean sync', async () => {
    // ---- 1. Three transactions rung up with no signal ---------------------
    const first = boot();

    const sale = await first.writeOffline({
      entity: 'sale',
      branchId: 'branch-1',
      businessDate: BUSINESS_DATE,
      payload: { grandTotal: '1250.00', paymentMethod: 'cash', items: [] },
    });
    const expense = await first.writeOffline({
      entity: 'expense',
      branchId: 'branch-1',
      businessDate: BUSINESS_DATE,
      payload: { category: 'utilities', amount: '400.00' },
    });
    const order = await first.writeOffline({
      entity: 'production_order',
      branchId: 'branch-1',
      businessDate: BUSINESS_DATE,
      payload: { items: [], requiredDate: BUSINESS_DATE },
    });

    // Each is a real local row, not just a queue entry: the branch can see its
    // own work before the server has ever heard of it.
    const saleRow = db.raw
      .prepare('SELECT * FROM local_sales WHERE client_operation_id = ?')
      .get(sale.clientOperationId) as Record<string, unknown>;
    expect(saleRow.grand_total).toBe('1250.00');
    expect(saleRow.sync_status).toBe('pending');
    expect(saleRow.business_date).toBe(BUSINESS_DATE);

    const queued = db.raw
      .prepare('SELECT * FROM sync_queue ORDER BY priority')
      .all() as Array<Record<string, unknown>>;
    expect(queued).toHaveLength(3);
    expect(queued.every(r => r.status === 'pending')).toBe(true);

    // ---- 2. A drain attempted while still offline changes nothing ---------
    const offlineDrain = await first.drainQueue({
      isOnline: () => false,
      getToken,
    });
    expect(offlineDrain.stoppedBecause).toBe('offline');
    expect(apiPost).not.toHaveBeenCalled();

    // ---- 3. Killed mid-send ----------------------------------------------
    // A task-killer during the first attempt leaves the row claimed. Nothing
    // will ever move it again without the reclaim on the next start.
    await first.queue.markSyncing(
      (rowFor(db, sale.clientOperationId) as { id: number }).id,
      Date.now(),
    );
    expect(rowFor(db, sale.clientOperationId)!.status).toBe('syncing');

    // ---- 4. Restart, then signal returns ----------------------------------
    const restarted = boot();

    let serverId = 0;
    apiPost.mockImplementation(async () => ({ id: `server-${++serverId}` }));

    const result = await restarted.drainQueue({
      isOnline: () => true,
      getToken,
    });

    // The stranded row was reclaimed and sent along with the other two.
    expect(result.synced).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.remaining).toBe(0);
    expect(apiPost).toHaveBeenCalledTimes(3);

    // ---- 5. What was sent -------------------------------------------------
    const calls = apiPost.mock.calls as Array<[string, Record<string, unknown>, { idempotencyKey: string }]>;
    const byPath = new Map(calls.map(c => [c[0], c]));

    // Dependency ordering: the demand precedes the sale, which precedes the
    // expense. Priority is what enforces it, and it is a real column, not a
    // convention held by the caller.
    expect(calls.map(c => c[0])).toEqual([
      '/api/production-orders',
      '/api/orders/pos',
      '/api/expenses',
    ]);

    // Every attempt carries the operation id it was created with — the whole
    // basis of retry safety.
    expect(byPath.get('/api/orders/pos')![2].idempotencyKey).toBe(sale.clientOperationId);
    expect(byPath.get('/api/expenses')![2].idempotencyKey).toBe(expense.clientOperationId);
    expect(byPath.get('/api/production-orders')![2].idempotencyKey).toBe(order.clientOperationId);

    // The business date captured on the device travels with it, under the name
    // each endpoint expects. `date` on expenses, `businessDate` elsewhere.
    expect(byPath.get('/api/orders/pos')![1].businessDate).toBe(BUSINESS_DATE);
    expect(byPath.get('/api/expenses')![1].date).toBe(BUSINESS_DATE);
    expect(byPath.get('/api/expenses')![1].businessDate).toBeUndefined();

    // ---- 6. The loop is closed back onto the local rows -------------------
    for (const op of [sale, expense, order]) {
      expect(rowFor(db, op.clientOperationId)!.status).toBe('synced');
    }
    const syncedSale = db.raw
      .prepare('SELECT sync_status, server_id FROM local_sales WHERE client_operation_id = ?')
      .get(sale.clientOperationId) as Record<string, unknown>;
    expect(syncedSale.sync_status).toBe('synced');
    expect(String(syncedSale.server_id)).toMatch(/^server-/);

    // ---- 7. A second drain sends nothing again ----------------------------
    // The duplicate that matters is not the server's to catch here: a synced row
    // must never be offered to the drain a second time in the first place.
    const again = await restarted.drainQueue({ isOnline: () => true, getToken });
    expect(again.synced).toBe(0);
    expect(apiPost).toHaveBeenCalledTimes(3);
  });

  it('parks a refused sale as a conflict and keeps it, across a restart', async () => {
    const { writeOffline, drainQueue } = boot();

    const sale = await writeOffline({
      entity: 'sale',
      branchId: 'branch-1',
      businessDate: BUSINESS_DATE,
      payload: { grandTotal: '80.00', paymentMethod: 'cash', items: [] },
    });

    const { ApiError } = require('@/services/api/errors');
    apiPost.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        status: 409,
        message: 'Not enough stock for Chocolate Cake.',
        body: { error: 'Not enough stock for Chocolate Cake.', shortfalls: [{ productId: 'p-1' }] },
      }),
    );

    const result = await drainQueue({ isOnline: () => true, getToken });
    expect(result.conflicts).toBe(1);
    expect(rowFor(db, sale.clientOperationId)!.status).toBe('conflict');

    // Both sides of the disagreement are kept, which is what a person needs to
    // decide anything. The local payload alone cannot say what the server saw.
    const conflict = db.raw
      .prepare('SELECT * FROM sync_conflicts WHERE client_operation_id = ?')
      .get(sale.clientOperationId) as Record<string, unknown>;
    expect(conflict.server_message).toContain('Chocolate Cake');
    expect(String(conflict.local_payload)).toContain('80.00');
    expect(conflict.resolved_at).toBeNull();

    // ---- The rule that matters most --------------------------------------
    // A refused transaction is still the only copy of something that happened in
    // the shop. It survives the restart, and it is not re-sent on its own.
    const restarted = boot();
    apiPost.mockClear();

    const after = await restarted.drainQueue({ isOnline: () => true, getToken });
    expect(apiPost).not.toHaveBeenCalled();
    expect(after.remaining).toBe(1);

    expect(
      db.raw
        .prepare('SELECT COUNT(*) AS n FROM local_sales WHERE client_operation_id = ?')
        .get(sale.clientOperationId),
    ).toEqual({ n: 1 });
  });

  it('leaves the queue untouched when the session has expired', async () => {
    const { writeOffline, drainQueue } = boot();

    const expense = await writeOffline({
      entity: 'expense',
      branchId: 'branch-1',
      businessDate: BUSINESS_DATE,
      payload: { category: 'flour', amount: '900.00' },
    });

    getToken.mockResolvedValue(null);

    const result = await drainQueue({ isOnline: () => true, getToken });
    expect(result.stoppedBecause).toBe('unauthenticated');
    expect(apiPost).not.toHaveBeenCalled();

    // Pending, and with its retry budget intact: an expired token is not the
    // transaction's fault and must not cost it an attempt.
    const row = rowFor(db, expense.clientOperationId)!;
    expect(row.status).toBe('pending');
    expect(row.attempt_count).toBe(0);
  });
});
