import { isApiError } from '@/api/client';
import { mapErrorToMessage } from '@/shared/helpers';

/**
 * Login-screen-specific copy, distinct from `shared/helpers/errorMapper`'s
 * generic mapping: a 401 here always means "wrong email/password" (never a
 * dead access token — `client.ts` excludes `/auth/login` from its silent-
 * refresh retry), and a null status at the login screen specifically means
 * "cannot sign in for the first time while offline", not the generic
 * "some information may be unavailable" copy used once already signed in.
 */
export function mapLoginError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === null) {
      return "You're offline. Connect to sign in for the first time.";
    }
    if (error.status === 401) {
      return 'Email or password is incorrect.';
    }
    if (error.status === 429 || error.status >= 500) {
      return 'Something went wrong. Please try again in a moment.';
    }
    // Account disabled / pending approval and other server-authored messages
    // (e.g. "Your account is pending admin approval.") are already written
    // for an end user to read — pass them through as-is.
    return error.message || 'Something went wrong. Please try again.';
  }
  return mapErrorToMessage(error);
}
