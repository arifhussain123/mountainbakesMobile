jest.mock('@/database/repositories/syncQueueRepository', () => ({
  claimReady: jest.fn(),
  markSyncing: jest.fn(),
  markSynced: jest.fn(),
  markRetry: jest.fn(),
  markFailed: jest.fn(),
  markConflict: jest.fn(),
  reclaimStuckSyncing: jest.fn(async () => 0),
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

jest.mock('@/services/api/client', () => ({
  api: { post: jest.fn(), put: jest.fn() },
}));

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
    expect(markSynced).toHaveBeenCalledWith(1, NOW);
    expect(result.synced).toBe(1);
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
