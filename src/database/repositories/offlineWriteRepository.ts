import { getDb } from '@/database/localDb';
import type { SyncEntity } from '@/database/repositories/syncQueueRepository';
import { defaultPriorityFor } from '@/services/sync/endpoints';
import { businessDateStr } from '@/shared/utils/timezone';
import { newOperationId } from '@/utils/operationId';

/**
 * Writing a transaction that may be created offline.
 *
 * The domain row and its sync_queue row are written in ONE local transaction.
 * Either without the other is a defect with a name: a domain row with no queue
 * row is work that never syncs, and a queue row with no domain row is a phantom
 * the user cannot see or correct.
 *
 * The business date is stamped HERE, on the device, at creation time. The server
 * stamps it on receipt, so a sale rung up at 21:00 and synced at 07:00 would
 * otherwise be billed to a business day that has already closed.
 */

export interface OfflineWriteInput {
  entity: SyncEntity;
  /** Exactly what the API expects, minus businessDate (added below). */
  payload: Record<string, unknown>;
  branchId: string;
  /** Overrides the computed business date. Only for corrections/backdating. */
  businessDate?: string;
  /** client_operation_id of a prerequisite that must sync first. */
  dependsOn?: string | null;
}

export interface OfflineWriteResult {
  clientOperationId: string;
  businessDate: string;
  /** True when it went straight to the queue rather than being sent. */
  queued: true;
}

/** Which local table mirrors each entity. */
const DOMAIN_TABLE: Partial<Record<SyncEntity, string>> = {
  sale: 'local_sales',
  expense: 'local_expenses',
  production_order: 'local_production_orders',
};

function numericText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '0';
}

/**
 * Persist a transaction locally and queue it for sync.
 *
 * Returns the client_operation_id, which is simultaneously the local row's key,
 * the queue row's key, and the Idempotency-Key sent to the server. It is never
 * regenerated — that is what makes a retry safe.
 */
export async function writeOffline(input: OfflineWriteInput): Promise<OfflineWriteResult> {
  const db = getDb();
  const clientOperationId = newOperationId();
  const businessDate = input.businessDate ?? businessDateStr();
  const now = Date.now();
  const payloadJson = JSON.stringify(input.payload);

  await db.transaction(async tx => {
    const table = DOMAIN_TABLE[input.entity];

    if (table === 'local_sales') {
      await tx.execute(
        `INSERT INTO local_sales
           (client_operation_id, branch_id, business_date, payload, grand_total,
            payment_method, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          clientOperationId,
          input.branchId,
          businessDate,
          payloadJson,
          // Money is stored as TEXT to preserve the exact numeric(14,2) decimal.
          numericText(input.payload.grandTotal),
          String(input.payload.paymentMethod ?? 'cash'),
          now,
          now,
        ],
      );
    } else if (table === 'local_expenses') {
      await tx.execute(
        `INSERT INTO local_expenses
           (client_operation_id, branch_id, business_date, category, amount,
            payload, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          clientOperationId,
          input.branchId,
          businessDate,
          String(input.payload.category ?? ''),
          numericText(input.payload.amount),
          payloadJson,
          now,
          now,
        ],
      );
    } else if (table === 'local_production_orders') {
      await tx.execute(
        `INSERT INTO local_production_orders
           (client_operation_id, branch_id, business_date, status, payload,
            sync_status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, 'pending', ?, ?)`,
        [clientOperationId, input.branchId, businessDate, payloadJson, now, now],
      );
    }
    // Entities with no local mirror (stock_movement) are queue-only: the server
    // owns the balance and there is nothing meaningful to show locally.

    await tx.execute(
      `INSERT INTO sync_queue
         (client_operation_id, entity, entity_local_id, action, payload,
          business_date, depends_on, priority, status, attempt_count,
          next_attempt_at, created_at, updated_at)
       VALUES (?, ?, ?, 'create', ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      [
        clientOperationId,
        input.entity,
        clientOperationId,
        payloadJson,
        businessDate,
        input.dependsOn ?? null,
        defaultPriorityFor(input.entity),
        now,
        now,
        now,
      ],
    );
  });

  return { clientOperationId, businessDate, queued: true };
}
