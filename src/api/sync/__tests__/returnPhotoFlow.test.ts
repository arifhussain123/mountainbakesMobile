import { createTestDb, type TestDb } from '@/common/test-utils/sqliteTestDb';

/**
 * A stock return with its photo, from the queued row to the two HTTP calls,
 * against a real database.
 *
 * The photo makes this the only write that is TWO requests, and the first of
 * them (`POST /api/attachments`) has no idempotency. Everything asserted here
 * is about what that costs if the order or the bookkeeping is wrong:
 *
 *   - the photo is uploaded BEFORE the return is posted, and the return carries
 *     the id the upload answered;
 *   - that id is on the stored row before the return is posted, so a retry
 *     uploads nothing and sends the identical body under the identical key;
 *   - the device path never reaches the server;
 *   - a staged photo the server has swept is re-uploaded, not raised as a
 *     conflict;
 *   - the local file outlives every failure and goes only once the return is
 *     accepted;
 *   - a return queued before photos existed is sent exactly as it always was.
 */

const shared = globalThis as unknown as {
  __photoDb: TestDb;
  __photoPost: jest.Mock;
  __photoDelete: jest.Mock;
  __blobFiles: Set<string>;
};

jest.mock('@/common/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__photoDb,
}));

jest.mock('@/api/client', () => ({
  api: {
    post: (...args: unknown[]) => (globalThis as Record<string, any>).__photoPost(...args),
    put: (...args: unknown[]) => (globalThis as Record<string, any>).__photoPost(...args),
    delete: (...args: unknown[]) => (globalThis as Record<string, any>).__photoDelete(...args),
  },
}));

jest.mock('@/api/supabase/client', () => ({
  getAccessToken: async () => 'jwt',
}));

const post = jest.fn();
const del = jest.fn();
shared.__photoPost = post;
shared.__photoDelete = del;

import { ApiError } from '@/api/errors';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import * as queue from '@/common/database/repositories/syncQueueRepository';
import { runMigrations } from '@/common/database/runMigrations';
import { drainQueue } from '../syncManager';
import { resolveWriteOutcome } from '../writeOutcome';

const BUSINESS_DATE = '2026-08-18';
const BRANCH = 'branch-1';
const PHOTO_PATH = '/data/user/0/test/files/return-photos/photo-1.jpg';
const PHOTO_URI = `file://${PHOTO_PATH}`;
const ATTACHMENT_ID = '7f0c1a52-9d0e-4b7a-8a53-0a4f6d1c2b3e';
const SECOND_ATTACHMENT_ID = '0b9d7c66-3f4e-4c1d-9a7b-5e2f8a1c4d6f';

const LOCAL_PHOTO = {
  uri: PHOTO_URI,
  mimeType: 'image/jpeg',
  width: 1280,
  height: 960,
  sizeBytes: 148_000,
};

let db: TestDb;
let clock: number;
const files = shared.__blobFiles;

/** A drain whose clock the test owns, so a backed-off row can be made due. */
const drain = () => drainQueue({ isOnline: () => true, now: () => clock, random: () => 0 });

beforeEach(async () => {
  jest.clearAllMocks();
  post.mockReset();
  del.mockReset();
  del.mockResolvedValue(undefined);
  files.clear();
  files.add(PHOTO_PATH);
  // `writeOffline` stamps rows with the real clock, so the drain's has to be
  // at or past it for a fresh row to be due.
  clock = Date.now() + 1_000;
  db = createTestDb();
  shared.__photoDb = db;
  await runMigrations(db);
});

afterEach(() => db.close());

function queueReturn(payload: Record<string, unknown> = {}) {
  return writeOffline({
    entity: 'stock_movement',
    branchId: BRANCH,
    businessDate: BUSINESS_DATE,
    payload: {
      items: [{ productId: 'p-1', qty: 3 }],
      reason: 'Unsold at close',
      attachmentIds: [],
      localPhoto: LOCAL_PHOTO,
      ...payload,
    },
  });
}

/** Route the one `api.post` mock by path, the way the server would. */
function serve(handlers: {
  upload?: () => unknown;
  submit?: (body: Record<string, unknown>) => unknown;
}) {
  post.mockImplementation(async (path: string, body: unknown) => {
    if (path === '/api/attachments') {
      return handlers.upload ? handlers.upload() : { attachment: { id: ATTACHMENT_ID } };
    }
    return handlers.submit ? handlers.submit(body as Record<string, unknown>) : { ids: ['ret-1'] };
  });
}

const calls = (path: string) => post.mock.calls.filter(call => call[0] === path);
const uploads = () => calls('/api/attachments');
const submits = () => calls('/api/stock/return');

function storedPayload(table: 'sync_queue' | 'local_stock_movements', id: string) {
  const row = db.raw
    .prepare(`SELECT payload FROM ${table} WHERE client_operation_id = ?`)
    .get(id) as { payload: string };
  return JSON.parse(row.payload) as Record<string, any>;
}

function queueRow(id: string) {
  return db.raw
    .prepare('SELECT * FROM sync_queue WHERE client_operation_id = ?')
    .get(id) as Record<string, any>;
}

describe('the happy path', () => {
  it('uploads the photo, then posts the return carrying its id', async () => {
    serve({});
    const written = await queueReturn();

    const result = await drain();

    expect(result.synced).toBe(1);
    expect(post.mock.calls.map(call => call[0])).toEqual([
      '/api/attachments',
      '/api/stock/return',
    ]);

    const [, body, options] = submits()[0]!;
    expect(body.attachmentIds).toEqual([ATTACHMENT_ID]);
    expect(body.businessDate).toBe(BUSINESS_DATE);
    expect(options).toEqual({ idempotencyKey: written.clientOperationId });
  });

  it('sends the file as multipart, to the branch_return entity, with a longer timeout', async () => {
    // Jest's `FormData` is Node's, which would stringify React Native's
    // `{uri, name, type}` file descriptor — so the parts are read off `append`.
    const append = jest.spyOn(FormData.prototype, 'append');
    serve({});
    await queueReturn();

    await drain();

    const [, form, options] = uploads()[0]!;
    expect(form).toBeInstanceOf(FormData);
    const fields = new Map(append.mock.calls.map(call => [call[0], call[1] as unknown]));
    append.mockRestore();
    expect(fields.get('entity')).toBe('branch_return');
    expect(fields.get('width')).toBe('1280');
    expect(fields.get('height')).toBe('960');
    expect(fields.get('photo')).toEqual({ uri: PHOTO_URI, name: 'photo-1.jpg', type: 'image/jpeg' });
    // No Idempotency-Key: the endpoint does not take one. The write-back below
    // is what stands in for it.
    expect(options).toEqual({ timeout: 60_000 });
  });

  it('never sends the device path to the server', async () => {
    serve({});
    await queueReturn();

    await drain();

    const [, body] = submits()[0]!;
    expect(body).not.toHaveProperty('localPhoto');
    expect(JSON.stringify(body)).not.toContain('return-photos');
  });

  it('deletes the local file once the return has synced', async () => {
    serve({});
    const written = await queueReturn();

    await drain();

    expect(await resolveWriteOutcome(written.clientOperationId)).toEqual({ outcome: 'synced' });
    expect(files.has(PHOTO_PATH)).toBe(false);
  });
});

describe('the attachment id is remembered before the return is sent', () => {
  it('has it on both stored rows by the time the return is posted', async () => {
    const written = await queueReturn();
    let atSubmit: { queue: unknown; local: unknown } | undefined;
    serve({
      submit: () => {
        atSubmit = {
          queue: storedPayload('sync_queue', written.clientOperationId).attachmentIds,
          local: storedPayload('local_stock_movements', written.clientOperationId).attachmentIds,
        };
        return { ids: ['ret-1'] };
      },
    });

    await drain();

    expect(atSubmit).toEqual({ queue: [ATTACHMENT_ID], local: [ATTACHMENT_ID] });
  });

  /**
   * The ambiguous failure: the return's response is lost. The server may or
   * may not have processed it. The retry must be the SAME request — one more
   * upload would stage a second photo, and a different attachment id would be
   * a different body under the same key, which the server refuses outright.
   */
  it('retries the return without uploading again, with the same body and key', async () => {
    const written = await queueReturn();
    let attempt = 0;
    serve({
      submit: () => {
        attempt += 1;
        if (attempt === 1) throw new ApiError({ kind: 'timeout', message: 'Request timed out.' });
        return { ids: ['ret-1'] };
      },
    });

    const first = await drain();
    expect(first.synced).toBe(0);
    expect(queueRow(written.clientOperationId).status).toBe('pending');
    // Kept: it is still the only copy of the photo.
    expect(files.has(PHOTO_PATH)).toBe(true);

    clock += 60 * 60 * 1000;
    const second = await drain();

    expect(second.synced).toBe(1);
    expect(uploads()).toHaveLength(1);
    expect(submits()).toHaveLength(2);
    expect(submits()[1]![1]).toEqual(submits()[0]![1]);
    expect(submits()[1]![2]).toEqual(submits()[0]![2]);
    expect(files.has(PHOTO_PATH)).toBe(false);
  });

  it('survives an app restart between the upload and the return', async () => {
    // The row a fresh process would claim: id already stored, file still here.
    const written = await queueReturn({ attachmentIds: [ATTACHMENT_ID] });
    serve({});

    await drain();

    expect(uploads()).toHaveLength(0);
    expect(submits()[0]![1].attachmentIds).toEqual([ATTACHMENT_ID]);
    expect(queueRow(written.clientOperationId).status).toBe('synced');
  });

  it('does not post the return when the id could not be stored, and hands the upload back', async () => {
    const written = await queueReturn();
    serve({});
    const update = jest
      .spyOn(queue, 'updatePayload')
      .mockRejectedValueOnce(new Error('database is locked'));

    const result = await drain();
    update.mockRestore();

    expect(result.synced).toBe(0);
    expect(submits()).toHaveLength(0);
    expect(del).toHaveBeenCalledWith(`/api/attachments/${ATTACHMENT_ID}`);
    expect(queueRow(written.clientOperationId).status).toBe('pending');
    expect(files.has(PHOTO_PATH)).toBe(true);
  });
});

describe('when the upload fails', () => {
  it('backs off and retries, keeping the row and the file', async () => {
    const written = await queueReturn();
    let attempt = 0;
    serve({
      upload: () => {
        attempt += 1;
        if (attempt === 1) throw new ApiError({ kind: 'network', message: 'Network request failed.' });
        return { attachment: { id: ATTACHMENT_ID } };
      },
    });

    await drain();

    const parked = queueRow(written.clientOperationId);
    expect(parked.status).toBe('pending');
    expect(parked.next_attempt_at).toBeGreaterThan(clock);
    expect(submits()).toHaveLength(0);
    expect(files.has(PHOTO_PATH)).toBe(true);
    expect(await resolveWriteOutcome(written.clientOperationId)).toEqual({ outcome: 'queued' });

    clock += 60 * 60 * 1000;
    const second = await drain();

    expect(second.synced).toBe(1);
    expect(uploads()).toHaveLength(2);
    expect(submits()).toHaveLength(1);
  });

  it('pauses the drain on a 401 without spending the retry budget', async () => {
    const written = await queueReturn();
    serve({
      upload: () => {
        throw new ApiError({ kind: 'authentication', status: 401, message: 'Unauthorized' });
      },
    });

    const result = await drain();

    expect(result.stoppedBecause).toBe('unauthenticated');
    expect(queueRow(written.clientOperationId).status).toBe('pending');
    expect(files.has(PHOTO_PATH)).toBe(true);
  });

  it('parks the row when the server refuses the file itself', async () => {
    const written = await queueReturn();
    serve({
      upload: () => {
        throw new ApiError({ kind: 'validation', status: 400, message: 'Photo is too large.' });
      },
    });

    const result = await drain();

    expect(result.failed).toBe(1);
    expect(submits()).toHaveLength(0);
    expect(await resolveWriteOutcome(written.clientOperationId)).toEqual({
      outcome: 'refused',
      reason: 'Photo is too large.',
    });
    expect(files.has(PHOTO_PATH)).toBe(true);
  });
});

describe('when the local file is gone', () => {
  it('parks the row with a clear message rather than sending a photo-less return', async () => {
    const written = await queueReturn();
    files.clear();
    serve({});

    const result = await drain();

    expect(result.failed).toBe(1);
    expect(post).not.toHaveBeenCalled();
    const parked = queueRow(written.clientOperationId);
    expect(parked.status).toBe('failed');
    expect(parked.last_error_code).toBe('photo_missing');
    expect(parked.last_error_message).toMatch(/photo for this return is no longer on this device/);
  });
});

describe('when the server no longer has the staged photo', () => {
  const unavailable = () =>
    new ApiError({
      kind: 'conflict',
      status: 409,
      message: 'The attached photo is no longer available. Attach it again and resubmit.',
      details: { code: 'attachment_unavailable' },
      body: {
        error: 'The attached photo is no longer available. Attach it again and resubmit.',
        details: { code: 'attachment_unavailable' },
      },
    });

  it('clears the stale id and re-uploads on the next attempt, with no conflict raised', async () => {
    const written = await queueReturn({ attachmentIds: [ATTACHMENT_ID] });
    let submitsSeen = 0;
    serve({
      upload: () => ({ attachment: { id: SECOND_ATTACHMENT_ID } }),
      submit: () => {
        submitsSeen += 1;
        if (submitsSeen === 1) throw unavailable();
        return { ids: ['ret-1'] };
      },
    });

    const first = await drain();

    expect(first.conflicts).toBe(0);
    expect(first.failed).toBe(0);
    const waiting = queueRow(written.clientOperationId);
    expect(waiting.status).toBe('pending');
    expect(waiting.last_error_code).toBe('attachment_unavailable');
    expect(storedPayload('sync_queue', written.clientOperationId).attachmentIds).toEqual([]);
    expect(storedPayload('local_stock_movements', written.clientOperationId).attachmentIds).toEqual(
      [],
    );
    // The file is what the re-upload is made from.
    expect(storedPayload('sync_queue', written.clientOperationId).localPhoto).toEqual(LOCAL_PHOTO);
    expect(files.has(PHOTO_PATH)).toBe(true);
    expect(
      db.raw
        .prepare('SELECT COUNT(*) AS n FROM sync_conflicts WHERE client_operation_id = ?')
        .get(written.clientOperationId),
    ).toEqual({ n: 0 });
    expect(await resolveWriteOutcome(written.clientOperationId)).toEqual({ outcome: 'queued' });

    clock += 60 * 60 * 1000;
    const second = await drain();

    expect(second.synced).toBe(1);
    expect(uploads()).toHaveLength(1);
    expect(submits()[1]![1].attachmentIds).toEqual([SECOND_ATTACHMENT_ID]);
    // The key is the return's identity and does not change with the photo id.
    expect(submits()[1]![2]).toEqual({ idempotencyKey: written.clientOperationId });
    expect(files.has(PHOTO_PATH)).toBe(false);
  });

  it('is a conflict for a person when there is no local file to upload from', async () => {
    // A row with an id but no `localPhoto` cannot be repaired by the device.
    const written = await writeOffline({
      entity: 'stock_movement',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { items: [{ productId: 'p-1', qty: 3 }], attachmentIds: [ATTACHMENT_ID] },
    });
    serve({
      submit: () => {
        throw unavailable();
      },
    });

    const result = await drain();

    expect(result.conflicts).toBe(1);
    expect(queueRow(written.clientOperationId).status).toBe('conflict');
  });
});

describe('a real conflict on a return with a photo', () => {
  it('is still recorded as a conflict, and keeps the file', async () => {
    const written = await queueReturn();
    serve({
      submit: () => {
        throw new ApiError({
          kind: 'conflict',
          status: 409,
          message: 'Only 1 unit of Milk Rusk on hand',
        });
      },
    });

    const result = await drain();

    expect(result.conflicts).toBe(1);
    expect(await resolveWriteOutcome(written.clientOperationId)).toEqual({
      outcome: 'refused',
      reason: 'Only 1 unit of Milk Rusk on hand',
    });
    expect(files.has(PHOTO_PATH)).toBe(true);
  });
});

describe('a return queued before photos existed', () => {
  it('is sent as one POST, exactly as it was queued', async () => {
    serve({});
    const written = await writeOffline({
      entity: 'stock_movement',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { items: [{ productId: 'p-1', qty: 3 }], reason: 'Unsold at close' },
    });

    const result = await drain();

    expect(result.synced).toBe(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/api/stock/return',
      { items: [{ productId: 'p-1', qty: 3 }], reason: 'Unsold at close', businessDate: BUSINESS_DATE },
      { idempotencyKey: written.clientOperationId },
    );
    // Nothing was rewritten on the way through.
    expect(storedPayload('sync_queue', written.clientOperationId)).toEqual({
      items: [{ productId: 'p-1', qty: 3 }],
      reason: 'Unsold at close',
    });
  });

  it('parks when the server now requires a photo, as any other 400 does', async () => {
    const written = await writeOffline({
      entity: 'stock_movement',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { items: [{ productId: 'p-1', qty: 3 }] },
    });
    serve({
      submit: () => {
        throw new ApiError({
          kind: 'validation',
          status: 400,
          code: 'photo_required',
          message: 'A photo of the returned items is required.',
        });
      },
    });

    const result = await drain();

    expect(result.failed).toBe(1);
    expect(queueRow(written.clientOperationId).last_error_code).toBe('photo_required');
  });
});

describe('other entities', () => {
  it('are untouched by the photo step even if a payload happens to carry the field', async () => {
    serve({});
    post.mockResolvedValue({ id: 'exp-1' });
    await writeOffline({
      entity: 'expense',
      branchId: BRANCH,
      businessDate: BUSINESS_DATE,
      payload: { category: 'Utilities', amount: 10, localPhoto: LOCAL_PHOTO },
    });

    await drain();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]![0]).toBe('/api/expenses');
    expect(files.has(PHOTO_PATH)).toBe(true);
  });
});

describe('updatePayload', () => {
  it('rewrites the payload and nothing else about the operation', async () => {
    const written = await queueReturn();
    const before = queueRow(written.clientOperationId);

    await queue.updatePayload(
      before.id,
      { entity: 'stock_movement', clientOperationId: written.clientOperationId },
      { items: [{ productId: 'p-1', qty: 3 }], attachmentIds: [ATTACHMENT_ID] },
      clock + 5,
    );

    const after = queueRow(written.clientOperationId);
    expect(JSON.parse(after.payload).attachmentIds).toEqual([ATTACHMENT_ID]);
    expect(after.client_operation_id).toBe(before.client_operation_id);
    expect(after.status).toBe(before.status);
    expect(after.attempt_count).toBe(before.attempt_count);
    expect(after.business_date).toBe(before.business_date);
    expect(after.next_attempt_at).toBe(before.next_attempt_at);
  });
});
