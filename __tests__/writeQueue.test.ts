/**
 * @format
 */
import { createWriteQueue } from '@/shared/offline/writeQueue';
import type { QueuedWrite, QueueStorage } from '@/shared/offline/types';

// Imports the queue manager's own files directly, never the `@/shared/offline`
// barrel — the barrel also re-exports `createSqliteQueueStorage`, which pulls
// in `@op-engineering/op-sqlite` (a native module with nothing to mock here).
// This is exactly why the manager takes `QueueStorage` as an injected
// dependency: it is fully testable without SQLite.

function createInMemoryStorage(seed: QueuedWrite[] = []): QueueStorage {
  const rows = new Map(seed.map((w) => [w.id, w]));
  return {
    async insert(write) {
      rows.set(write.id, write);
    },
    async update(id, patch) {
      const existing = rows.get(id);
      if (existing) rows.set(id, { ...existing, ...patch });
    },
    async remove(id) {
      rows.delete(id);
    },
    async all() {
      return [...rows.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
  };
}

function apiError(status: number | null, message = 'failed') {
  return { status, message };
}

describe('createWriteQueue', () => {
  it('enqueues a write and reuses the same idempotency key as its id', async () => {
    const storage = createInMemoryStorage();
    const executor = jest.fn().mockResolvedValue(undefined);
    const queue = createWriteQueue({ storage, executor });

    const id = await queue.enqueue({ endpoint: '/expenses', method: 'post', payload: { amount: 100 }, idempotencyKey: 'expense-abc' });

    expect(id).toBe('expense-abc');
    const [write] = await queue.all();
    expect(write.idempotencyKey).toBe('expense-abc');
    expect(write.status).toBe('pending');
  });

  it('flush() calls the executor once per due write and removes it on success, invalidating its keys', async () => {
    const storage = createInMemoryStorage();
    const executor = jest.fn().mockResolvedValue(undefined);
    const invalidate = jest.fn();
    const queue = createWriteQueue({ storage, executor, invalidate });

    await queue.enqueue({
      endpoint: '/expenses',
      method: 'post',
      payload: { amount: 100 },
      idempotencyKey: 'expense-1',
      invalidateKeys: [['expenses']],
    });
    await queue.flush();

    expect(executor).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith([['expenses']]);
    expect(await queue.all()).toHaveLength(0);
  });

  it('a retryable failure (network / 5xx) reschedules the SAME write with the SAME idempotency key, never re-enqueuing a duplicate', async () => {
    const storage = createInMemoryStorage();
    let time = 0;
    const executor = jest.fn().mockRejectedValue(apiError(null));
    const queue = createWriteQueue({ storage, executor, now: () => time });

    await queue.enqueue({ endpoint: '/sales', method: 'post', payload: {}, idempotencyKey: 'sale-1' });
    await queue.flush();

    const [write] = await queue.all();
    expect(write.status).toBe('pending');
    expect(write.attempts).toBe(1);
    expect(write.idempotencyKey).toBe('sale-1');
    expect(write.nextAttemptAt).toBeGreaterThan(time);

    // Flushing again before the backoff window elapses must not call the executor again.
    await queue.flush();
    expect(executor).toHaveBeenCalledTimes(1);

    // Advancing past the backoff window retries with the identical idempotency key.
    time = write.nextAttemptAt;
    await queue.flush();
    expect(executor).toHaveBeenCalledTimes(2);
    expect(executor.mock.calls[1][0].idempotencyKey).toBe('sale-1');
  });

  it('a non-retryable failure (4xx validation) marks the write failed immediately, without retrying', async () => {
    const storage = createInMemoryStorage();
    const executor = jest.fn().mockRejectedValue(apiError(422, 'Amount must be positive'));
    const queue = createWriteQueue({ storage, executor });

    await queue.enqueue({ endpoint: '/expenses', method: 'post', payload: { amount: -5 }, idempotencyKey: 'expense-bad' });
    await queue.flush();

    const [write] = await queue.all();
    expect(write.status).toBe('failed');
    expect(write.attempts).toBe(1);
    expect(write.lastError).toBe('Amount must be positive');

    // A failed (non-retryable) write is never picked up by a later flush.
    await queue.flush();
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('a retryable failure that exhausts every attempt is marked failed, not retried forever', async () => {
    const storage = createInMemoryStorage();
    let time = 0;
    const executor = jest.fn().mockRejectedValue(apiError(503));
    const queue = createWriteQueue({ storage, executor, now: () => time });

    await queue.enqueue({ endpoint: '/sales', method: 'post', payload: {}, idempotencyKey: 'sale-flaky' });

    for (let i = 0; i < 5; i += 1) {
      await queue.flush();
      const [write] = await queue.all();
      if (write.status === 'pending') time = write.nextAttemptAt;
    }

    const [write] = await queue.all();
    expect(write.status).toBe('failed');
    expect(write.attempts).toBe(5);
  });

  it('onQueueChanged fires with the full current queue after enqueue and after flush', async () => {
    const storage = createInMemoryStorage();
    const onQueueChanged = jest.fn();
    const executor = jest.fn().mockResolvedValue(undefined);
    const queue = createWriteQueue({ storage, executor, onQueueChanged });

    await queue.enqueue({ endpoint: '/expenses', method: 'post', payload: {}, idempotencyKey: 'expense-2' });
    expect(onQueueChanged).toHaveBeenLastCalledWith([expect.objectContaining({ idempotencyKey: 'expense-2' })]);

    await queue.flush();
    expect(onQueueChanged).toHaveBeenLastCalledWith([]);
  });
});
