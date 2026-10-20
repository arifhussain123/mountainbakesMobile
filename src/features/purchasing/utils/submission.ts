/**
 * One idempotency key per submission.
 *
 * The API's `idempotent()` middleware replays the first answer for a repeat
 * of the same key, and refuses the same key with a different body (422). So a
 * key belongs to one body: a retry of the SAME body (after a timeout, a lost
 * connection, a 503) reuses it, and an edited body after a failure gets a new
 * one. A successful submission retires the key.
 *
 * The body is fingerprinted with sorted keys (as the server does), so a
 * re-render that rebuilds the object in another key order is still "the same".
 */

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export interface SubmissionKey {
  key: string;
  fingerprint: string;
}

/** The key for `body`: the previous one when the body is unchanged, a fresh one (from `mint`) otherwise. */
export function keyForBody(previous: SubmissionKey | null, body: unknown, mint: () => string): SubmissionKey {
  const fingerprint = canonicalJson(body);
  if (previous && previous.fingerprint === fingerprint) return previous;
  return { key: mint(), fingerprint };
}

/** The server's `clientRequestId` / `Idempotency-Key` shape. */
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;

interface DuckApiError {
  status: number | null;
  message: string;
  details?: unknown;
}

function isDuckApiError(value: unknown): value is DuckApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value;
}

/** `items.0.requestedQty` → `Item 1`; anything else → its last segment, spaced. */
function fieldLabel(field: string): string {
  const line = /^items\.(\d+)/.exec(field);
  if (line) return `Line ${Number(line[1]) + 1}`;
  const last = field.split('.').pop() ?? field;
  const spaced = last.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The error a person reads after a failed purchasing call: the server's own
 * sentence (they are written for end users — "That demand changed: …"),
 * plus each field message of a 400 validation error. Network and 5xx keep
 * the app's usual wording via `fallback`.
 */
export function describeApiError(error: unknown, fallback: (error: unknown) => string): string {
  if (!isDuckApiError(error)) return fallback(error);
  if (error.status === 400 && Array.isArray(error.details) && error.details.length > 0) {
    const lines = (error.details as Array<{ field?: unknown; message?: unknown }>)
      .filter((d) => typeof d?.message === 'string')
      .slice(0, 5)
      .map((d) => (typeof d.field === 'string' && d.field ? `${fieldLabel(d.field)}: ${String(d.message)}` : String(d.message)));
    if (lines.length > 0) return lines.join('\n');
  }
  return fallback(error);
}

/** True when the server refused because the record moved under us (stale screen, someone else decided first). */
export function isConflict(error: unknown): boolean {
  return isDuckApiError(error) && error.status === 409;
}
