jest.mock('@/common/database/repositories/conflictRepository', () => ({
  markResolved: jest.fn(),
}));

jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getByClientOperationId: jest.fn(),
  requeue: jest.fn(),
  markSuperseded: jest.fn(),
  reissueOperation: jest.fn(),
}));

import * as conflictRepo from '@/common/database/repositories/conflictRepository';
import type { ConflictRecord } from '@/common/database/repositories/conflictRepository';
import * as queue from '@/common/database/repositories/syncQueueRepository';
import { isOperationId, uuidVersion } from '@/common/utils/operationId';
import type { ConflictType } from '../conflicts';
import { applyResolution } from '../resolveConflict';

/**
 * Resolving a conflict.
 *
 * The rule these guard: nothing is deleted, nothing resolves itself, and a
 * resolution the policy has not cleared is REFUSED rather than warned about — a
 * UI bug must not be able to double-commit a stock return.
 */

const NOW = 1_760_000_000_000;
const now = () => NOW;

const getByClientOperationId = queue.getByClientOperationId as jest.Mock;
const requeue = queue.requeue as jest.Mock;
const markSuperseded = queue.markSuperseded as jest.Mock;
const reissueOperation = queue.reissueOperation as jest.Mock;
const markResolved = conflictRepo.markResolved as jest.Mock;

const OP = '01a0116b-61c6-71ee-8038-5ce7ed3fd39a';

function conflict(type: ConflictType, overrides: Partial<ConflictRecord> = {}): ConflictRecord {
  return {
    id: 7,
    clientOperationId: OP,
    entity: 'sale',
    type,
    localPayload: { branchId: 'b-1', grandTotal: 1200 },
    serverState: null,
    serverMessage: 'Stock has changed. Please review your order.',
    detectedAt: NOW,
    resolvedAt: null,
    resolution: null,
    ...overrides,
  };
}

function queueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    clientOperationId: OP,
    entity: 'sale',
    entityLocalId: 'local-1',
    action: 'create',
    payload: { branchId: 'b-1', grandTotal: 1200 },
    businessDate: '2026-08-18',
    dependsOn: null,
    priority: 30,
    status: 'conflict',
    attemptCount: 2,
    nextAttemptAt: null,
    lastAttemptAt: NOW,
    lastErrorCode: 'conflict',
    lastErrorMessage: 'Stock has changed. Please review your order.',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getByClientOperationId.mockResolvedValue(queueRow());
});

describe('the safety gate', () => {
  /**
   * `partially_committed` means some products in a stock return ALREADY moved on
   * the server. A new idempotency key bypasses the server's dedupe and executes,
   * so this is the case that would move them twice.
   */
  it('refuses resend_as_new for a partly-committed return', async () => {
    const outcome = await applyResolution({
      conflict: conflict('partially_committed', { entity: 'stock_movement' }),
      resolution: 'resend_as_new',
      now,
    });

    expect(outcome.ok).toBe(false);
    expect(reissueOperation).not.toHaveBeenCalled();
    // And nothing is marked resolved on a refusal — the conflict stays open.
    expect(markResolved).not.toHaveBeenCalled();
  });

  it('refuses resend_as_new after an unfinished earlier attempt', async () => {
    const outcome = await applyResolution({
      conflict: conflict('already_in_flight'),
      resolution: 'resend_as_new',
      now,
    });
    expect(outcome.ok).toBe(false);
    expect(reissueOperation).not.toHaveBeenCalled();
  });

  it('checks the policy, not the caller — an unknown conflict cannot be reissued', async () => {
    const outcome = await applyResolution({
      conflict: conflict('unknown_conflict'),
      resolution: 'resend_as_new',
      now,
    });
    expect(outcome.ok).toBe(false);
  });
});

describe('retry', () => {
  it('requeues under the SAME operation id, so the server replays', async () => {
    const outcome = await applyResolution({
      conflict: conflict('stock_changed'),
      resolution: 'retry',
      now,
    });

    expect(outcome).toEqual({ ok: true, resolution: 'retry' });
    expect(requeue).toHaveBeenCalledWith(3, NOW);
    // The id is untouched: regenerating it on a retry is how a request the
    // server already processed becomes a second sale.
    expect(reissueOperation).not.toHaveBeenCalled();
    expect(markResolved).toHaveBeenCalledWith(7, 'retry', NOW);
  });
});

describe('keep_server', () => {
  it('closes the local row as superseded and never deletes it', async () => {
    const outcome = await applyResolution({
      conflict: conflict('record_deleted'),
      resolution: 'keep_server',
      now,
    });

    expect(outcome.ok).toBe(true);
    expect(markSuperseded).toHaveBeenCalledWith(
      3,
      { entity: 'sale', clientOperationId: OP },
      NOW,
    );
    expect(markResolved).toHaveBeenCalledWith(7, 'keep_server', NOW);
  });

  /**
   * A price drift is recorded against a sale that SYNCED. There is no queue row
   * to close — acknowledging the discrepancy is the whole resolution.
   */
  it('just closes the record when the transaction already synced', async () => {
    getByClientOperationId.mockResolvedValue(queueRow({ status: 'synced' }));

    const outcome = await applyResolution({
      conflict: conflict('price_changed'),
      resolution: 'keep_server',
      now,
    });

    expect(outcome.ok).toBe(true);
    expect(markSuperseded).not.toHaveBeenCalled();
    expect(markResolved).toHaveBeenCalledWith(7, 'keep_server', NOW);
  });

  it('closes cleanly when the queue row is already gone', async () => {
    getByClientOperationId.mockResolvedValue(null);
    const outcome = await applyResolution({
      conflict: conflict('price_changed'),
      resolution: 'keep_server',
      now,
    });
    expect(outcome.ok).toBe(true);
    expect(markResolved).toHaveBeenCalledWith(7, 'keep_server', NOW);
  });
});

describe('resend_as_new', () => {
  it('mints a fresh UUIDv7 and re-dates the transaction', async () => {
    const outcome = await applyResolution({
      conflict: conflict('business_day_closed', { entity: 'expense' }),
      resolution: 'resend_as_new',
      editedBusinessDate: '2026-08-19',
      now,
    });

    expect(outcome.ok).toBe(true);
    const reissuedAs = outcome.ok ? outcome.reissuedAs : undefined;
    expect(isOperationId(reissuedAs!)).toBe(true);
    expect(uuidVersion(reissuedAs!)).toBe(7);
    expect(reissuedAs).not.toBe(OP);

    expect(reissueOperation).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        previousClientOperationId: OP,
        clientOperationId: reissuedAs,
        businessDate: '2026-08-19',
      }),
      NOW,
    );
  });

  /** The two records stay linked, so reconciliation can follow the trail. */
  it('records the new id in the resolution', async () => {
    const outcome = await applyResolution({
      conflict: conflict('business_day_closed', { entity: 'expense' }),
      resolution: 'resend_as_new',
      editedBusinessDate: '2026-08-19',
      now,
    });

    const reissuedAs = outcome.ok ? outcome.reissuedAs : '';
    expect(markResolved).toHaveBeenCalledWith(7, `resend_as_new:${reissuedAs}`, NOW);
  });

  it('carries an edited payload through', async () => {
    await applyResolution({
      conflict: conflict('stock_changed'),
      resolution: 'resend_as_new',
      editedPayload: { branchId: 'b-1', grandTotal: 400, items: [{ productId: 'p1', qty: 4 }] },
      now,
    });

    expect(reissueOperation).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        payload: { branchId: 'b-1', grandTotal: 400, items: [{ productId: 'p1', qty: 4 }] },
      }),
      NOW,
    );
  });
});
