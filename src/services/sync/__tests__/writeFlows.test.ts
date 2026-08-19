import { createTestDb, type TestDb } from '@/test-utils/sqliteTestDb';

/**
 * Every business write, end to end, against a real database.
 *
 * `offlineLifecycle.test.ts` proves the queue survives a restart. What it does
 * not check is where each transaction actually GOES: it drains with a stub that
 * answers anything. This does the other half — a sale, an expense, a customer
 * order, a stock return and a production demand each taken from the form to the
 * HTTP call, asserting the four things that are wrong silently rather than
 * loudly:
 *
 *   - the URL and method for that entity,
 *   - the `Idempotency-Key`, which must equal the id minted at creation and
 *     never change between attempts,
 *   - the business-date field, whose NAME differs per endpoint and which the
 *     server ignores without complaint when it is wrong,
 *   - the server id read back out of a response shape that differs per endpoint.
 *
 * All four fail quietly in production: the transaction appears to sync, and the
 * damage — a sale on the wrong day, a duplicate, a local row with no server
 * reference — surfaces at reconciliation.
 */

const shared = globalThis as unknown as {
  __flowDb: TestDb;
  __flowPost: jest.Mock;
};

jest.mock('@/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__flowDb,
}));

jest.mock('@/services/api/client', () => ({
  api: {
    post: (...args: unknown[]) => (globalThis as Record<string, any>).__flowPost(...args),
    put: (...args: unknown[]) => (globalThis as Record<string, any>).__flowPost(...args),
  },
}));

jest.mock('@/services/supabase/client', () => ({
  getAccessToken: async () => 'jwt',
}));

const post = jest.fn();
shared.__flowPost = post;

import { writeOffline } from '@/database/repositories/offlineWriteRepository';
import { runMigrations } from '@/database/runMigrations';
import { drainQueue } from '../syncManager';
import { resolveWriteOutcome } from '../writeOutcome';

const BUSINESS_DATE = '2026-08-18';
const BRANCH = 'branch-1';
const online = { isOnline: () => true };

let db: TestDb;

beforeEach(async () => {
  jest.clearAllMocks();
  db = createTestDb();
  shared.__flowDb = db;
  await runMigrations(db);
});

afterEach(() => db.close());

/** The single call the drain made, unpacked. */
function sentRequest() {
  expect(post).toHaveBeenCalledTimes(1);
  const [path, payload, options] = post.mock.calls[0] as [
    string,
    Record<string, unknown>,
    { idempotencyKey?: string } | undefined,
  ];
  return { path, payload, idempotencyKey: options?.idempotencyKey };
}

function domainRow(table: string, id: string) {
  return db.raw
    .prepare(`SELECT * FROM ${table} WHERE client_operation_id = ?`)
    .get(id) as Record<string, unknown> | undefined;
}

describe('create sale', () => {
  const payload = {
    branchId: BRANCH,
    customerName: '',
    customerPhone: '',
    items: [{ productId: 'p-1', qty: 2, discount: 0 }],
    paymentMethod: 'cash',
    notes: '',
    grandTotal: 1250,
  };

  it('goes to the POS endpoint, dated, keyed, and settles the local row', async () => {
    post.mockResolvedValue({
      id: 'order-9',
      orderNumber: 'A-1',
      grandTotal: 1250,
    });

    const written = await writeOffline({
      entity: 'sale',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload,
    });

    const result = await drainQueue(online);
    expect(result.synced).toBe(1);

    const sent = sentRequest();
    expect(sent.path).toBe('/api/orders/pos');
    // The id minted when the sale was rung up, not when it was sent.
    expect(sent.idempotencyKey).toBe(written.clientOperationId);
    // Named `businessDate` here; `date` on expenses. Wrong key = wrong day.
    expect(sent.payload.businessDate).toBe(BUSINESS_DATE);
    expect(sent.payload.items).toEqual(payload.items);

    const local = domainRow('local_sales', written.clientOperationId)!;
    expect(local.sync_status).toBe('synced');
    expect(local.server_id).toBe('order-9');
    expect(local.business_date).toBe(BUSINESS_DATE);

    await expect(resolveWriteOutcome(written.clientOperationId)).resolves.toEqual({
      outcome: 'synced',
    });
  });

  /**
   * The cashier is told "saved offline", never "saved". Reporting a queued
   * transaction as complete is how the same sale gets rung up twice.
   */
  it('reports a sale queued while offline as queued, not saved', async () => {
    const written = await writeOffline({
      entity: 'sale',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload,
    });

    const result = await drainQueue({ isOnline: () => false });
    expect(result.stoppedBecause).toBe('offline');
    expect(post).not.toHaveBeenCalled();

    await expect(resolveWriteOutcome(written.clientOperationId)).resolves.toEqual({
      outcome: 'queued',
    });
    expect(domainRow('local_sales', written.clientOperationId)!.sync_status).toBe('pending');
  });

  /**
   * A 409 for insufficient stock is a REFUSAL, not a queue — it never syncs by
   * itself. Reporting it as pending means nobody looks at it until the till is
   * reconciled and a sale is missing.
   */
  it('reports a sale the server refused as refused, and keeps it', async () => {
    const { ApiError } = require('@/services/api/errors');
    post.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        status: 409,
        message: 'Stock has changed. Please review your order.',
        details: [{ productId: 'p-1', productName: 'Milk Rusk', requested: 2, available: 0 }],
        body: { error: 'Stock has changed. Please review your order.' },
      }),
    );

    const written = await writeOffline({
      entity: 'sale',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload,
    });

    const result = await drainQueue(online);
    expect(result.conflicts).toBe(1);
    expect(result.synced).toBe(0);

    const outcome = await resolveWriteOutcome(written.clientOperationId);
    expect(outcome.outcome).toBe('refused');
    expect(outcome.reason).toContain('Stock has changed');

    // Nothing deleted — the sale is still the only record of what was rung up.
    expect(domainRow('local_sales', written.clientOperationId)).toBeDefined();

    // And it is stored as a conflict a person can act on, with both sides.
    const conflict = db.raw
      .prepare('SELECT * FROM sync_conflicts WHERE client_operation_id = ?')
      .get(written.clientOperationId) as Record<string, unknown>;
    expect(conflict.conflict_type).toBe('stock_changed');
    expect(conflict.resolved_at).toBeNull();
  });
});

describe('create expense', () => {
  it('uses `date`, not `businessDate` — the one endpoint that differs', async () => {
    post.mockResolvedValue({ id: 'exp-4' });

    const written = await writeOffline({
      entity: 'expense',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: {
        category: 'Utilities',
        description: 'Electricity bill',
        paymentMethod: 'cash',
        amount: 4500,
        remarks: '',
      },
    });

    await drainQueue(online);
    const sent = sentRequest();

    expect(sent.path).toBe('/api/expenses');
    expect(sent.payload.date).toBe(BUSINESS_DATE);
    // Sending `businessDate` here would be silently ignored by the server.
    expect(sent.payload.businessDate).toBeUndefined();

    const local = domainRow('local_expenses', written.clientOperationId)!;
    expect(local.sync_status).toBe('synced');
    expect(local.server_id).toBe('exp-4');
    expect(local.amount).toBe('4500');
  });
});

describe('create order', () => {
  it('goes to the customer-order endpoint, which is not the POS one', async () => {
    post.mockResolvedValue({ id: 'order-2', orderNumber: 'B-7', grandTotal: 900 });

    await writeOffline({
      entity: 'order',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: {
        branchId: BRANCH,
        customerId: 'cust-1',
        items: [{ productId: 'p-1', qty: 3, discount: 0 }],
        paymentMethod: 'cash',
        deliveryCharges: 0,
        notes: '',
      },
    });

    await drainQueue(online);
    const sent = sentRequest();

    expect(sent.path).toBe('/api/orders');
    expect(sent.payload.businessDate).toBe(BUSINESS_DATE);
    expect(sent.payload.customerId).toBe('cust-1');
  });
});

describe('stock update', () => {
  /**
   * The return is the only endpoint whose response has no `id`: it commits one
   * row per product and answers `{ids: [...]}`. Reading `id` here would leave
   * every return with a blank server reference.
   */
  it('reads the server id out of an ids array', async () => {
    post.mockResolvedValue({ ids: ['ret-1', 'ret-2'] });

    const written = await writeOffline({
      entity: 'stock_movement',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: {
        items: [
          { productId: 'p-1', qty: 3 },
          { productId: 'p-2', qty: 1 },
        ],
      },
    });

    await drainQueue(online);
    const sent = sentRequest();

    expect(sent.path).toBe('/api/stock/return');
    expect(sent.payload.businessDate).toBe(BUSINESS_DATE);

    const local = domainRow('local_stock_movements', written.clientOperationId)!;
    expect(local.sync_status).toBe('synced');
    expect(local.server_id).toBe('ret-1');
    expect(local.movement_type).toBe('return');
  });

  /**
   * A return that raced a sale and moved SOME products. Re-sending it as a new
   * transaction would move those again — so it must be stored as the conflict
   * type that refuses a fresh idempotency key.
   */
  it('stores a partly-applied return as partially_committed', async () => {
    const { ApiError } = require('@/services/api/errors');
    const body = {
      error: 'Stock for Milk Rusk changed while the return was being saved.',
      details: [{ productId: 'p-2', productName: 'Cake Rusk', requested: 1, available: 0 }],
      committed: [{ id: 'ret-1', productName: 'Milk Rusk', qty: 3 }],
    };
    post.mockRejectedValue(
      new ApiError({ kind: 'conflict', status: 409, message: body.error, body }),
    );

    const written = await writeOffline({
      entity: 'stock_movement',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { items: [{ productId: 'p-1', qty: 3 }] },
    });

    await drainQueue(online);

    const conflict = db.raw
      .prepare('SELECT * FROM sync_conflicts WHERE client_operation_id = ?')
      .get(written.clientOperationId) as Record<string, unknown>;
    expect(conflict.conflict_type).toBe('partially_committed');

    const { policyFor } = require('../conflicts');
    expect(policyFor('partially_committed').resolutions).not.toContain('resend_as_new');
  });
});

describe('production workflow', () => {
  it('sends a demand with the date the branch needs it by', async () => {
    post.mockResolvedValue({ id: 'demand-3' });

    const written = await writeOffline({
      entity: 'production_order',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: {
        items: [{ productId: 'p-1', qty: 24, remarks: '' }],
        requiredDate: '2026-08-20',
      },
    });

    await drainQueue(online);
    const sent = sentRequest();

    expect(sent.path).toBe('/api/production-orders');
    // Two distinct dates: the day it was RAISED and the day it is NEEDED.
    expect(sent.payload.businessDate).toBe(BUSINESS_DATE);
    expect(sent.payload.requiredDate).toBe('2026-08-20');

    const local = domainRow('local_production_orders', written.clientOperationId)!;
    expect(local.sync_status).toBe('synced');
    expect(local.server_id).toBe('demand-3');
  });
});

describe('across the whole shift', () => {
  /**
   * Priority ordering is a data-integrity rule, not a nicety: an order must
   * exist on the server before a sale can reference it, and a stock movement
   * follows both.
   */
  it('drains in dependency order regardless of the order things were entered', async () => {
    post.mockImplementation(async (path: string) => ({ id: `srv-${path}`, ids: ['r-1'] }));

    // Entered in the WRONG order on purpose.
    await writeOffline({
      entity: 'stock_movement',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { items: [{ productId: 'p-1', qty: 1 }] },
    });
    await writeOffline({
      entity: 'expense',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { category: 'Utilities', description: 'x', paymentMethod: 'cash', amount: 10 },
    });
    await writeOffline({
      entity: 'order',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { branchId: BRANCH, customerId: 'c-1', items: [], paymentMethod: 'cash' },
    });

    const result = await drainQueue(online);
    expect(result.synced).toBe(3);

    const paths = post.mock.calls.map(c => c[0] as string);
    expect(paths).toEqual(['/api/orders', '/api/expenses', '/api/stock/return']);
  });

  /**
   * The retry keeps the SAME key. That is what makes it safe to re-send a
   * request the server may already have processed — it replays instead of
   * executing again.
   */
  it('reuses one idempotency key across a failure and a retry', async () => {
    const { ApiError } = require('@/services/api/errors');
    post
      .mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'offline' }))
      .mockResolvedValueOnce({ id: 'exp-9' });

    const written = await writeOffline({
      entity: 'expense',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { category: 'Utilities', description: 'x', paymentMethod: 'cash', amount: 10 },
    });

    // First pass fails and backs off.
    await drainQueue(online);
    expect(domainRow('local_expenses', written.clientOperationId)!.sync_status).toBe('pending');

    // Second pass, with the backoff window elapsed.
    const later = Date.now() + 60_000;
    const result = await drainQueue({ ...online, now: () => later });
    expect(result.synced).toBe(1);

    const keys = post.mock.calls.map(c => (c[2] as { idempotencyKey: string }).idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(written.clientOperationId);
    expect(keys[1]).toBe(written.clientOperationId);
  });
});
