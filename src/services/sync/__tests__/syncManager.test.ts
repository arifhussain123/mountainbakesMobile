jest.mock('@/database/repositories/syncQueueRepository', () => ({
  claimReady: jest.fn(),
  markSyncing: jest.fn(),
  markSynced: jest.fn(),
  markRetry: jest.fn(),
  markFailed: jest.fn(),
  markConflict: jest.fn(),
  reclaimStuckSyncing: jest.fn(async () => 0),
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
  pruneSynced: jest.fn(async () => 0),
}));

jest.mock('@/database/repositories/conflictRepository', () => ({
  recordConflict: jest.fn(),
}));

jest.mock('@/services/api/client', () => ({
  api: { post: jest.fn(), put: jest.fn() },
}));

import * as conflictRepo from '@/database/repositories/conflictRepository';
import * as queue from '@/database/repositories/syncQueueRepository';
import { api } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { drainQueue } from '../syncManager';

const claimReady = queue.claimReady as jest.Mock;
const markSynced = queue.markSynced as jest.Mock;
const markRetry = queue.markRetry as jest.Mock;
const markFailed = queue.markFailed as jest.Mock;
const markConflict = queue.markConflict as jest.Mock;
const post = api.post as jest.Mock;
const recordConflict = conflictRepo.recordConflict as jest.Mock;

const NOW = 1_760_000_000_000;
const online = () => true;
const offline = () => false;
const token = async () => 'jwt';
const opts = { isOnline: online, getToken: token, now: () => NOW, random: () => 0.5 };

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
    entity: 'sale',
    entityLocalId: 'local-1',
    action: 'create',
    payload: { branchId: 'b-1', items: [] },
    businessDate: '2026-08-18',
    dependsOn: null,
    priority: 30,
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  claimReady.mockResolvedValue([]);
  (queue.getUnsyncedSummary as jest.Mock).mockResolvedValue({
    total: 0,
    pending: 0,
    needsAttention: 0,
  });
});

describe('preconditions', () => {
  it('does nothing while offline', async () => {
    const result = await drainQueue({ ...opts, isOnline: offline });
    expect(result.stoppedBecause).toBe('offline');
    expect(claimReady).not.toHaveBeenCalled();
  });

  it('does nothing without a token, and burns no attempts', async () => {
    // An expired session must not consume any transaction's retry budget.
    const result = await drainQueue({ ...opts, getToken: async () => null });
    expect(result.stoppedBecause).toBe('unauthenticated');
    expect(claimReady).not.toHaveBeenCalled();
  });

  it('reclaims rows stranded in syncing by a killed app', async () => {
    await drainQueue(opts);
    expect(queue.reclaimStuckSyncing).toHaveBeenCalled();
  });
});

describe('successful send', () => {
  it('sends the operation id as the Idempotency-Key', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({ order: { id: 'server-1' } });

    const result = await drainQueue(opts);

    expect(post).toHaveBeenCalledWith(
      '/api/orders/pos',
      expect.anything(),
      { idempotencyKey: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a' },
    );
    expect(markSynced).toHaveBeenCalledWith(1, NOW, {
      entity: 'sale',
      clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
      // `{order: {id}}` is not a shape any create endpoint returns, so there is
      // no id to read — and that is deliberately not fatal.
      serverId: null,
    });
    expect(result.synced).toBe(1);
  });

  it("closes the loop: the server's id goes back onto the local record", async () => {
    // Without this the domain row keeps `sync_status = 'pending'` for life and
    // its `server_id` column stays empty. The queue row is pruned after a week,
    // and with it the only evidence the sale ever reached the server.
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({ id: 'MB-000125', orderNumber: 'MB-000125', grandTotal: 250 });

    await drainQueue(opts);

    expect(markSynced).toHaveBeenCalledWith(1, NOW, {
      entity: 'sale',
      clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
      serverId: 'MB-000125',
    });
  });

  it('still marks synced when the id cannot be read', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue('not an object');

    const result = await drainQueue(opts);

    // Failing the drain over an unreadable id would strand a transaction the
    // server has already accepted — far worse than a blank server_id.
    expect(result.synced).toBe(1);
    expect(markSynced).toHaveBeenCalledWith(1, NOW, expect.objectContaining({ serverId: null }));
  });

  it('sends the business date captured on device', async () => {
    // The server stamps the business day on receipt, so a 9pm sale synced at 7am
    // would otherwise be billed to an already-closed day.
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({});

    await drainQueue(opts);

    expect(post.mock.calls[0][1]).toMatchObject({ businessDate: '2026-08-18' });
  });

  it('names the date field per endpoint', async () => {
    // CreateExpenseSchema takes `date`, not `businessDate`. Sending the wrong
    // key is silently ignored, which is how a queued transaction lands on the
    // wrong day without anything appearing to fail.
    claimReady.mockResolvedValue([row({ entity: 'expense' })]);
    post.mockResolvedValue({});

    await drainQueue(opts);

    expect(post.mock.calls[0][1]).toMatchObject({ date: '2026-08-18' });
    expect(post.mock.calls[0][1]).not.toHaveProperty('businessDate');
  });

  it('dates a branch return with the day it was made', async () => {
    // /api/stock/return took no client date until server migration 84. A return
    // queued at closing time and synced the next morning must still come off the
    // evening it was handed back, not the day the phone found signal.
    claimReady.mockResolvedValue([row({ entity: 'stock_movement' })]);
    post.mockResolvedValue({});

    await drainQueue(opts);

    expect(post.mock.calls[0][1]).toMatchObject({ businessDate: '2026-08-18' });
    expect(post.mock.calls[0][1]).not.toHaveProperty('date');
  });

  it('routes each entity to its real endpoint', async () => {
    claimReady.mockResolvedValue([
      row({ id: 1, entity: 'order' }),
      row({ id: 2, entity: 'expense' }),
      row({ id: 3, entity: 'production_order' }),
    ]);
    post.mockResolvedValue({});

    await drainQueue(opts);

    const paths = post.mock.calls.map(c => c[0]);
    expect(paths).toEqual(['/api/orders', '/api/expenses', '/api/production-orders']);
  });
});

describe('failure classification', () => {
  it('retries a network error with backoff, keeping it pending', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockRejectedValue(new ApiError({ kind: 'network', message: 'Network request failed.' }));

    const result = await drainQueue(opts);

    expect(markRetry).toHaveBeenCalled();
    expect(markFailed).not.toHaveBeenCalled();
    const nextAttemptAt = markRetry.mock.calls[0][1] as number;
    expect(nextAttemptAt).toBeGreaterThan(NOW);
    expect(result.failed).toBe(0);
  });

  it('parks a validation rejection instead of retrying it forever', async () => {
    // The server has judged it; re-sending cannot change the answer.
    claimReady.mockResolvedValue([row()]);
    post.mockRejectedValue(
      new ApiError({ kind: 'validation', message: 'Quantity must be positive', status: 400 }),
    );

    const result = await drainQueue(opts);

    expect(markFailed).toHaveBeenCalled();
    expect(markRetry).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it('records a 409 as a conflict for a human to resolve', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockRejectedValue(
      new ApiError({ kind: 'conflict', message: 'Insufficient stock', status: 409 }),
    );

    const result = await drainQueue(opts);

    expect(markConflict).toHaveBeenCalled();
    expect(result.conflicts).toBe(1);
    // Never silently discarded.
    expect(markFailed).not.toHaveBeenCalled();
  });

  /**
   * The queue row's status stops it being re-sent; the conflict record is what
   * lets a person act on it. Storing BOTH sides is the point — the server's
   * answer names the products and quantities, and the local payload is the only
   * copy of what the operator actually entered.
   */
  it('stores both sides of the disagreement, not just the message', async () => {
    claimReady.mockResolvedValue([row()]);
    const body = {
      error: 'Stock has changed. Please review your order.',
      details: [{ productId: 'p1', productName: 'Milk Rusk', requested: 12, available: 4 }],
    };
    post.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        message: 'Stock has changed. Please review your order.',
        status: 409,
        details: body.details,
        body,
      }),
    );

    await drainQueue(opts);

    expect(recordConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
        entity: 'sale',
        type: 'stock_changed',
        localPayload: { branchId: 'b-1', items: [] },
        serverState: body,
      }),
      NOW,
    );
  });

  /**
   * A closed business day arrives as 403 and a deleted parent as 404. Both used
   * to park as anonymous `failed` rows with one line of server text and no way
   * to act on them — and `Retry all` would then pick the 403 up and re-send it
   * forever. They are conflicts: the world moved.
   */
  it('treats a closed business day as a conflict, not a plain failure', async () => {
    claimReady.mockResolvedValue([row({ entity: 'expense' })]);
    post.mockRejectedValue(
      new ApiError({
        kind: 'authorization',
        message: 'This business day has been closed. Please contact Admin.',
        status: 403,
      }),
    );

    const result = await drainQueue(opts);

    expect(result.conflicts).toBe(1);
    expect(markFailed).not.toHaveBeenCalled();
    expect(recordConflict).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'business_day_closed' }),
      NOW,
    );
  });

  it('treats a deleted record as a conflict', async () => {
    claimReady.mockResolvedValue([row({ entity: 'order' })]);
    post.mockRejectedValue(
      new ApiError({ kind: 'notFound', message: 'Order not found', status: 404 }),
    );

    const result = await drainQueue(opts);

    expect(result.conflicts).toBe(1);
    expect(recordConflict).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'record_deleted' }),
      NOW,
    );
  });

  it('still parks an ordinary validation failure as failed', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockRejectedValue(
      new ApiError({ kind: 'validation', message: 'amount must be positive', status: 400 }),
    );

    const result = await drainQueue(opts);

    expect(result.failed).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(recordConflict).not.toHaveBeenCalled();
  });

  /**
   * Losing the conflict DETAIL must not also lose the state transition. If the
   * queue row stayed pending the drain would send a transaction the server has
   * already rejected, over and over.
   */
  it('still parks the row when the conflict detail cannot be written', async () => {
    claimReady.mockResolvedValue([row()]);
    recordConflict.mockRejectedValueOnce(new Error('disk full'));
    post.mockRejectedValue(
      new ApiError({ kind: 'conflict', message: 'Stock has changed.', status: 409 }),
    );

    const result = await drainQueue(opts);

    expect(markConflict).toHaveBeenCalled();
    expect(result.conflicts).toBe(1);
  });

  /**
   * The one conflict with no error attached. `buildOrderItems` on the server
   * prices a queued sale at COMMIT time rather than from the business date it
   * carries, so an offline sale that syncs after a price change is booked at the
   * new price while the customer paid the old one. The request SUCCEEDS — which
   * is exactly why nothing else catches it.
   */
  it('records a sale the server priced differently, without failing it', async () => {
    claimReady.mockResolvedValue([
      row({ payload: { branchId: 'b-1', grandTotal: 1200, items: [] } }),
    ]);
    post.mockResolvedValue({ id: 'srv-1', orderNumber: 'A-1', grandTotal: 1440 });

    const result = await drainQueue(opts);

    // The sale stands. The server is authoritative for money.
    expect(result.synced).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(markConflict).not.toHaveBeenCalled();
    expect(recordConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'price_changed',
        serverMessage: 'Rung up at 1200, recorded by the server as 1440.',
      }),
      NOW,
    );
  });

  it('says nothing when the server agrees on the total', async () => {
    claimReady.mockResolvedValue([
      row({ payload: { branchId: 'b-1', grandTotal: 1200, items: [] } }),
    ]);
    post.mockResolvedValue({ id: 'srv-1', grandTotal: 1200 });

    await drainQueue(opts);

    expect(recordConflict).not.toHaveBeenCalled();
  });

  it('pauses the whole drain on 401 rather than failing the row', async () => {
    claimReady.mockResolvedValue([row({ id: 1 }), row({ id: 2 })]);
    post.mockRejectedValue(new ApiError({ kind: 'authentication', message: 'JWT expired', status: 401 }));

    const result = await drainQueue(opts);

    expect(result.stoppedBecause).toBe('unauthenticated');
    // Only the first row was attempted; the second is untouched.
    expect(post).toHaveBeenCalledTimes(1);
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('parks an operation once retries are exhausted', async () => {
    claimReady.mockResolvedValue([row({ attemptCount: 7 })]);
    post.mockRejectedValue(new ApiError({ kind: 'network', message: 'offline' }));

    const result = await drainQueue(opts);

    expect(markFailed).toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it('stops mid-batch when connectivity drops', async () => {
    let calls = 0;
    const flaky = () => {
      calls += 1;
      return calls <= 2; // online for the first row only
    };
    claimReady.mockResolvedValue([row({ id: 1 }), row({ id: 2 })]);
    post.mockResolvedValue({});

    const result = await drainQueue({ ...opts, isOnline: flaky });

    expect(result.stoppedBecause).toBe('offline');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('parks an entity with no defined endpoint rather than guessing a URL', async () => {
    claimReady.mockResolvedValue([row({ action: 'update' })]);

    const result = await drainQueue(opts);

    expect(post).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });
});

/**
 * A drain claims one batch, and used to stop there.
 *
 * The engine only drains on reconnect, foreground and sign-in, so a queue
 * longer than one batch sat waiting for a trigger nobody would think to
 * produce — and the app had already told the cashier it would sync
 * automatically.
 */
describe('backlog', () => {
  it('keeps claiming while the queue keeps coming back full', async () => {
    const full = [row({ id: 1 }), row({ id: 2 })];
    claimReady
      .mockResolvedValueOnce(full)
      .mockResolvedValueOnce([row({ id: 3 })])
      .mockResolvedValue([]);
    post.mockResolvedValue({});

    const result = await drainQueue({ ...opts, batchSize: 2 });

    expect(post).toHaveBeenCalledTimes(3);
    expect(result.synced).toBe(3);
    expect(result.stoppedBecause).toBe('completed');
  });

  it('stops claiming as soon as a batch comes back short', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({});

    await drainQueue({ ...opts, batchSize: 20 });

    // One short batch is the queue saying it is empty; asking again could only
    // cost a round-trip to be told the same thing.
    expect(claimReady).toHaveBeenCalledTimes(1);
  });

  it('stays bounded when every batch comes back full', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({});

    await drainQueue({ ...opts, batchSize: 1 });

    // Ten batches, then it hands the rest to the next trigger rather than
    // holding the app in one drain indefinitely.
    expect(claimReady).toHaveBeenCalledTimes(10);
  });

  it('does not keep claiming after a 401 pauses the drain', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockRejectedValue(new ApiError({ kind: 'authentication', status: 401, message: 'no' }));

    const result = await drainQueue({ ...opts, batchSize: 1 });

    expect(result.stoppedBecause).toBe('unauthenticated');
    expect(claimReady).toHaveBeenCalledTimes(1);
  });
});

/**
 * `pruneSynced` existed, was tested, and was called from nowhere — so every
 * operation a device ever sent stayed in `sync_queue` for the life of the
 * install, and every claim and every badge count read past all of them.
 */
describe('housekeeping', () => {
  it('prunes settled rows after the work, not before it', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({});

    await drainQueue(opts);

    expect(queue.pruneSynced).toHaveBeenCalled();
    const pruneOrder = (queue.pruneSynced as jest.Mock).mock.invocationCallOrder[0]!;
    const sendOrder = post.mock.invocationCallOrder[0]!;
    expect(pruneOrder).toBeGreaterThan(sendOrder);
  });

  it('reports the drain even when the cleanup fails', async () => {
    claimReady.mockResolvedValue([row()]);
    post.mockResolvedValue({});
    (queue.pruneSynced as jest.Mock).mockRejectedValueOnce(new Error('locked'));

    const result = await drainQueue(opts);

    // A drain that moved real work is not a failed drain because a DELETE for
    // rows nobody is waiting on did not run.
    expect(result.synced).toBe(1);
    expect(result.stoppedBecause).toBe('completed');
  });
});

describe('concurrency', () => {
  it('refuses a second concurrent drain', async () => {
    claimReady.mockResolvedValue([row()]);

    // The gate is created (and `release` assigned) BEFORE the drain starts.
    // Assigning it inside mockImplementation leaves `release` a no-op until
    // post() is actually reached, and the first drain then never resolves.
    let release: (value: unknown) => void = () => {};
    const gate = new Promise(resolve => {
      release = resolve;
    });
    post.mockImplementation(() => gate);

    const first = drainQueue(opts);

    // Two drains could otherwise both claim the same row and send it twice.
    // The lock is taken synchronously, so this is rejected immediately.
    const second = await drainQueue(opts);
    expect(second.stoppedBecause).toBe('already-running');

    release({});
    await first;

    // Exactly one send, despite two drain calls.
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('allows a new drain once the previous one finished', async () => {
    claimReady.mockResolvedValue([]);
    const a = await drainQueue(opts);
    const b = await drainQueue(opts);
    expect(a.stoppedBecause).toBe('completed');
    expect(b.stoppedBecause).toBe('completed');
  });
});
