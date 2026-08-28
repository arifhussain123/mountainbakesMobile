import { getDb } from '@/common/database/localDb';
import type { SyncEntity } from '@/common/database/repositories/syncQueueRepository';
import { defaultPriorityFor } from '@/api/sync/endpoints';
import { businessDateStr } from '@/shared/utils/timezone';
import { newOperationId } from '@/common/utils/operationId';

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
  stock_movement: 'local_stock_movements',
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
    } else if (table === 'local_stock_movements') {
      await tx.execute(
        `INSERT INTO local_stock_movements
           (client_operation_id, branch_id, business_date, movement_type, payload,
            sync_status, created_at, updated_at)
         VALUES (?, ?, ?, 'return', ?, 'pending', ?, ?)`,
        [clientOperationId, input.branchId, businessDate, payloadJson, now, now],
      );
    }
    /**
     * `order` is the one entity with no local mirror, and it has no producer in
     * this app either: a branch's "orders" are production demands, and customer
     * orders are raised on the web. A table for it would be a schema commitment
     * to a shape nothing has been designed against yet.
     */

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

// ---------------------------------------------------------------------------
// Reading back what has not reached the server yet
// ---------------------------------------------------------------------------

/**
 * A sale this device wrote and the server has not yet acknowledged.
 *
 * Carries no money figure, and that is the point rather than an omission: the
 * POS payload holds `{productId, qty, discount}` and no prices at all, because
 * the server resolves the rate at commit so a stale cached price can never reach
 * a receipt. There is therefore nothing on the device to total, and a figure
 * computed here from mirrored prices would be a number the server never agreed
 * to sitting in a column of numbers it did.
 */
export interface QueuedSale {
  clientOperationId: string;
  /** Milliseconds, device clock — when the cashier rang it up. */
  createdAt: number;
  paymentMethod: string;
  /** Distinct products on the sale. */
  lineCount: number;
  /** Units across every line. */
  units: number;
  /**
   * The queue's verdict, which is what separates "waiting" from "refused".
   *
   * `local_sales.sync_status` cannot answer this on its own: `markFailed` and
   * `markConflict` touch only the queue row, so a sale the server rejected is
   * still `'pending'` here. A refused sale that a register drew as "waiting to
   * sync" is the exact failure the three-outcome rule exists to prevent — it
   * waits for a person, not for a signal.
   */
  queueStatus: string | null;
}

/**
 * The day's sales that are still on the device, newest first.
 *
 * Scoped by the branch AND the business date the row was stamped with at
 * creation — `idx_sales_business_date` covers exactly that pair. The date is the
 * device's own stamp rather than the server's, which is the whole reason a sale
 * rung up at 21:00 and drained at 07:00 still belongs to the evening it was
 * made.
 *
 * `sync_status = 'pending'` excludes both ends: a synced sale is already in the
 * server's list for that day and would otherwise appear twice, and a
 * `superseded` one was closed by a person in the server's favour and must not
 * come back as outstanding work.
 */
export async function listQueuedSalesForDay(
  branchId: string,
  businessDate: string,
): Promise<QueuedSale[]> {
  const db = getDb();
  const res = await db.execute(
    `SELECT s.client_operation_id AS clientOperationId,
            s.created_at          AS createdAt,
            s.payment_method      AS paymentMethod,
            s.payload             AS payload,
            q.status              AS queueStatus
       FROM local_sales s
       LEFT JOIN sync_queue q ON q.client_operation_id = s.client_operation_id
      WHERE s.branch_id = ? AND s.business_date = ? AND s.sync_status = 'pending'
      ORDER BY s.created_at DESC`,
    [branchId, businessDate],
  );

  const rows = (res.rows as unknown as Record<string, unknown>[] | undefined) ?? [];

  return rows.map(row => {
    const items = itemsOf(row.payload);
    return {
      clientOperationId: String(row.clientOperationId),
      createdAt: Number(row.createdAt) || 0,
      paymentMethod: String(row.paymentMethod ?? ''),
      lineCount: items.length,
      units: items.reduce((sum, item) => sum + item, 0),
      queueStatus: row.queueStatus === null || row.queueStatus === undefined
        ? null
        : String(row.queueStatus),
    };
  });
}

/**
 * Quantities out of a stored payload, defensively.
 *
 * The column is the exact JSON that will be POSTed, so its shape is the API's
 * rather than this module's — and it is read back on a device that may have
 * written it several app versions ago. A malformed or older payload costs the
 * row its item count, never the register the whole list.
 */
function itemsOf(payload: unknown): number[] {
  if (typeof payload !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(payload);
    if (typeof parsed !== 'object' || parsed === null) return [];
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    return items.map(item => {
      const qty = (item as { qty?: unknown })?.qty;
      return typeof qty === 'number' && Number.isFinite(qty) ? qty : 0;
    });
  } catch {
    return [];
  }
}
