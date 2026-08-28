import type { SyncAction, SyncEntity } from '@/common/database/repositories/syncQueueRepository';

/**
 * Where each queued entity is sent.
 *
 * Paths are the real ones from the server's route table — nothing invented.
 * `priority` encodes dependency ordering as a coarse default: an order must
 * exist before a sale references it, and a stock movement follows both.
 * Fine-grained ordering uses `depends_on` on the row itself.
 */

export interface EntityEndpoint {
  path: string;
  method: 'post' | 'put';
  priority: number;
  /**
   * The request field carrying the device-captured date.
   *
   * Not uniform, and not guessable: `CreateExpenseSchema` has always taken
   * `date`, while the four endpoints that gained the field with server migration
   * 84 take `businessDate`. Sending the wrong key is silently ignored — the
   * server would then stamp the day the request ARRIVED, which is exactly how a
   * 9pm sale synced at 7am lands on the wrong day — so each is named explicitly.
   *
   * The server bounds whatever is sent (no future dates, nothing older than the
   * seven-day sync window) and refuses a day that has been closed. A refusal
   * parks the operation for a person; it never re-dates it silently.
   */
  businessDateField: string;
}

const CREATE: Record<SyncEntity, EntityEndpoint> = {
  order: { path: '/api/orders', method: 'post', priority: 10, businessDateField: 'businessDate' },
  production_order: {
    path: '/api/production-orders',
    method: 'post',
    priority: 20,
    businessDateField: 'businessDate',
  },
  sale: { path: '/api/orders/pos', method: 'post', priority: 30, businessDateField: 'businessDate' },
  expense: { path: '/api/expenses', method: 'post', priority: 40, businessDateField: 'date' },
  stock_movement: {
    path: '/api/stock/return',
    method: 'post',
    priority: 50,
    businessDateField: 'businessDate',
  },
};

/**
 * The server's id for a just-accepted operation, out of its response body.
 *
 * Each endpoint answers in its own shape — there is no `{success, data}`
 * envelope anywhere in this API — so the knowledge of which key holds the id
 * belongs here, beside the paths, rather than inside the drain.
 *
 *   POST /api/orders, /api/orders/pos   `{ id, orderNumber, … }`
 *   POST /api/expenses                  `{ id }`
 *   POST /api/production-orders         `{ id }`
 *   POST /api/stock/return              `{ ids: [...] }` — a return commits one
 *                                       row per product, so the first id is the
 *                                       handle; the queue row is the operation.
 *
 * Returns null rather than throwing when the shape is unfamiliar: an id that
 * cannot be read is a local record with a blank `server_id`, which is a cosmetic
 * loss. Failing the drain over it would strand a transaction the server has
 * already accepted, which is not.
 */
export function serverIdFrom(entity: SyncEntity, body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;

  if (entity === 'stock_movement') {
    const ids = record.ids;
    return Array.isArray(ids) && typeof ids[0] === 'string' ? ids[0] : null;
  }

  return typeof record.id === 'string' ? record.id : null;
}

export function endpointFor(entity: SyncEntity, action: SyncAction): EntityEndpoint | null {
  if (action === 'create') return CREATE[entity] ?? null;
  // No queued update path exists yet. Returning null parks the row as failed
  // rather than guessing a URL — inventing an endpoint is worse than stopping.
  return null;
}

export function defaultPriorityFor(entity: SyncEntity): number {
  return CREATE[entity]?.priority ?? 100;
}
