/**
 * API error -> user-friendly message (architecture skill Section 12). Duck-typed
 * against the shape `api/client.ts` throws, rather than importing its type, so
 * `shared` never depends on `api` (folder-structure skill's import direction).
 */
interface DuckApiError {
  status: number | null;
  message: string;
}

function isDuckApiError(value: unknown): value is DuckApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value &&
    typeof (value as DuckApiError).message === 'string'
  );
}

/** Never shows a raw server stack trace — CLAUDE.md Section 39. */
export function mapErrorToMessage(error: unknown): string {
  if (isDuckApiError(error)) {
    if (error.status === null) {
      return 'No internet connection. Some information may be unavailable until connection is restored.';
    }
    // A 401 is not always "your session died" — it's also what a failed LOGIN
    // attempt returns (wrong password: "Invalid email or password"), and the
    // backend already writes that message for an end user to read. Only fall
    // back to the generic session-expiry copy when the server sent nothing
    // usable; an expired-session 401 on an authenticated request is handled
    // separately by `onSessionExpired` forcing a sign-out, not by this string.
    if (error.status === 401) return error.message || 'Your session has expired. Please sign in again.';
    if (error.status >= 500) return 'Something went wrong on our end. Please try again.';
    // The backend's own messages are already written for an end user to read
    // (e.g. "Stock has changed. Please review your order.") — pass them through.
    return error.message || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
