import { isApiError } from '@/api/client';

export const LOGIN_MESSAGES = {
  invalidCredentials: 'Email or password is incorrect.',
  offline: "You're offline. Connect to sign in for the first time.",
  retry: 'Something went wrong. Please try again in a moment.',
} as const;

/**
 * API error → the sentence the login banner shows. Every case ends in a
 * message, so the button never stays stuck behind an unexplained failure.
 *
 *   401 (invalid_credentials)        → the fixed "incorrect" sentence
 *   403 (account_inactive, …)        → the server's own friendly message
 *   no response, network / offline   → the offline sentence
 *   no response, timeout             → retry
 *   400 (malformed request)          → the server's message
 *   429 / 5xx / anything else        → retry
 *
 * The server has no "pending approval" state: an account is `active` or it is
 * not, and the 403 branch covers that.
 */
export function mapLoginError(
  error: unknown,
  options: { isOffline?: boolean } = {},
): string {
  if (isApiError(error)) {
    if (error.status === null) {
      if (error.code === 'timeout' && !options.isOffline)
        return LOGIN_MESSAGES.retry;
      return LOGIN_MESSAGES.offline;
    }
    if (error.status === 401) return LOGIN_MESSAGES.invalidCredentials;
    if ((error.status === 403 || error.status === 400) && error.message)
      return error.message;
    return LOGIN_MESSAGES.retry;
  }
  if (options.isOffline) return LOGIN_MESSAGES.offline;
  return LOGIN_MESSAGES.retry;
}

export const FORGOT_PASSWORD_MESSAGES = {
  sent: 'If an Administrator account matches that email, a reset link is on its way. Check your inbox.',
  offline: "You're offline. Connect to request a reset link.",
  retry: 'Something went wrong. Please try again in a moment.',
} as const;

/** Same shape as `mapLoginError` for the forgot-password request; a 403 is the server's recovery policy, shown verbatim. */
export function mapForgotPasswordError(
  error: unknown,
  options: { isOffline?: boolean } = {},
): string {
  if (isApiError(error)) {
    if (error.status === null)
      return error.code === 'timeout' && !options.isOffline
        ? FORGOT_PASSWORD_MESSAGES.retry
        : FORGOT_PASSWORD_MESSAGES.offline;
    if ((error.status === 403 || error.status === 400) && error.message)
      return error.message;
    return FORGOT_PASSWORD_MESSAGES.retry;
  }
  if (options.isOffline) return FORGOT_PASSWORD_MESSAGES.offline;
  return FORGOT_PASSWORD_MESSAGES.retry;
}
