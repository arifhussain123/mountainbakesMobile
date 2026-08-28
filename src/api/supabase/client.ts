import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { supabaseStorageAdapter } from '@/common/storage/secureStorage';

/**
 * Supabase client — AUTH ONLY.
 *
 * The Express API owns every business read and write; it holds the service-role
 * key and authorises each request itself. This client exists solely to obtain and
 * refresh the session whose access token is then sent to that API as
 * `Authorization: Bearer`. That is exactly how the web client works — the server
 * has no login endpoint to call instead (confirmed: src/routes/auth.routes.ts has
 * no /login handler).
 *
 * Do not add business queries here. Reading a business table directly would
 * bypass the authorization layer, and RLS is documented as defence-in-depth
 * rather than the boundary.
 *
 * Claim parsing lives in ./claims so it can be tested without constructing this
 * client, which starts refresh timers.
 */

/**
 * `detectSessionInUrl` is false: that option exists for browser OAuth redirects
 * and there is no URL to parse in a native app.
 */
export const supabase: SupabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: supabaseStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Current access token, or null. Used by the API client per request. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export { claimsFromSession, isValidRole } from './claims';
export type { SessionClaims } from './claims';
