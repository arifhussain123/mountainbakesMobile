import { getOperationOutcome } from '@/common/database/repositories/syncQueueRepository';

/**
 * What to tell someone who just pressed Save.
 *
 * ---------------------------------------------------------------------------
 * Why three outcomes and not two
 * ---------------------------------------------------------------------------
 * The three write hooks used to read `lastResult.synced > 0` and report
 * everything else as "Saved offline — it will sync automatically". That is true
 * for a queued write and **false for a refused one**: a sale the server rejected
 * with a 409 (not enough stock) is parked in `sync_conflicts` for a person, and
 * it will never sync on its own. Telling a cashier it is on its way means nobody
 * looks at it until someone reconciles the till and finds a sale that never
 * landed.
 *
 * It is the same failure the offline rule guards against — *never report a
 * queued transaction as saved* — running in the other direction: never report a
 * **refused** transaction as queued.
 *
 * ---------------------------------------------------------------------------
 * Read the row, not the tally
 * ---------------------------------------------------------------------------
 * A `DrainResult` counts the whole drain. `{synced: 3, conflicts: 1}` says
 * nothing about which one this was, and a busy queue makes that the normal case
 * rather than the edge. So the operation is looked up by the id it was created
 * with.
 *
 * Nothing is deleted or rolled back on a refusal: the row is still the only copy
 * of a transaction the server did not accept, and the Sync Center is where a
 * human decides what happens to it.
 */

export type WriteOutcome = 'synced' | 'queued' | 'refused';

export interface WriteResult {
  outcome: WriteOutcome;
  /** The server's own words, when it refused. Shown verbatim — it names the products. */
  reason?: string;
}

export async function resolveWriteOutcome(clientOperationId: string): Promise<WriteResult> {
  const row = await getOperationOutcome(clientOperationId);

  // No row means the queue entry was already pruned after a successful sync.
  if (!row) return { outcome: 'synced' };

  switch (row.status) {
    case 'synced':
      return { outcome: 'synced' };
    // Both are the server's judgement: `conflict` is a 409 it argued with,
    // `failed` a 4xx it refused outright. Neither clears by waiting, so neither
    // may be described as pending.
    case 'conflict':
    case 'failed':
      return { outcome: 'refused', reason: row.message ?? undefined };
    default:
      return { outcome: 'queued' };
  }
}
