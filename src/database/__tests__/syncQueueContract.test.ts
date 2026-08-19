import { MIGRATIONS } from '@/database/migrations';
import type { SyncQueueStatus } from '@/database/repositories/syncQueueRepository';

/**
 * The queue's contract, asserted against the schema itself.
 *
 * These are cheap and they guard the two things the whole offline design rests
 * on: that a queued operation carries an identity from creation, and that the
 * columns a drain and a human both need are actually there. A missing column
 * fails at runtime on a device, days later, on someone's shift.
 */

const queueSql = MIGRATIONS.flatMap(m => m.statements)
  .filter(sql => sql.includes('sync_queue'))
  .join('\n');

describe('sync_queue schema', () => {
  /**
   * `client_operation_id`, not `operation_id`: the name says where it was minted.
   * A UUIDv7 created on the DEVICE when the transaction was created — not when
   * it was sent — and reused as the domain row's key and the `Idempotency-Key`
   * header on every attempt.
   */
  it('carries the idempotency key, and constrains it to one row', () => {
    expect(queueSql).toContain('client_operation_id TEXT NOT NULL UNIQUE');
  });

  it('has every column a drain needs', () => {
    for (const column of [
      'entity',
      'entity_local_id',
      'action',
      'payload',
      'priority',
      'status',
      'attempt_count',
      'next_attempt_at',
      'last_error_code',
      'last_error_message',
      'created_at',
      'updated_at',
    ]) {
      expect(queueSql).toContain(column);
    }
  });

  /**
   * Captured at creation on the device. The server stamps the business day on
   * receipt, so a sale rung up at 21:00 and drained at 07:00 would otherwise
   * land on a day that has already closed.
   */
  it('captures the business date on the row', () => {
    expect(queueSql).toContain('business_date');
  });

  /** Added by migration 5 — see the note there on why `updated_at` is not it. */
  it('records when a row was last tried, separately from when it changed', () => {
    expect(queueSql).toContain('ALTER TABLE sync_queue ADD COLUMN last_attempt_at INTEGER');
  });

  it('indexes the drain query and the dependency lookup', () => {
    expect(queueSql).toContain('idx_queue_ready');
    expect(queueSql).toContain('idx_queue_depends');
  });
});

describe('queue statuses', () => {
  /**
   * The five the brief lists, plus `blocked` and `superseded`.
   *
   * `blocked` is not decoration: a sale can depend on the order it belongs to,
   * and a row whose dependency has not synced must be skipped by the drain
   * rather than attempted and failed. Without it, dependency ordering would
   * burn a row's retry budget on a request that cannot succeed yet.
   *
   * `superseded` is the terminal state of resolving a conflict in the server's
   * favour. It cannot be folded into either neighbour: `synced` would claim a
   * transaction reached the server when it never did, and `failed` would keep
   * asking for attention that has already been given. The row is kept — it is
   * the only record of what the operator actually entered.
   */
  it('is a superset of the five, with a reason for each addition', () => {
    const statuses: SyncQueueStatus[] = [
      'pending',
      'syncing',
      'synced',
      'failed',
      'conflict',
      'blocked',
      'superseded',
    ];

    // A compile-time check that the union has not quietly grown or shrunk: this
    // assignment fails to typecheck if `SyncQueueStatus` stops matching.
    const exhaustive: Record<SyncQueueStatus, true> = {
      pending: true,
      syncing: true,
      synced: true,
      failed: true,
      conflict: true,
      blocked: true,
      superseded: true,
    };

    expect(Object.keys(exhaustive).sort()).toEqual([...statuses].sort());
  });

});
