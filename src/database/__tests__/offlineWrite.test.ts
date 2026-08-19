jest.mock('@/database/localDb', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '@/database/localDb';
import { writeOffline } from '../repositories/offlineWriteRepository';
import { isOperationId, uuidVersion } from '@/utils/operationId';

/**
 * The atomicity rule is the point of these tests: the domain row and the queue
 * row must be written in ONE transaction. A domain row with no queue row is work
 * that never syncs; a queue row with no domain row is a phantom the user cannot
 * see or correct.
 */

interface Executed {
  sql: string;
  params: unknown[];
}

function fakeDb() {
  const inTransaction: Executed[] = [];
  const outsideTransaction: Executed[] = [];
  let transactionCount = 0;

  const db = {
    async execute(sql: string, params: unknown[] = []) {
      outsideTransaction.push({ sql, params });
      return { rows: [], rowsAffected: 1 };
    },
    async transaction(fn: (tx: { execute: (s: string, p?: unknown[]) => Promise<unknown> }) => Promise<void>) {
      transactionCount += 1;
      await fn({
        async execute(sql: string, params: unknown[] = []) {
          inTransaction.push({ sql, params });
          return undefined;
        },
      });
    },
  };

  return {
    db,
    inTransaction,
    outsideTransaction,
    get transactionCount() {
      return transactionCount;
    },
  };
}

let fake: ReturnType<typeof fakeDb>;

beforeEach(() => {
  fake = fakeDb();
  (getDb as jest.Mock).mockReturnValue(fake.db);
});

describe('writeOffline', () => {
  it('writes the domain row and the queue row in ONE transaction', async () => {
    await writeOffline({
      entity: 'expense',
      branchId: 'b-1',
      payload: { category: 'Utilities', amount: 1500, description: 'Electricity' },
    });

    expect(fake.transactionCount).toBe(1);
    expect(fake.outsideTransaction).toHaveLength(0);

    const sql = fake.inTransaction.map(e => e.sql).join('\n');
    expect(sql).toContain('INSERT INTO local_expenses');
    expect(sql).toContain('INSERT INTO sync_queue');
  });

  it('uses one UUIDv7 as both keys and the idempotency key', async () => {
    const result = await writeOffline({
      entity: 'expense',
      branchId: 'b-1',
      payload: { category: 'Rent', amount: 50000 },
    });

    expect(isOperationId(result.clientOperationId)).toBe(true);
    expect(uuidVersion(result.clientOperationId)).toBe(7);

    // The same id appears on the domain row and the queue row.
    const domainId = fake.inTransaction[0]!.params[0];
    const queueId = fake.inTransaction[1]!.params[0];
    expect(domainId).toBe(result.clientOperationId);
    expect(queueId).toBe(result.clientOperationId);
  });

  it('stamps the business date on the device at creation time', async () => {
    // 01:30 Karachi belongs to the PREVIOUS business day (rollover is 2 AM).
    const lateNight = new Date('2026-08-19T01:30:00+05:00');
    jest.useFakeTimers().setSystemTime(lateNight);

    const result = await writeOffline({
      entity: 'expense',
      branchId: 'b-1',
      payload: { category: 'Transport', amount: 300 },
    });

    expect(result.businessDate).toBe('2026-08-18');

    // And it is persisted on BOTH rows, so the sync send carries it.
    const queueRow = fake.inTransaction[1]!;
    expect(queueRow.params).toContain('2026-08-18');

    jest.useRealTimers();
  });

  it('stores money as text, preserving the exact decimal', async () => {
    await writeOffline({
      entity: 'expense',
      branchId: 'b-1',
      payload: { category: 'Ingredients', amount: '1250.50' },
    });

    const domainRow = fake.inTransaction[0]!;
    expect(domainRow.params).toContain('1250.50');
  });

  it('queues a sale with its payment method and total', async () => {
    await writeOffline({
      entity: 'sale',
      branchId: 'b-1',
      payload: { grandTotal: 2500, paymentMethod: 'easypaisa', items: [] },
    });

    const sql = fake.inTransaction.map(e => e.sql).join('\n');
    expect(sql).toContain('INSERT INTO local_sales');
    expect(fake.inTransaction[0]!.params).toContain('easypaisa');
  });

  it('queues a stock movement with no local mirror', async () => {
    // The server owns the balance; there is nothing meaningful to show locally.
    await writeOffline({
      entity: 'stock_movement',
      branchId: 'b-1',
      payload: { productId: 'p-1', qty: 3, reason: 'Damaged' },
    });

    expect(fake.inTransaction).toHaveLength(1);
    expect(fake.inTransaction[0]!.sql).toContain('INSERT INTO sync_queue');
  });

  it('records a dependency so ordering is preserved', async () => {
    const result = await writeOffline({
      entity: 'sale',
      branchId: 'b-1',
      payload: { grandTotal: 100 },
      dependsOn: 'prior-operation-id',
    });

    const queueRow = fake.inTransaction[1]!;
    expect(queueRow.params).toContain('prior-operation-id');
    expect(result.queued).toBe(true);
  });

  it('gives each entity its dependency-ordering priority', async () => {
    await writeOffline({ entity: 'order', branchId: 'b-1', payload: {} });
    const orderPriority = fake.inTransaction.at(-1)!.params[6];

    fake = fakeDb();
    (getDb as jest.Mock).mockReturnValue(fake.db);
    await writeOffline({ entity: 'sale', branchId: 'b-1', payload: {} });
    const salePriority = fake.inTransaction.at(-1)!.params[6];

    // Orders sync before sales.
    expect(Number(orderPriority)).toBeLessThan(Number(salePriority));
  });
});
