import { api } from '../client';

/**
 * Auth endpoints on the Express API.
 *
 * These are the ONLY auth operations the server exposes — there is no login or
 * refresh endpoint. Signing in and refreshing happen against Supabase directly;
 * these three cover the parts that need privileged table access or an
 * authorization decision the browser cannot make for itself.
 *
 * Response shapes are read from src/routes/auth.routes.ts, not assumed.
 */

/**
 * Resolve a Finance User ID (or email) to the account's email address.
 *
 * Finance staff are issued an ID rather than an email, and Supabase Auth only
 * understands email/password — so the ID must be resolved before sign-in.
 *
 * Deliberately an enumeration-hardened endpoint: an unknown ID, a non-finance
 * account and a deactivated one all return the SAME 404 with
 * `code: 'finance-account-not-found'`. Never surface which case occurred, and
 * never report it differently from a wrong password. It is rate-limited to
 * 20 attempts per 15 minutes, far tighter than the app-wide limit.
 */
export function financeLookup(userId: string): Promise<{ email: string }> {
  return api.post<{ email: string }>('/api/auth/finance-lookup', { userId });
}

/**
 * Ask whether password recovery is permitted for an email.
 *
 * Administrator accounts only — the server returns 403 with `code: 'not-admin'`
 * for everyone else, and for unknown addresses too, so the response never
 * reveals whether an account exists. On `{ allowed: true }` the caller then
 * triggers Supabase's own reset email.
 */
export function forgotPassword(email: string): Promise<{ allowed: true }> {
  return api.post<{ allowed: true }>('/api/auth/forgot-password', { email });
}

/**
 * Change the signed-in user's own password and clear `mustChangePassword`.
 *
 * The caller MUST follow this with `supabase.auth.refreshSession()`. The server
 * clears the flag in `app_metadata`, but the app gates on the claim inside the
 * JWT it already holds — without a refresh that JWT still says the password must
 * be changed, and the user is bounced straight back to this screen forever.
 */
export function changePassword(newPassword: string): Promise<{ success: true }> {
  return api.post<{ success: true }>('/api/auth/change-password', { newPassword });
}
