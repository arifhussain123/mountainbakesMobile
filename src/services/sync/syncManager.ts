import * as conflicts from '@/database/repositories/conflictRepository';
import * as queue from '@/database/repositories/syncQueueRepository';
import type { SyncQueueRow } from '@/database/repositories/syncQueueRepository';
import { api } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { getAccessToken } from '@/services/supabase/client';
import { backoffMs, hasExhaustedRetries } from './backoff';
import { classifyConflict, detectPriceDrift, isConflictError } from './conflicts';
import { endpointFor, serverIdFrom } from './endpoints';

/**
 * The sync manager.
 *
 * Drains the queue in dependency + priority order whenever the device is online
 * and authenticated. One drain at a time, ever: two concurrent drains could both
 * claim the same row and send it twice.
 *
 * Failure handling is per-class, and the classification is the whole point:
 *
 *   network / timeout / 5xx → transient. Back off, stay pending, retry.
 *   401                     → auth. PAUSE the whole drain; do not burn attempts.
 *   409 / 403 / 404         → conflict. The world moved. Record BOTH sides and
 *                             surface it to a human; never resolve it here.
 *   4xx validation          → the server has judged it. Park as failed.
 *
 * Conflict detection is deliberately wider than 409. A closed business day
 * arrives as 403 and a deleted parent as 404, and both used to park as anonymous
 * `failed` rows carrying one line of server text — nothing to compare, nothing
 * to act on. See `conflicts.ts` for the full classification and, more
 * importantly, for which resolutions are safe to offer for each.
 *
 * Nothing is ever deleted on failure. A parked row is still the only copy of a
 * transaction the server never accepted.
 */

export type DrainStopReason =
  | 'completed'
  | 'offline'
  | 'unauthenticated'
  | 'already-running';

export interface DrainResult {
  synced: number;
  failed: number;
  conflicts: number;
  remaining: number;
  stoppedBecause: DrainStopReason;
}

export interface DrainOptions {
  /** Connectivity check. Injected so the manager stays testable. */
  isOnline: () => boolean;
  /** Resolve the current access token; null pauses the drain. */
  getToken?: () => Promise<string | null>;
  /** Max operations claimed per batch. A drain runs several — see below. */
  batchSize?: number;
  now?: () => number;
  random?: () => number;
}

/**
 * How many batches one drain will run before stopping.
 *
 * A drain used to claim exactly one batch of 20 and stop, and the engine only
 * drains on reconnect, foreground and sign-in. So a branch that rang up a full
 * evening with no signal — 60 sales, expenses and a demand — came back online,
 * sent 20, and left the other 40 sitting until somebody happened to background
 * and reopen the app twice more. Nothing was lost, but "it will sync
 * automatically when you reconnect" was not true, and the till and the books
 * disagreed for as long as it took.
 *
 * A drain now keeps claiming while a batch comes back FULL — a short batch means
 * the queue is empty and the next claim would be a wasted round-trip. The cap is
 * what keeps it bounded: 10 × 20 is 200 operations, comfortably more than a
 * day's offline work at one branch, and a queue longer than that gets the next
 * 200 on the next trigger rather than holding the app in one drain indefinitely.
 */
const MAX_BATCHES_PER_DRAIN = 10;

let draining = false;

/** True while a drain is in flight. */
export function isDraining(): boolean {
  return draining;
}

function emptyResult(reason: DrainStopReason): DrainResult {
  return { synced: 0, failed: 0, conflicts: 0, remaining: 0, stoppedBecause: reason };
}

/**
 * Send one operation.
 *
 * The idempotency key is the row's `client_operation_id` — the same value on
 * every attempt. The auth token is attached by the API client's interceptor at
 * SEND time, never frozen into the stored row: a token captured when the
 * transaction was created would be expired by the time an overnight retry runs.
 *
 * `businessDate` is merged into the payload from the row: the server stamps the
 * day the request ARRIVES unless told otherwise, so a 9pm sale synced at 7am
 * would otherwise be filed against the following morning. The server bounds and
 * closure-checks whatever is sent (server migration 84).
 */
async function sendOperation(row: SyncQueueRow): Promise<unknown> {
  const endpoint = endpointFor(row.entity, row.action);
  if (!endpoint) {
    throw new ApiError({
      kind: 'validation',
      message: `No endpoint is defined for ${row.action} ${row.entity}.`,
    });
  }

  // The date field is named per endpoint — `date` on expenses, `businessDate`
  // everywhere else. Sending the wrong key is silently ignored, which is
  // exactly how a queued 9pm transaction quietly lands on the wrong day.
  const payload =
    row.businessDate && row.payload && typeof row.payload === 'object'
      ? {
          ...(row.payload as Record<string, unknown>),
          [endpoint.businessDateField]: row.businessDate,
        }
      : row.payload;

  // The response is returned rather than discarded: it carries the server's id
  // for the record this operation created, which is what closes the loop back
  // onto the local row.
  return api[endpoint.method](endpoint.path, payload, {
    idempotencyKey: row.clientOperationId,
  });
}

/**
 * Write the conflict record beside the queue row.
 *
 * Best-effort, and deliberately so. The queue row's `conflict` status is what
 * stops the operation being sent again; the detail record is what lets a person
 * act on it. If the detail write fails, losing it must not also lose the state
 * transition and let the drain re-send a transaction the server rejected — so
 * this never throws into the drain loop.
 */
async function storeConflict(
  row: SyncQueueRow,
  type: ReturnType<typeof classifyConflict>,
  error: ApiError,
  now: number,
): Promise<void> {
  try {
    await conflicts.recordConflict(
      {
        clientOperationId: row.clientOperationId,
        entity: row.entity,
        type,
        localPayload: row.payload,
        serverState: error.body ?? error.details ?? null,
        serverMessage: error.message,
      },
      now,
    );
  } catch (e) {
    console.warn('[sync] could not record conflict detail', e);
  }
}

/**
 * A sale the server accepted at a total the device did not expect.
 *
 * The request succeeded, so nothing about the queue changes. What is recorded is
 * that the books and the till now disagree — see `detectPriceDrift` for why this
 * happens and why it cannot be fixed on the device. Without this the difference
 * is invisible at the counter and surfaces weeks later as an unexplained
 * variance that nobody can trace back to a specific sale.
 */
async function recordPriceDrift(row: SyncQueueRow, response: unknown, now: number): Promise<void> {
  if (row.entity !== 'sale' && row.entity !== 'order') return;

  const drift = detectPriceDrift(row.payload, response);
  if (!drift) return;

  try {
    await conflicts.recordConflict(
      {
        clientOperationId: row.clientOperationId,
        entity: row.entity,
        type: 'price_changed',
        localPayload: row.payload,
        serverState: response,
        serverMessage: `Rung up at ${drift.expected}, recorded by the server as ${drift.actual}.`,
      },
      now,
    );
  } catch (e) {
    console.warn('[sync] could not record price drift', e);
  }
}

/**
 * Send one claimed batch, row by row.
 *
 * Sequential on purpose: rows carry `depends_on`, and sending a dependent
 * before its prerequisite exists on the server is exactly the ordering the
 * queue is there to preserve. Returns `stop` when the whole drain must end —
 * connectivity gone, or a session that expired mid-batch — as distinct from a
 * row that merely failed, which is recorded and stepped past.
 *
 * `result` is mutated rather than returned: the counters are drain-wide and a
 * drain may run several batches.
 */
async function sendBatch(
  batch: readonly SyncQueueRow[],
  options: DrainOptions,
  result: DrainResult,
  now: () => number,
  random: () => number,
): Promise<'continue' | 'stop'> {
  for (const row of batch) {
    if (!options.isOnline()) {
      result.stoppedBecause = 'offline';
      return 'stop';
    }

    await queue.markSyncing(row.id, now());

    try {
      const response = await sendOperation(row);
      await queue.markSynced(row.id, now(), {
        entity: row.entity,
        clientOperationId: row.clientOperationId,
        serverId: serverIdFrom(row.entity, response),
      });
      result.synced += 1;
      // The sale WAS accepted; this is a discrepancy inside a success, not a
      // failure, so the row stays synced and only the record is written.
      await recordPriceDrift(row, response, now());
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;

      // Auth expired mid-drain. Pause everything and leave this row pending
      // with its attempt count rolled back — an expired token is not the
      // transaction's fault and must not consume its retry budget.
      if (apiError?.kind === 'authentication') {
        await queue.markRetry(row.id, now(), {
          code: 'auth',
          message: 'Signed out during sync. Sign in to resume.',
        });
        result.stoppedBecause = 'unauthenticated';
        return 'stop';
      }

      // The world moved while this sat in the queue. Not a failure of the
      // request — a disagreement about what is true — so both sides are kept
      // and a person decides. Never resolved automatically: the server is
      // authoritative for money and stock, but silently discarding the
      // operator's entry is how a till comes up short with no explanation.
      if (apiError && isConflictError(apiError)) {
        const type = classifyConflict(apiError, row.entity);
        await storeConflict(row, type, apiError, now());
        await queue.markConflict(row.id, {
          code: apiError.code ?? type,
          message: apiError.message,
        });
        result.conflicts += 1;
        continue;
      }

      // Retryable: network, timeout, or a server fault.
      if (!apiError || apiError.isRetryable) {
        const attempts = row.attemptCount + 1;
        if (hasExhaustedRetries(attempts)) {
          await queue.markFailed(row.id, {
            code: apiError?.code ?? 'exhausted',
            message: apiError?.message ?? 'Could not reach the server after several attempts.',
          });
          result.failed += 1;
        } else {
          await queue.markRetry(
            row.id,
            now() + backoffMs(attempts, random),
            {
              code: apiError?.code ?? 'network',
              message: apiError?.message ?? 'Network error',
            },
            now(),
          );
        }
        continue;
      }

      // The server judged it invalid or forbidden. Retrying cannot change the
      // answer, so park it for a human.
      await queue.markFailed(row.id, {
        code: apiError.code ?? String(apiError.status ?? 'rejected'),
        message: apiError.message,
      });
      result.failed += 1;
    }
  }

  return 'continue';
}

/**
 * Drain the queue once.
 *
 * Returns without doing anything when offline, unauthenticated, or already
 * draining — all normal conditions, not errors.
 */
export async function drainQueue(options: DrainOptions): Promise<DrainResult> {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const getToken = options.getToken ?? getAccessToken;

  // Claim the lock SYNCHRONOUSLY, before any await. Checking the flag and then
  // awaiting before setting it leaves a window in which two callers both pass
  // the guard — and two drains can claim the same row and send it twice.
  if (draining) return emptyResult('already-running');
  draining = true;

  const result: DrainResult = {
    synced: 0,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    stoppedBecause: 'completed',
  };

  try {
    if (!options.isOnline()) return emptyResult('offline');

    const token = await getToken();
    if (!token) return emptyResult('unauthenticated');

    // Rows left in `syncing` by a killed app would otherwise never move again.
    // Safe to reclaim: every send carries an idempotency key.
    await queue.reclaimStuckSyncing(now());

    const limit = options.batchSize ?? 20;

    for (let pass = 0; pass < MAX_BATCHES_PER_DRAIN; pass++) {
      const batch = await queue.claimReady(limit, now());
      if (batch.length === 0) break;

      if ((await sendBatch(batch, options, result, now, random)) === 'stop') break;

      // A short batch is the queue telling us it is empty. Claiming again would
      // be a round-trip that can only return nothing.
      if (batch.length < limit) break;
    }

    const summary = await queue.getUnsyncedSummary();
    result.remaining = summary.total;

    /**
     * Housekeeping, after the work and never before it.
     *
     * `pruneSynced` existed, was tested, and was called from nowhere — so every
     * operation a device ever sent stayed in `sync_queue` for the life of the
     * install. A branch handset at ~100 sales a day accumulates tens of
     * thousands of rows, each carrying its request payload as JSON, and every
     * `claimReady` and every badge count reads past all of them.
     *
     * Only `synced` rows older than the retention window go. `failed` and
     * `conflict` are never pruned — they are still the only copy of a
     * transaction the server did not accept — and neither is `superseded`, which
     * is the record of what an operator actually rang up.
     *
     * Best-effort: a drain that moved real work must not be reported as failed
     * because a cleanup DELETE did not run.
     */
    try {
      await queue.pruneSynced();
    } catch (error) {
      console.warn('[sync] could not prune synced rows', error);
    }

    return result;
  } finally {
    draining = false;
  }
}
