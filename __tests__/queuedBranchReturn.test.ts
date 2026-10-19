/**
 * @format
 *
 * A Return Items save queued offline (`executeQueuedBranchReturn`), run
 * through the real write queue with an in-memory storage — same reasoning as
 * `writeQueue.test.ts`: retry/idempotency logic verified without SQLite.
 */
import { executeQueuedBranchReturn, queuedReturnPhotoProgress, type QueuedReturnDeps, type QueuedReturnPayload } from '@/api/queuedBranchReturn';
import { createWriteQueue } from '@/shared/offline/writeQueue';
import type { QueuedWrite, QueueStorage } from '@/shared/offline/types';

function createInMemoryStorage(): QueueStorage {
  const rows = new Map<string, QueuedWrite>();
  return {
    async insert(write) {
      rows.set(write.id, { ...write });
    },
    async update(id, patch) {
      const existing = rows.get(id);
      if (existing) rows.set(id, { ...existing, ...patch });
    },
    async remove(id) {
      rows.delete(id);
    },
    async all() {
      return [...rows.values()].map((w) => ({ ...w })).sort((a, b) => a.createdAt - b.createdAt);
    },
  };
}

const payload = (): QueuedReturnPayload => ({
  kind: 'branch_return',
  items: [
    { productId: 'p1', productName: 'Classic Brownie', qty: 2, localPhotoId: 'K:0', mimeType: 'image/jpeg', attachmentId: null },
    { productId: 'p2', productName: 'Cream Puff', qty: 1, localPhotoId: 'K:1', mimeType: 'image/jpeg', attachmentId: null },
  ],
  reason: 'Unsold',
  businessDate: '2026-10-20',
});

function setup() {
  let clock = 1_000;
  let uploads = 0;
  let keys = 0;
  const deps = {
    uploadPhoto: jest.fn(async () => `att-${++uploads}`),
    postReturn: jest.fn(async () => {}),
    deleteLocalPhotos: jest.fn(async () => {}),
    newIdempotencyKey: jest.fn(() => `K-new-${++keys}`),
  } satisfies QueuedReturnDeps;
  const storage = createInMemoryStorage();
  const queue = createWriteQueue({
    storage,
    executor: (write, context) => executeQueuedBranchReturn(write, context, deps),
    now: () => clock,
  });
  const advance = (ms: number) => {
    clock += ms;
  };
  return { deps, queue, advance };
}

describe('executeQueuedBranchReturn', () => {
  it('uploads every photo first, then submits ONE idempotent POST with a photo per line', async () => {
    const { deps, queue } = setup();
    await queue.enqueue({ endpoint: '/stock/return', method: 'post', payload: payload(), idempotencyKey: 'K' });
    await queue.flush();

    expect(deps.uploadPhoto).toHaveBeenCalledTimes(2);
    expect(deps.postReturn).toHaveBeenCalledTimes(1);
    const [body, key] = deps.postReturn.mock.calls[0] as unknown as [unknown, string];
    expect(key).toBe('K');
    expect(body).toEqual({
      items: [
        { productId: 'p1', qty: 2, attachmentId: 'att-1' },
        { productId: 'p2', qty: 1, attachmentId: 'att-2' },
      ],
      reason: 'Unsold',
      businessDate: '2026-10-20',
    });
    // The kept copies go once the return is on the server, and the row with them.
    expect(deps.deleteLocalPhotos).toHaveBeenCalledWith(['K:0', 'K:1']);
    expect(await queue.all()).toHaveLength(0);
  });

  it('a retry after a dropped connection resumes — no photo is uploaded twice', async () => {
    const { deps, queue, advance } = setup();
    deps.uploadPhoto.mockImplementationOnce(async () => 'att-1').mockImplementationOnce(async () => {
      throw { status: null, message: 'No internet connection.' };
    });
    await queue.enqueue({ endpoint: '/stock/return', method: 'post', payload: payload(), idempotencyKey: 'K' });
    await queue.flush();

    const [waiting] = await queue.all();
    expect(waiting.status).toBe('pending');
    expect(queuedReturnPhotoProgress(waiting.payload as QueuedReturnPayload)).toEqual({ uploaded: 1, total: 2 });
    expect(deps.postReturn).not.toHaveBeenCalled();

    deps.uploadPhoto.mockImplementationOnce(async () => 'att-2');
    advance(60_000);
    await queue.flush();

    expect(deps.uploadPhoto).toHaveBeenCalledTimes(3); // 1 ok + 1 failed + only the missing one again
    expect((deps.uploadPhoto.mock.calls[2] as unknown as [{ productId: string }])[0].productId).toBe('p2');
    expect(deps.postReturn).toHaveBeenCalledTimes(1);
    expect(await queue.all()).toHaveLength(0);
  });

  it('a retried POST sends the same body under the same key (the server replays it)', async () => {
    const { deps, queue, advance } = setup();
    deps.postReturn.mockImplementationOnce(async () => {
      throw { status: 503, message: 'busy' };
    });
    await queue.enqueue({ endpoint: '/stock/return', method: 'post', payload: payload(), idempotencyKey: 'K' });
    await queue.flush();
    advance(60_000);
    await queue.flush();

    expect(deps.uploadPhoto).toHaveBeenCalledTimes(2);
    const [first, second] = deps.postReturn.mock.calls as unknown as [unknown, string][];
    expect(JSON.stringify(second[0])).toBe(JSON.stringify(first[0]));
    expect(second[1]).toBe(first[1]);
  });

  it('attachment_unavailable: re-uploads those photos from the phone and resubmits under a NEW key', async () => {
    const { deps, queue } = setup();
    deps.postReturn.mockImplementationOnce(async () => {
      throw { status: 409, message: 'Photo unavailable', details: { code: 'attachment_unavailable', attachmentIds: ['att-1'] } };
    });
    await queue.enqueue({ endpoint: '/stock/return', method: 'post', payload: payload(), idempotencyKey: 'K' });
    await queue.flush();

    expect(deps.uploadPhoto).toHaveBeenCalledTimes(3);
    expect((deps.uploadPhoto.mock.calls[2] as unknown as [{ productId: string }])[0].productId).toBe('p1');
    const calls = deps.postReturn.mock.calls as unknown as [{ items: { attachmentId: string }[] }, string][];
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe('K');
    expect(calls[1][1]).toBe('K-new-1');
    expect(calls[1][0].items.map((i) => i.attachmentId)).toEqual(['att-3', 'att-2']);
    expect(await queue.all()).toHaveLength(0);
  });

  it('a second attachment_unavailable is not looped on — the write fails for a person to look at', async () => {
    const { deps, queue } = setup();
    deps.postReturn.mockImplementation(async () => {
      throw { status: 409, message: 'Photo unavailable', details: { code: 'attachment_unavailable', attachmentIds: [] } };
    });
    await queue.enqueue({ endpoint: '/stock/return', method: 'post', payload: payload(), idempotencyKey: 'K' });
    await queue.flush();

    expect(deps.postReturn).toHaveBeenCalledTimes(2);
    const [failed] = await queue.all();
    expect(failed.status).toBe('failed');
    expect(failed.idempotencyKey).toBe('K-new-1');
    expect(deps.deleteLocalPhotos).not.toHaveBeenCalled();
  });
});

describe('createWriteQueue — additions for multi-step writes', () => {
  it('two overlapping flushes run a write once', async () => {
    const storage = createInMemoryStorage();
    let release!: () => void;
    const executor = jest.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const queue = createWriteQueue({ storage, executor });
    await queue.enqueue({ endpoint: '/expenses', method: 'post', payload: {}, idempotencyKey: 'e-1' });

    const first = queue.flush();
    await new Promise<void>((r) => setImmediate(r));
    const second = queue.flush();
    await new Promise<void>((r) => setImmediate(r));
    release();
    await Promise.all([first, second]);

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('resetInterrupted() puts a row left `syncing` by a killed app back to pending', async () => {
    const storage = createInMemoryStorage();
    const queue = createWriteQueue({ storage, executor: jest.fn() });
    await queue.enqueue({ endpoint: '/expenses', method: 'post', payload: {}, idempotencyKey: 'e-1' });
    await storage.update('e-1', { status: 'syncing' });

    await queue.resetInterrupted();
    expect((await queue.all())[0].status).toBe('pending');
  });
});
