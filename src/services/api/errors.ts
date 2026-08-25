import axios, { type AxiosError } from 'axios';

/**
 * Error classification.
 *
 * The API has no uniform envelope — success bodies are ad hoc and resource-keyed
 * — but errors ARE consistent: `{ error: string, details?: unknown }` from
 * src/middleware/errorHandler.ts, with `details` carrying
 * `[{field, message}]` on a Zod failure and a `code` string on a handful of
 * routes. Everything below is derived from that shape; nothing is invented.
 */

export type ApiErrorKind =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'notFound'
  | 'conflict'
  | 'network'
  | 'offline'
  | 'timeout'
  | 'server'
  | 'unknown';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  /** Machine-readable code where the route supplies one (e.g. 'duplicate_income'). */
  readonly code: string | undefined;
  readonly fieldErrors: FieldError[];
  readonly details: unknown;
  /**
   * The whole response body, verbatim.
   *
   * `details` alone is not enough to decide what a conflict means. `POST
   * /api/stock/return` answers a mid-loop race with a top-level `committed`
   * array naming the products that ALREADY moved — the difference between an
   * operation that can be safely re-sent and one that must never be. Dropping
   * the body loses that, and it is also what `sync_conflicts.server_state`
   * stores so a person can compare the two sides.
   */
  readonly body: unknown;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    code?: string;
    fieldErrors?: FieldError[];
    details?: unknown;
    body?: unknown;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? [];
    this.details = init.details;
    this.body = init.body;
  }

  /**
   * Whether retrying the identical request could plausibly succeed. Drives the
   * sync queue: a validation failure must stop and surface, a network blip must
   * back off and retry.
   */
  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'offline' ||
      this.kind === 'timeout' ||
      this.kind === 'server'
    );
  }

  /** User-facing copy, per the error-message map in design-system.md. */
  get userMessage(): string {
    switch (this.kind) {
      /**
       * A transport failure is not evidence that a transaction exists.
       *
       * This copy used to read "Your transaction is saved and will sync
       * automatically", which is the queued-write sentence — and `userMessage`
       * is never rendered on a write path. Its ONLY caller is `MBErrorState`,
       * and every call site of that passes a *query* error alongside a
       * `refetch`: a dashboard, a ledger, a user list that could not load. So
       * the app told someone whose screen failed to load that a transaction
       * they never entered was safely queued, and `sync_queue` was empty.
       *
       * That is the offline rule in `services/sync/writeOutcome.ts` running in
       * a third direction. It already forbids reporting a queued write as
       * saved and a refused write as queued; this forbids claiming a write at
       * all when the failure was a read. Writes report through
       * `resolveWriteOutcome`, which reads the row by `client_operation_id`
       * and carries its own copy — nothing here needs to speak for them.
       *
       * `MBErrorState` heads this with "You're offline" already, so the
       * sentence does not repeat it.
       */
      case 'offline':
      case 'network':
        return 'We can\'t reach the server right now. This will load again when the connection returns.';
      case 'timeout':
        return 'The server took too long to respond. Please try again.';
      case 'validation':
        return this.fieldErrors.length > 0
          ? this.fieldErrors.map(f => f.message).join('\n')
          : this.message;
      case 'authentication':
        return 'Your session has expired. Please sign in again.';
      case 'authorization':
        return "You don't have permission to do this.";
      case 'conflict':
        return this.message || 'This was changed elsewhere. Review the difference.';
      case 'notFound':
        return 'That record no longer exists.';
      case 'server':
        return 'Something went wrong on our side. Try again.';
      default:
        return this.message || 'Something went wrong.';
    }
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}

function parseFieldErrors(details: unknown): FieldError[] {
  if (!Array.isArray(details)) return [];
  return details.flatMap(d => {
    if (d && typeof d === 'object' && 'field' in d && 'message' in d) {
      const { field, message } = d as Record<string, unknown>;
      if (typeof field === 'string' && typeof message === 'string') {
        return [{ field, message }];
      }
    }
    return [];
  });
}

/** Normalise anything thrown by axios (or by us) into an ApiError. */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error?: string;
      details?: unknown;
      code?: string;
    }>;

    if (axiosError.code === 'ECONNABORTED' || /timeout/i.test(axiosError.message)) {
      return new ApiError({ kind: 'timeout', message: 'Request timed out.' });
    }

    // No response at all — DNS failure, no route to host, radio off.
    if (!axiosError.response) {
      return new ApiError({
        kind: 'network',
        message: axiosError.message || 'Network request failed.',
      });
    }

    const { status, data } = axiosError.response;
    const body = (data ?? {}) as { error?: string; details?: unknown; code?: string };
    const fieldErrors = parseFieldErrors(body.details);

    // In production the server masks 5xx text to "Internal server error"; 4xx
    // messages are always user-facing and passed through verbatim.
    const message =
      body.error ?? axiosError.message ?? `Request failed with status ${status}`;

    return new ApiError({
      kind: kindForStatus(status),
      message,
      status,
      code: body.code,
      fieldErrors,
      details: body.details,
      body: data,
    });
  }

  if (error instanceof Error) {
    return new ApiError({ kind: 'unknown', message: error.message });
  }

  return new ApiError({ kind: 'unknown', message: 'Unknown error' });
}
