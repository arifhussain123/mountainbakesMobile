import { createTestDb, type TestDb } from '@/common/test-utils/sqliteTestDb';

/**
 * A Special Order, from the form to the HTTP call, against a real database.
 *
 * `writeFlows.test.ts` does this for the five entities that existed first. This
 * one is kept beside it rather than inside it because a Special Order differs
 * from all of them in one way that needs its own assertions: it has **no local
 * mirror table**. The queue row is the only record on the device, so every
 * state the row passes through is checked on the row itself — and on the
 * absence of anything else.
 *
 * The other thing pinned here is the boundary with a demand. A Special Order
 * goes to `/api/special-orders` and nowhere else; `/api/production-orders` now
 * refuses a non-empty `specialItems`, so the two must never share a request.
 */

const shared = globalThis as unknown as {
  __soDb: TestDb;
  __soPost: jest.Mock;
  __soPut: jest.Mock;
};

jest.mock('@/common/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__soDb,
}));

jest.mock('@/api/client', () => ({
  api: {
    post: (...args: unknown[]) => (globalThis as Record<string, any>).__soPost(...args),
    put: (...args: unknown[]) => (globalThis as Record<string, any>).__soPut(...args),
  },
}));

jest.mock('@/api/supabase/client', () => ({
  getAccessToken: async () => 'jwt',
}));

const post = jest.fn();
const put = jest.fn();
shared.__soPost = post;
shared.__soPut = put;

import { ApiError } from '@/api/errors';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import {
  getByClientOperationId,
  markSuperseded,
  reissueOperation,
} from '@/common/database/repositories/syncQueueRepository';
import { runMigrations } from '@/common/database/runMigrations';
import { CreateSpecialOrderSchema } from '@/shared';
import { drainQueue } from '../syncManager';
import { resolveWriteOutcome } from '../writeOutcome';

const BUSINESS_DATE = '2026-08-18';
const BRANCH = 'branch-1';
const online = { isOnline: () => true };

/** Exactly what `useCreateSpecialOrder` queues: rows, and no `branchId`. */
const PAYLOAD = {
  items: [
    { name: 'Birthday cake', qty: 3, amount: 1500, description: 'Blue icing', attachmentIds: [] },
    { name: 'Replacement cake', qty: 1, amount: 0, description: '', attachmentIds: [] },
  ],
};

let db: TestDb;

beforeEach(async () => {
  jest.clearAllMocks();
  db = createTestDb();
  shared.__soDb = db;
  await runMigrations(db);
});

afterEach(() => db.close());

function raise() {
  return writeOffline({
    entity: 'special_order',
    branchId: BRANCH,
    businessDate: BUSINESS_DATE,
    payload: PAYLOAD,
  });
}

function queueRows(): Array<Record<string, unknown>> {
  return db.raw.prepare('SELECT * FROM sync_queue ORDER BY id').all() as Array<
    Record<string, unknown>
  >;
}

/** How many rows every `local_*` domain table holds between them. */
function domainRowCount(): number {
  const tables = db.raw
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'local_%'`)
    .all() as Array<{ name: string }>;
  return tables.reduce(
    (sum, { name }) =>
      sum + (db.raw.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n,
    0,
  );
}

describe('raising a Special Order offline', () => {
  it('queues exactly one row, with the payload as it was entered', async () => {
    const written = await raise();

    const result = await drainQueue({ isOnline: () => false });
    expect(result.stoppedBecause).toBe('offline');
    expect(post).not.toHaveBeenCalled();

    const rows = queueRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entity).toBe('special_order');
    expect(rows[0]!.action).toBe('create');
    expect(rows[0]!.status).toBe('pending');
    expect(rows[0]!.client_operation_id).toBe(written.clientOperationId);
    expect(rows[0]!.business_date).toBe(BUSINESS_DATE);
    expect(JSON.parse(String(rows[0]!.payload))).toEqual(PAYLOAD);

    // No mirror table: the queue row is the record, and there is no other.
    expect(domainRowCount()).toBe(0);

    await expect(resolveWriteOutcome(written.clientOperationId)).resolves.toEqual({
      outcome: 'queued',
    });
  });
});

describe('draining a Special Order', () => {
  it('posts to its own endpoint, keyed and dated, and settles the row', async () => {
    post.mockResolvedValue({ id: 'so-uuid-14', orderNumber: 'SO-000014' });

    const written = await raise();
    const result = await drainQueue(online);
    expect(result.synced).toBe(1);

    expect(put).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
    const [path, payload, options] = post.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { idempotencyKey?: string },
    ];

    expect(path).toBe('/api/special-orders');
    // The id minted when it was raised, not when it was sent.
    expect(options.idempotencyKey).toBe(written.clientOperationId);
    // Merged in at send time, under the name this endpoint reads.
    expect(payload).toEqual({ ...PAYLOAD, businessDate: BUSINESS_DATE });
    expect(payload).not.toHaveProperty('branchId');
    // The request as sent is one the server's own schema accepts.
    expect(CreateSpecialOrderSchema.safeParse(payload).success).toBe(true);

    expect(queueRows()[0]!.status).toBe('synced');
    await expect(resolveWriteOutcome(written.clientOperationId)).resolves.toEqual({
      outcome: 'synced',
    });
  });

  /**
   * The retry keeps the SAME key, so a request the server already processed is
   * replayed rather than executed again — and it is still one order locally.
   */
  it('retries a network failure under the same key, without a second row', async () => {
    post
      .mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'offline' }))
      .mockResolvedValueOnce({ id: 'so-uuid-15', orderNumber: 'SO-000015' });

    const written = await raise();

    // First pass fails and backs off.
    await drainQueue(online);
    expect(queueRows()).toHaveLength(1);
    expect(queueRows()[0]!.status).toBe('pending');
    await expect(resolveWriteOutcome(written.clientOperationId)).resolves.toEqual({
      outcome: 'queued',
    });

    // Second pass, with the backoff window elapsed.
    const later = Date.now() + 60_000;
    const result = await drainQueue({ ...online, now: () => later });
    expect(result.synced).toBe(1);

    expect(post).toHaveBeenCalledTimes(2);
    const keys = post.mock.calls.map(c => (c[2] as { idempotencyKey: string }).idempotencyKey);
    expect(keys).toEqual([written.clientOperationId, written.clientOperationId]);
    expect(post.mock.calls[1]![1]).toEqual(post.mock.calls[0]![1]);

    const rows = queueRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('synced');
    expect(rows[0]!.client_operation_id).toBe(written.clientOperationId);
  });

  /**
   * A 400 is the server's judgement, and retrying cannot change it. The row is
   * parked for a person and kept: it is the only copy of what the branch asked
   * for.
   */
  it('parks a 400 as failed and does not delete it', async () => {
    post.mockRejectedValue(
      new ApiError({
        kind: 'validation',
        status: 400,
        message: 'Please enter the Special Order amount.',
        body: { error: 'Please enter the Special Order amount.' },
      }),
    );

    const written = await raise();
    const result = await drainQueue(online);
    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);

    const rows = queueRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('failed');
    expect(rows[0]!.last_error_message).toBe('Please enter the Special Order amount.');
    expect(JSON.parse(String(rows[0]!.payload))).toEqual(PAYLOAD);

    // Reported as refused — never as queued, which would promise it syncs.
    await expect(resolveWriteOutcome(written.clientOperationId)).resolves.toEqual({
      outcome: 'refused',
      reason: 'Please enter the Special Order amount.',
    });

    // And it is not picked up again on the next drain.
    await drainQueue({ ...online, now: () => Date.now() + 3_600_000 });
    expect(post).toHaveBeenCalledTimes(1);
    expect(queueRows()).toHaveLength(1);
  });
});

describe('beside a demand', () => {
  /**
   * The demand flow is unchanged: it still goes to `/api/production-orders`
   * with the empty `specialItems` it has always sent, and the Special Order
   * raised with it travels separately.
   */
  it('sends each to its own endpoint and never mixes them', async () => {
    post.mockImplementation(async (path: string) => ({ id: `srv-${path}` }));

    // Entered Special Order first; the demand still drains first on priority.
    const special = await raise();
    const demand = await writeOffline({
      entity: 'production_order',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: {
        items: [{ productId: 'p-1', qty: 24, remarks: '' }],
        requiredDate: '2026-08-20',
        packingItems: [],
        specialItems: [],
      },
    });

    const result = await drainQueue(online);
    expect(result.synced).toBe(2);

    expect(post.mock.calls.map(c => c[0])).toEqual([
      '/api/production-orders',
      '/api/special-orders',
    ]);

    const [, demandPayload, demandOptions] = post.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { idempotencyKey: string },
    ];
    expect(demandPayload.specialItems).toEqual([]);
    expect(demandPayload.items).toEqual([{ productId: 'p-1', qty: 24, remarks: '' }]);
    expect(demandOptions.idempotencyKey).toBe(demand.clientOperationId);

    const [, specialPayload, specialOptions] = post.mock.calls[1] as [
      string,
      Record<string, unknown>,
      { idempotencyKey: string },
    ];
    expect(specialPayload.items).toEqual(PAYLOAD.items);
    expect(specialPayload).not.toHaveProperty('specialItems');
    expect(specialOptions.idempotencyKey).toBe(special.clientOperationId);

    // The demand keeps its mirror row; the Special Order has none to keep.
    expect(domainRowCount()).toBe(1);
  });
});

describe('with no mirror table', () => {
  it('closes in the server\'s favour on the queue row alone', async () => {
    const written = await raise();
    const row = (await getByClientOperationId(written.clientOperationId))!;

    await markSuperseded(row.id, {
      entity: 'special_order',
      clientOperationId: written.clientOperationId,
    });

    const rows = queueRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('superseded');
    expect(JSON.parse(String(rows[0]!.payload))).toEqual(PAYLOAD);
  });

  it('re-issues under a new key on the queue row alone', async () => {
    const written = await raise();
    const row = (await getByClientOperationId(written.clientOperationId))!;
    const edited = { items: [{ ...PAYLOAD.items[0]!, amount: 1750 }] };

    await reissueOperation(row.id, {
      entity: 'special_order',
      previousClientOperationId: written.clientOperationId,
      clientOperationId: 'reissued-operation-id',
      payload: edited,
      businessDate: BUSINESS_DATE,
    });

    const rows = queueRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.client_operation_id).toBe('reissued-operation-id');
    expect(rows[0]!.status).toBe('pending');
    expect(JSON.parse(String(rows[0]!.payload))).toEqual(edited);
    expect(domainRowCount()).toBe(0);
  });
});
