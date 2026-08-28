jest.mock('@/common/database/localDb', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '@/common/database/localDb';
import {
  claimReady,
  enqueue,
  getUnsyncedSummary,
  markConflict,
  markFailed,
  markRetry,
  markSuperseded,
  markSynced,
  markSyncing,
  pruneSynced,
  reclaimStuckSyncing,
  reissueOperation,
  requeue,
  requeueAllFailed,
} from '../repositories/syncQueueRepository';

/**
 * The sync queue's state machine.
 *
 * Every transition here moves a real transaction between "not yet on the server"
 * and "settled", and the wrong one silently loses or duplicates money. These
 * assert the SQL and its parameters directly, because the properties that matter
 * live in the statements — which statuses a transition is allowed to act on,
 * which rows a delete can reach, and whether two writes share a transaction.
 */

interface Executed {
  sql: string;
  params: unknown[];
}

function fakeDb(rows: Array<Record<string, unknown>> = []) {
  const executed: Executed[] = [];
  const inTransaction: Executed[] = [];
  let transactionCount = 0;

  const db = {
    async execute(sql: string, params: unknown[] = []) {
      executed.push({ sql, params });
      return { rows, rowsAffected: 1 };
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

  (getDb as jest.Mock).mockReturnValue(db);
  return {
    executed,
    inTransaction,
    get transactionCount() {
      return transactionCount;
    },
  };
}

const NOW = 1_760_000_000_000;
const OP = '01a0116b-61c6-71ee-8038-5ce7ed3fd39a';

const norm = (sql: string) => sql.replace(/\s+/g, ' ').trim();

beforeEach(() => jest.clearAllMocks());

describe('enqueue', () => {
  /**
   * Idempotent on `client_operation_id`. A local write retried by the UI must
   * not create a second queue row for one transaction — that is a duplicate
   * sale with two different fates.
   */
  it('ignores a re-enqueue of the same operation rather than duplicating it', async () => {
    const { executed } = fakeDb();
    await enqueue(
      {
        clientOperationId: OP,
        entity: 'sale',
        entityLocalId: OP,
        action: 'create',
        payload: { grandTotal: 1200 },
        businessDate: '2026-08-18',
      },
      NOW,
    );

    expect(norm(executed[0]!.sql)).toContain('INSERT OR IGNORE INTO sync_queue');
    expect(executed[0]!.params).toContain(OP);
    // Queued rows start pending with a clean retry budget.
    expect(norm(executed[0]!.sql)).toContain("'pending', 0");
  });

  it('serialises the payload and defaults the priority', async () => {
    const { executed } = fakeDb();
    await enqueue(
      {
        clientOperationId: OP,
        entity: 'expense',
        entityLocalId: OP,
        action: 'create',
        payload: { amount: 500 },
        businessDate: null,
      },
      NOW,
    );

    expect(executed[0]!.params).toContain(JSON.stringify({ amount: 500 }));
    expect(executed[0]!.params).toContain(100);
    expect(executed[0]!.params).toContain(null);
  });
});

describe('claimReady', () => {
  it('sends only what is ready, and never a dependent before its prerequisite', async () => {
    const { executed } = fakeDb();
    await claimReady(20, NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("q.status IN ('pending', 'blocked')");
    expect(sql).toContain('q.next_attempt_at IS NULL OR q.next_attempt_at <= ?');
    // The dependency gate: the prerequisite must have reached `synced`.
    expect(sql).toContain('q.depends_on IS NULL');
    expect(sql).toContain("d.status = 'synced'");
    expect(sql).toContain('ORDER BY q.priority ASC, q.created_at ASC');
  });

  /**
   * A conflicted or failed row must never be picked up automatically. Both are
   * the server's judgement and need a person; re-sending one on a timer is how
   * a rejected transaction is retried forever.
   */
  it('excludes failed, conflicted, syncing, synced and superseded rows', async () => {
    const { executed } = fakeDb();
    await claimReady(20, NOW);
    const statusClause = norm(executed[0]!.sql).match(/q\.status IN \([^)]*\)/)![0];

    for (const excluded of ['failed', 'conflict', 'syncing', 'synced', 'superseded']) {
      expect(statusClause).not.toContain(excluded);
    }
  });
});

describe('markSyncing', () => {
  /**
   * The attempt is counted and stamped at the moment it happens. Recording the
   * time on failure instead would leave a row that is still in flight looking
   * untried, and "how long has this been stuck" is most of what decides whether
   * a person acts on it.
   */
  it('counts the attempt and stamps when it was tried', async () => {
    const { executed } = fakeDb();
    await markSyncing(3, NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("status = 'syncing'");
    expect(sql).toContain('attempt_count = attempt_count + 1');
    expect(sql).toContain('last_attempt_at = ?');
    expect(executed[0]!.params).toEqual([NOW, NOW, 3]);
  });
});

describe('markSynced', () => {
  /**
   * The queue row and the domain row settle together, in ONE transaction. A
   * queue row marked synced beside a domain row still marked pending is the same
   * class of inconsistency that pairing the two inserts at write time exists to
   * prevent — and the queue row is pruned after a week, taking with it the only
   * evidence the sale ever reached the server.
   */
  it('settles both rows in one transaction', async () => {
    const fake = fakeDb();
    await markSynced(3, NOW, { entity: 'sale', clientOperationId: OP, serverId: 'srv-1' });

    expect(fake.transactionCount).toBe(1);
    expect(fake.inTransaction).toHaveLength(2);
    expect(norm(fake.inTransaction[0]!.sql)).toContain("status = 'synced'");
    expect(norm(fake.inTransaction[1]!.sql)).toContain('UPDATE local_sales');
    expect(fake.inTransaction[1]!.params).toContain('srv-1');
  });

  it('clears the last error so a settled row carries no stale failure text', async () => {
    const fake = fakeDb();
    await markSynced(3, NOW, { entity: 'sale', clientOperationId: OP, serverId: null });
    expect(norm(fake.inTransaction[0]!.sql)).toContain('last_error_code = NULL');
    expect(norm(fake.inTransaction[0]!.sql)).toContain('last_error_message = NULL');
  });

  /** Knowing it synced matters more than knowing its id. */
  it('still flips the status when the server id could not be read', async () => {
    const fake = fakeDb();
    await markSynced(3, NOW, { entity: 'sale', clientOperationId: OP, serverId: null });
    // COALESCE keeps any id already stored rather than blanking it.
    expect(norm(fake.inTransaction[1]!.sql)).toContain('server_id = COALESCE(?, server_id)');
  });

  it('handles an entity with no domain table without a second write', async () => {
    const fake = fakeDb();
    await markSynced(3, NOW, { entity: 'order', clientOperationId: OP, serverId: 'srv-1' });
    // `order` has no local mirror table; only the queue row moves.
    expect(fake.inTransaction).toHaveLength(1);
  });
});

describe('transient and terminal failures', () => {
  it('markRetry returns the row to pending with a next attempt time', async () => {
    const { executed } = fakeDb();
    await markRetry(3, NOW + 8_000, { code: 'network', message: 'offline' }, NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('next_attempt_at = ?');
    expect(executed[0]!.params).toEqual([NOW + 8_000, 'network', 'offline', NOW, 3]);
  });

  it('markFailed and markConflict park the row without touching it otherwise', async () => {
    const failed = fakeDb();
    await markFailed(3, { code: '400', message: 'amount must be positive' }, NOW);
    expect(norm(failed.executed[0]!.sql)).toContain("status = 'failed'");
    // Never a DELETE: a parked row is still the only copy of the transaction.
    expect(failed.executed[0]!.sql).not.toMatch(/DELETE/i);

    const conflicted = fakeDb();
    await markConflict(3, { code: 'stock_changed', message: 'Stock has changed.' }, NOW);
    expect(norm(conflicted.executed[0]!.sql)).toContain("status = 'conflict'");
    expect(conflicted.executed[0]!.sql).not.toMatch(/DELETE/i);
  });
});

describe('hand retries', () => {
  it('requeues a parked row and gives it a fresh retry budget', async () => {
    const { executed } = fakeDb();
    await requeue(9, NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('attempt_count = 0');
    expect(sql).toContain("status IN ('failed', 'conflict')");
  });

  /**
   * "Retry all" is deliberately narrower than the single retry. A conflict is a
   * disagreement a person has to resolve — sweeping it back into the queue in
   * bulk would re-send transactions the server has already rejected, and lose
   * the resolution the operator was being asked for.
   */
  it('retry-all touches failed rows only, never conflicts', async () => {
    const { executed } = fakeDb();
    await requeueAllFailed(NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("WHERE status = 'failed'");
    expect(sql).not.toContain('conflict');
  });
});

describe('reclaimStuckSyncing', () => {
  /**
   * The app can be killed mid-send. Without this the row is orphaned in
   * `syncing` forever and the transaction never reaches the server. Safe only
   * because every send carries an idempotency key.
   */
  it('returns rows stranded in syncing to pending', async () => {
    const { executed } = fakeDb();
    await reclaimStuckSyncing(NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("SET status = 'pending'");
    expect(sql).toContain("WHERE status = 'syncing'");
  });
});

describe('pruneSynced', () => {
  /**
   * The one statement in the queue that deletes. It must be unable to reach a
   * row that still needs a person.
   */
  it('deletes only synced rows, and only old ones', async () => {
    const { executed } = fakeDb();
    await pruneSynced(7 * 24 * 60 * 60 * 1000, NOW);
    const sql = norm(executed[0]!.sql);

    expect(sql).toContain("DELETE FROM sync_queue WHERE status = 'synced'");
    expect(sql).toContain('updated_at < ?');
    expect(executed[0]!.params).toEqual([NOW - 7 * 24 * 60 * 60 * 1000]);

    for (const protectedStatus of ['failed', 'conflict', 'pending', 'superseded']) {
      expect(sql).not.toContain(protectedStatus);
    }
  });
});

describe('getUnsyncedSummary', () => {
  it('counts failed and conflicted as outstanding, not finished', async () => {
    const { executed } = fakeDb([{ total: 5, attention: 2 }]);
    const summary = await getUnsyncedSummary();

    const statuses = executed[0]!.params as string[];
    expect(statuses).toEqual(
      expect.arrayContaining(['pending', 'syncing', 'blocked', 'failed', 'conflict']),
    );
    // `superseded` is resolved work and must not keep asking for attention.
    expect(statuses).not.toContain('superseded');
    expect(statuses).not.toContain('synced');
    expect(summary).toEqual({ total: 5, needsAttention: 2, pending: 3 });
  });

  /**
   * One statement, not two counts.
   *
   * This is the query behind the sync badge in every header, re-run after each
   * drain — two passes over the same table to answer two questions about the
   * same rows is a scan too many, and it also made the two answers separately
   * observable, which is where the negative-pending case below came from.
   */
  it('asks the database once', async () => {
    const { executed } = fakeDb([{ total: 1, attention: 0 }]);
    await getUnsyncedSummary();
    expect(executed).toHaveLength(1);
  });

  it('never reports a negative pending count', async () => {
    const { executed } = fakeDb([{ total: 2, attention: 5 }]);
    const summary = await getUnsyncedSummary();
    expect(executed).toHaveLength(1);
    expect(summary.pending).toBeGreaterThanOrEqual(0);
  });

  /**
   * `SUM(...)` over no rows is NULL, not 0. An empty queue has to read as
   * nothing outstanding rather than putting NaN in a badge.
   */
  it('reads an empty queue as nothing outstanding', async () => {
    fakeDb([{ total: null, attention: null }]);
    expect(await getUnsyncedSummary()).toEqual({
      total: 0,
      needsAttention: 0,
      pending: 0,
    });
  });
});

describe('markSuperseded', () => {
  /**
   * Resolving a conflict in the server's favour. Both rows move together, and
   * nothing is deleted — the operator's entry is the only record of what was
   * actually rung up at the counter.
   */
  it('closes the queue row and its domain row in one transaction', async () => {
    const fake = fakeDb();
    await markSuperseded(3, { entity: 'sale', clientOperationId: OP }, NOW);

    expect(fake.transactionCount).toBe(1);
    expect(fake.inTransaction).toHaveLength(2);
    expect(norm(fake.inTransaction[0]!.sql)).toContain("status = 'superseded'");
    expect(norm(fake.inTransaction[1]!.sql)).toContain('UPDATE local_sales');
    expect(norm(fake.inTransaction[1]!.sql)).toContain("sync_status = 'superseded'");
    // Never a delete.
    expect(fake.inTransaction.every(e => !/DELETE/i.test(e.sql))).toBe(true);
  });
});

describe('reissueOperation', () => {
  /**
   * The ONE case where the operation id legitimately changes: a person edited
   * the payload or the date while resolving a conflict, so it is a different
   * transaction and the old idempotency key no longer describes it.
   */
  it('moves the new id onto both rows in one transaction', async () => {
    const fake = fakeDb();
    const NEXT = '01a0116b-61c6-71ee-8038-aaaaaaaaaaaa';

    await reissueOperation(
      3,
      {
        entity: 'sale',
        previousClientOperationId: OP,
        clientOperationId: NEXT,
        payload: { grandTotal: 400, paymentMethod: 'card' },
        businessDate: '2026-08-19',
      },
      NOW,
    );

    expect(fake.transactionCount).toBe(1);

    const queueUpdate = fake.inTransaction[0]!;
    expect(norm(queueUpdate.sql)).toContain('client_operation_id = ?');
    expect(norm(queueUpdate.sql)).toContain("status = 'pending'");
    expect(norm(queueUpdate.sql)).toContain('attempt_count = 0');
    expect(queueUpdate.params).toContain(NEXT);

    // The domain row is found by the OLD id and rewritten to the new one.
    const domainUpdate = fake.inTransaction[1]!;
    expect(domainUpdate.params).toContain(OP);
    expect(domainUpdate.params).toContain(NEXT);
  });

  /**
   * The denormalised money columns exist so branch screens can list
   * transactions without parsing every payload. An edit that changed the amount
   * has to reach them, or the list and the transaction disagree.
   */
  it('carries an edited amount into the mirrored money column', async () => {
    const fake = fakeDb();
    await reissueOperation(
      3,
      {
        entity: 'sale',
        previousClientOperationId: OP,
        clientOperationId: 'new-id',
        payload: { grandTotal: 400, paymentMethod: 'card' },
        businessDate: '2026-08-19',
      },
      NOW,
    );

    const moneyUpdate = fake.inTransaction.find(e => /grand_total/.test(e.sql));
    expect(moneyUpdate).toBeDefined();
    expect(moneyUpdate!.params).toContain('400');
    expect(moneyUpdate!.params).toContain('card');
  });

  it('updates the expense mirror for an expense', async () => {
    const fake = fakeDb();
    await reissueOperation(
      3,
      {
        entity: 'expense',
        previousClientOperationId: OP,
        clientOperationId: 'new-id',
        payload: { amount: 250, category: 'Utilities' },
        businessDate: '2026-08-19',
      },
      NOW,
    );

    const moneyUpdate = fake.inTransaction.find(e => /amount = \?/.test(e.sql));
    expect(moneyUpdate!.params).toContain('250');
    expect(moneyUpdate!.params).toContain('Utilities');
  });

  it('moves only the queue row for an entity with no domain table', async () => {
    const fake = fakeDb();
    await reissueOperation(
      3,
      {
        entity: 'order',
        previousClientOperationId: OP,
        clientOperationId: 'new-id',
        payload: {},
        businessDate: null,
      },
      NOW,
    );
    expect(fake.inTransaction).toHaveLength(1);
  });
});
