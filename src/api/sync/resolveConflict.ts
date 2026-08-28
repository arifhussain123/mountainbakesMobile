import * as conflictRepo from '@/common/database/repositories/conflictRepository';
import type { ConflictRecord } from '@/common/database/repositories/conflictRepository';
import * as queue from '@/common/database/repositories/syncQueueRepository';
import { newOperationId } from '@/common/utils/operationId';
import { policyFor, type ConflictResolution } from './conflicts';

/**
 * Applying a person's decision about a conflict.
 *
 * Three things are true of every path through this file:
 *
 *   1. **Nothing is deleted.** `keep_server` closes the local transaction as
 *      `superseded`; it does not remove it. The operator's entry is the only
 *      record of what was actually rung up at the counter, and a reconciliation
 *      that finds a till short needs to be able to read it.
 *
 *   2. **The server is authoritative for money and stock.** No path here writes
 *      a local value over a server one, and no path resolves anything on its
 *      own — every one of them is a person's choice, recorded as such.
 *
 *   3. **An unsafe resolution is refused, not warned about.** The policy in
 *      `conflicts.ts` decides which resolutions exist for each conflict type,
 *      and this checks against it rather than trusting the caller. A UI bug must
 *      not be able to double-commit a stock return.
 */

export type ResolutionOutcome =
  | { ok: true; resolution: ConflictResolution; reissuedAs?: string }
  | { ok: false; reason: string };

export interface ResolveInput {
  conflict: ConflictRecord;
  resolution: ConflictResolution;
  /**
   * A corrected payload. Only meaningful for `resend_as_new` — changing the
   * content is precisely what makes it a new transaction rather than a retry.
   */
  editedPayload?: Record<string, unknown>;
  /** A corrected business date, for the closed-day case. */
  editedBusinessDate?: string;
  now?: () => number;
}

/**
 * Resolve one conflict.
 *
 * Returns a failure rather than throwing for anything the operator could have
 * chosen differently — an unsafe resolution, a queue row that has moved on —
 * because these surface as a message on the conflict card, not as a crash.
 */
export async function applyResolution(input: ResolveInput): Promise<ResolutionOutcome> {
  const now = input.now ?? Date.now;
  const { conflict, resolution } = input;
  const policy = policyFor(conflict.type);

  // Checked against the policy, not the caller's word for it. `resend_as_new`
  // mints a fresh idempotency key and the server WILL execute it, so for any
  // conflict that may already have landed this is the line that prevents a
  // duplicate sale or a double stock return.
  if (!policy.resolutions.includes(resolution)) {
    return {
      ok: false,
      reason: `${resolution} is not a safe resolution for this conflict.`,
    };
  }

  const row = await queue.getByClientOperationId(conflict.clientOperationId);

  // No queue row, or one the server already accepted. `price_changed` is the
  // ordinary case: the sale synced fine and the conflict is a record of the
  // discrepancy, so there is nothing to re-send — acknowledging it is the whole
  // resolution.
  if (!row || row.status === 'synced') {
    await conflictRepo.markResolved(conflict.id, resolution, now());
    return { ok: true, resolution };
  }

  if (resolution === 'retry') {
    // The SAME client_operation_id, deliberately. The server dedupes on it, so
    // if the transaction did land after all this replays the original answer
    // instead of executing a second time.
    await queue.requeue(row.id, now());
    await conflictRepo.markResolved(conflict.id, 'retry', now());
    return { ok: true, resolution };
  }

  if (resolution === 'keep_server') {
    await queue.markSuperseded(
      row.id,
      { entity: row.entity, clientOperationId: row.clientOperationId },
      now(),
    );
    await conflictRepo.markResolved(conflict.id, 'keep_server', now());
    return { ok: true, resolution };
  }

  // resend_as_new — a genuinely different transaction, so a new identity.
  const reissuedAs = newOperationId();
  const payload = input.editedPayload ?? (row.payload as Record<string, unknown> | null) ?? {};
  const businessDate = input.editedBusinessDate ?? row.businessDate;

  await queue.reissueOperation(
    row.id,
    {
      entity: row.entity,
      previousClientOperationId: row.clientOperationId,
      clientOperationId: reissuedAs,
      payload,
      businessDate,
    },
    now(),
  );

  // The new id is stored in the resolution so the two records stay linked: the
  // conflict names the operation it became, which is what makes the trail
  // followable during reconciliation.
  await conflictRepo.markResolved(conflict.id, `resend_as_new:${reissuedAs}`, now());
  return { ok: true, resolution, reissuedAs };
}
