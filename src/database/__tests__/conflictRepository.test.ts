jest.mock('@/database/localDb', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '@/database/localDb';
import {
  countUnresolvedNotInQueue,
  listUnresolved,
  markResolved,
  recordConflict,
} from '../repositories/conflictRepository';
import { MIGRATIONS } from '../migrations';

/**
 * The conflict record.
 *
 * `sync_conflicts` existed from migration 3 and nothing ever wrote to it —
 * conflicts lived as a status on a queue row and one line of server text, which
 * is not enough to act on. These pin the two properties that make the table
 * worth having: both sides are kept, and a retried conflict updates one record
 * rather than breeding duplicates.
 */

interface Executed {
  sql: string;
  params: unknown[];
}

function fakeDb(rows: Array<Record<string, unknown>> = []) {
  const executed: Executed[] = [];
  const db = {
    async execute(sql: string, params: unknown[] = []) {
      executed.push({ sql, params });
      return { rows, rowsAffected: 1 };
    },
  };
  (getDb as jest.Mock).mockReturnValue(db);
  return executed;
}

const NOW = 1_760_000_000_000;
const OP = '01a0116b-61c6-71ee-8038-5ce7ed3fd39a';

beforeEach(() => jest.clearAllMocks());

describe('recordConflict', () => {
  it('keeps both sides — what was entered and what the server answered', async () => {
    const executed = fakeDb();
    const serverState = {
      error: 'Stock has changed. Please review your order.',
      details: [{ productName: 'Milk Rusk', requested: 12, available: 4 }],
    };

    await recordConflict(
      {
        clientOperationId: OP,
        entity: 'sale',
        type: 'stock_changed',
        localPayload: { grandTotal: 1200 },
        serverState,
        serverMessage: 'Stock has changed. Please review your order.',
      },
      NOW,
    );

    const [call] = executed;
    expect(call!.params).toContain(JSON.stringify({ grandTotal: 1200 }));
    expect(call!.params).toContain(JSON.stringify(serverState));
    expect(call!.params).toContain(NOW);
  });

  /**
   * A row retried three times must leave one conflict record, not three. The
   * upsert targets the PARTIAL unique index from migration 6 — unique only
   * among UNRESOLVED rows, so the same operation may legitimately conflict
   * again after a person has dealt with it, and the earlier record survives as
   * history.
   */
  it('upserts against the open conflict rather than inserting a duplicate', async () => {
    const executed = fakeDb();
    await recordConflict(
      {
        clientOperationId: OP,
        entity: 'sale',
        type: 'stock_changed',
        localPayload: {},
      },
      NOW,
    );

    const sql = executed[0]!.sql;
    expect(sql).toContain('ON CONFLICT(client_operation_id) WHERE resolved_at IS NULL');
    expect(sql).toContain('DO UPDATE SET');
  });

  /**
   * How long a conflict has been sitting unresolved is most of what decides
   * whether to act on it. Refreshing `detected_at` on every retry would make a
   * three-day-old problem look like it appeared a minute ago.
   */
  it('does not refresh detected_at or overwrite what the operator entered', async () => {
    const executed = fakeDb();
    await recordConflict(
      { clientOperationId: OP, entity: 'sale', type: 'stock_changed', localPayload: {} },
      NOW,
    );

    const update = executed[0]!.sql.slice(executed[0]!.sql.indexOf('DO UPDATE SET'));
    expect(update).not.toContain('detected_at');
    expect(update).not.toContain('local_payload');
    // The server's side IS refreshed — its answer may have changed.
    expect(update).toContain('server_state');
  });
});

describe('listUnresolved', () => {
  it('parses both payloads back out, newest first', async () => {
    fakeDb([
      {
        id: 1,
        client_operation_id: OP,
        entity: 'sale',
        conflict_type: 'stock_changed',
        local_payload: JSON.stringify({ grandTotal: 1200 }),
        server_state: JSON.stringify({ details: [] }),
        server_message: 'Stock has changed.',
        detected_at: NOW,
        resolved_at: null,
        resolution: null,
      },
    ]);

    const [record] = await listUnresolved();
    expect(record!.localPayload).toEqual({ grandTotal: 1200 });
    expect(record!.serverState).toEqual({ details: [] });
    expect(record!.resolvedAt).toBeNull();
  });

  it('survives a payload that will not parse', async () => {
    fakeDb([
      {
        id: 1,
        client_operation_id: OP,
        entity: 'sale',
        conflict_type: 'stock_changed',
        local_payload: 'not json',
        server_state: null,
        server_message: null,
        detected_at: NOW,
        resolved_at: null,
        resolution: null,
      },
    ]);

    // The raw text is more use to a person than a crashed Sync Center.
    const [record] = await listUnresolved();
    expect(record!.localPayload).toBe('not json');
    expect(record!.serverState).toBeNull();
  });
});

describe('markResolved', () => {
  it('closes only an open conflict, and records the choice', async () => {
    const executed = fakeDb();
    await markResolved(7, 'keep_server', NOW);

    expect(executed[0]!.sql).toContain('resolved_at IS NULL');
    expect(executed[0]!.params).toEqual([NOW, 'keep_server', 7]);
  });
});

describe('countUnresolvedNotInQueue', () => {
  /**
   * A sale the server priced differently has a SYNCED queue row, so the queue's
   * own attention count misses it entirely. Counting it as a difference avoids
   * announcing a conflicted operation twice.
   */
  it('excludes conflicts a queue row is already reporting', async () => {
    const executed = fakeDb([{ n: 2 }]);
    await expect(countUnresolvedNotInQueue()).resolves.toBe(2);
    expect(executed[0]!.sql).toContain('NOT EXISTS');
    expect(executed[0]!.sql).toContain("q.status IN ('failed', 'conflict')");
  });
});

describe('migration 6', () => {
  it('adds the partial unique index the upsert depends on', () => {
    const sql = MIGRATIONS.flatMap(m => m.statements)
      .filter(s => s.includes('sync_conflicts'))
      .join('\n');

    expect(sql).toContain('idx_conflicts_open_operation');
    expect(sql).toContain('WHERE resolved_at IS NULL');
  });

  it('is append-only — migration 3 is left exactly as it shipped', () => {
    const three = MIGRATIONS.find(m => m.version === 3);
    expect(three?.name).toBe('003_conflicts');
    // The table itself is still created by 3, not redefined by 6.
    expect(three?.statements.some(s => s.includes('CREATE TABLE'))).toBe(true);
    const six = MIGRATIONS.find(m => m.version === 6);
    expect(six?.statements.every(s => s.includes('CREATE'))).toBe(true);
    expect(six?.statements.some(s => /DROP|ALTER/i.test(s))).toBe(false);
  });
});
