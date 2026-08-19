import * as queue from '@/database/repositories/syncQueueRepository';
import type { SyncQueueRow } from '@/database/repositories/syncQueueRepository';
import { api } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { getAccessToken } from '@/services/supabase/client';
import { backoffMs, hasExhaustedRetries } from './backoff';
import { endpointFor } from './endpoints';

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
 *   409                     → conflict. Record it and surface it to a human.
 *   4xx validation          → the server has judged it. Park as failed.
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
  /** Max operations per drain, so one pass cannot run unbounded. */
  batchSize?: number;
  now?: () => number;
  random?: () => number;
}

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
async function sendOperation(row: SyncQueueRow): Promise<void> {
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

  await api[endpoint.method](endpoint.path, payload, {
    idempotencyKey: row.clientOperationId,
  });
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

    const batch = await queue.claimReady(options.batchSize ?? 20, now());

    for (const row of batch) {
      if (!options.isOnline()) {
        result.stoppedBecause = 'offline';
        break;
      }

      await queue.markSyncing(row.id, now());

      try {
        await sendOperation(row);
        await queue.markSynced(row.id, now());
        result.synced += 1;
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
          break;
        }

        if (apiError?.kind === 'conflict') {
          await queue.markConflict(row.id, {
            code: apiError.code ?? 'conflict',
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
              { code: apiError?.code ?? 'network', message: apiError?.message ?? 'Network error' },
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

    const summary = await queue.getUnsyncedSummary();
    result.remaining = summary.total;
    return result;
  } finally {
    draining = false;
  }
}
