/**
 * What the register reads back off the device, against a real SQLite database.
 *
 * This is the query behind "did that sale go through" after an offline shift, so
 * the parts that matter are the ones a string comparison cannot check: which
 * rows it excludes, and where it gets the difference between *waiting* and
 * *refused* from — `local_sales.sync_status` alone cannot tell them apart,
 * because `markConflict` and `markFailed` touch only the queue row.
 *
 * Runs the REAL migrations and the REAL repository SQL through `node:sqlite`
 * (see `test-utils/sqliteTestDb.ts`).
 */

import { createTestDb, type TestDb } from '@/test-utils/sqliteTestDb';

const shared = globalThis as unknown as { __queuedSalesDb: TestDb };

jest.mock('@/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__queuedSalesDb,
}));

import { runMigrations } from '@/database/runMigrations';
import {
  listQueuedSalesForDay,
  writeOffline,
} from '@/database/repositories/offlineWriteRepository';
import { markConflict, markSynced, markSuperseded } from '@/database/repositories/syncQueueRepository';

const DAY = '2026-08-27';

async function ringUp(items: { productId: string; qty: number; discount: number }[]) {
  return writeOffline({
    entity: 'sale',
    branchId: 'b-1',
    businessDate: DAY,
    payload: {
      branchId: 'b-1',
      customerName: '',
      customerPhone: '',
      items,
      paymentMethod: 'cash',
      notes: '',
    },
  });
}

async function queueIdFor(clientOperationId: string): Promise<number> {
  const res = await shared.__queuedSalesDb.execute(
    'SELECT id FROM sync_queue WHERE client_operation_id = ?',
    [clientOperationId],
  );
  return Number(res.rows[0]?.id);
}

beforeEach(async () => {
  shared.__queuedSalesDb = createTestDb();
  await runMigrations(shared.__queuedSalesDb);
});

afterEach(() => {
  shared.__queuedSalesDb.close();
});

describe('listQueuedSalesForDay', () => {
  it('counts the units and the lines out of the stored payload', async () => {
    // The payload IS the request body, so its shape is the API's rather than
    // this module's — and it carries no prices, which is why there is no total.
    await ringUp([
      { productId: 'p1', qty: 2, discount: 0 },
      { productId: 'p2', qty: 3, discount: 0 },
    ]);

    const [sale] = await listQueuedSalesForDay('b-1', DAY);

    expect(sale).toMatchObject({ lineCount: 2, units: 5, paymentMethod: 'cash' });
    expect(sale).not.toHaveProperty('grandTotal');
  });

  it('is scoped to the branch and to the business date it was stamped with', async () => {
    // The device's own stamp, not the server's: a sale rung up at 21:00 and
    // drained at 07:00 still belongs to the evening it was made.
    await ringUp([{ productId: 'p1', qty: 1, discount: 0 }]);

    expect(await listQueuedSalesForDay('b-1', DAY)).toHaveLength(1);
    expect(await listQueuedSalesForDay('b-2', DAY)).toHaveLength(0);
    expect(await listQueuedSalesForDay('b-1', '2026-08-26')).toHaveLength(0);
  });

  it('drops a sale once it has synced — the server list already has it', async () => {
    const { clientOperationId } = await ringUp([{ productId: 'p1', qty: 1, discount: 0 }]);
    await markSynced(await queueIdFor(clientOperationId), Date.now(), {
      entity: 'sale',
      clientOperationId,
      serverId: 'srv-1',
    });

    expect(await listQueuedSalesForDay('b-1', DAY)).toHaveLength(0);
  });

  it('drops a sale closed in the server favour, which is outstanding work no longer', async () => {
    const { clientOperationId } = await ringUp([{ productId: 'p1', qty: 1, discount: 0 }]);
    await markSuperseded(await queueIdFor(clientOperationId), {
      entity: 'sale',
      clientOperationId,
    });

    expect(await listQueuedSalesForDay('b-1', DAY)).toHaveLength(0);
  });

  it('reports a refused sale as refused, not as one still waiting', async () => {
    // The failure this exists to prevent: `local_sales.sync_status` is still
    // 'pending' after a 409, so a register reading only that column would tell
    // a cashier to wait for a sale the server has already rejected.
    const { clientOperationId } = await ringUp([{ productId: 'p1', qty: 1, discount: 0 }]);
    await markConflict(await queueIdFor(clientOperationId), {
      message: 'Cream roll: requested 5, available 2',
    });

    const [sale] = await listQueuedSalesForDay('b-1', DAY);
    expect(sale?.queueStatus).toBe('conflict');

    const domain = await shared.__queuedSalesDb.execute(
      'SELECT sync_status FROM local_sales WHERE client_operation_id = ?',
      [clientOperationId],
    );
    expect(domain.rows[0]?.sync_status).toBe('pending');
  });

  it('lists the newest first', async () => {
    const first = await ringUp([{ productId: 'p1', qty: 1, discount: 0 }]);
    await shared.__queuedSalesDb.execute(
      'UPDATE local_sales SET created_at = ? WHERE client_operation_id = ?',
      [1000, first.clientOperationId],
    );
    const second = await ringUp([{ productId: 'p2', qty: 1, discount: 0 }]);
    await shared.__queuedSalesDb.execute(
      'UPDATE local_sales SET created_at = ? WHERE client_operation_id = ?',
      [2000, second.clientOperationId],
    );

    const sales = await listQueuedSalesForDay('b-1', DAY);
    expect(sales.map(s => s.clientOperationId)).toEqual([
      second.clientOperationId,
      first.clientOperationId,
    ]);
  });
});
