import { v7 as uuidv7 } from 'uuid';

/**
 * Client operation IDs.
 *
 * One of these is minted when a transaction is CREATED on the device — not when
 * it is sent. It is simultaneously:
 *
 *   - the primary key of the local row,
 *   - the `sync_queue.client_operation_id`,
 *   - the `Idempotency-Key` header on every send attempt.
 *
 * It must NEVER be regenerated, including on retry. Regenerating on retry is
 * exactly how a request the server already processed becomes a second sale.
 *
 * UUIDv7 rather than v4 because it is time-ordered: the queue drains in creation
 * order under a plain sort, and the id itself carries a creation timestamp that
 * survives into the server's logs.
 *
 * Randomness comes from crypto.getRandomValues, polyfilled at app entry by
 * react-native-get-random-values.
 */

export function newOperationId(): string {
  return uuidv7();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Whether a string is a well-formed RFC 9562 UUID with a valid variant. */
export function isOperationId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** The UUIDv7 version nibble, for asserting we minted a v7 and not a v4. */
export function uuidVersion(value: string): number | null {
  if (!isOperationId(value)) return null;
  const versionChar = value[14];
  if (!versionChar) return null;
  const v = parseInt(versionChar, 16);
  return Number.isNaN(v) ? null : v;
}
