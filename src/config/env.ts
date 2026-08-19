import Config from 'react-native-config';

/**
 * Environment configuration.
 *
 * Everything here is PUBLIC — react-native-config bakes these values into the
 * binary as plain strings, trivially readable from an APK. Only the API origin,
 * the Supabase URL, the Supabase ANON/publishable key, and feature flags belong
 * here. The service-role key must never appear in this app; it lives on the
 * Express server, which is what holds every privileged write.
 *
 * The fail-loud checks mirror `assertApiReachable()` in the web client: a
 * misconfigured build should announce itself rather than render fine and 404
 * every data request.
 */

function required(name: string, value: string | undefined): string {
  const v = (value ?? '').trim();
  if (!v) {
    throw new Error(
      `[config] ${name} is not set. Copy .env.example to .env.development and fill it in, ` +
        `then rebuild — react-native-config values are read at BUILD time, so a running app ` +
        `cannot pick up a change without a rebuild.`,
    );
  }
  return v;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  /** Express API origin, e.g. https://api.mountainbakes.com — never a trailing slash. */
  apiUrl: stripTrailingSlash(required('API_URL', Config.API_URL)),

  /** Supabase project URL. Auth only — all business data goes through the API. */
  supabaseUrl: stripTrailingSlash(required('SUPABASE_URL', Config.SUPABASE_URL)),

  /**
   * Supabase anon/publishable key. Safe to ship: it grants nothing beyond what
   * RLS allows an unauthenticated caller, and this app uses it purely to sign in
   * and refresh a session.
   */
  supabaseAnonKey: required('SUPABASE_ANON_KEY', Config.SUPABASE_ANON_KEY),

  /**
   * Web app origin. Used as the `redirectTo` for Supabase password-recovery
   * emails: the reset link opens the web app's /reset-password page, and the
   * user returns to this app to sign in with the new password.
   *
   * Deliberately not a deep link into the app. That would need a registered URL
   * scheme, native intent filters on both platforms, and the scheme added to
   * Supabase's redirect allowlist — none of which can be verified without
   * devices. Sending recovery to the working web page is correct today and can
   * be swapped for a deep link later without touching the flow.
   */
  webUrl: stripTrailingSlash((Config.WEB_URL ?? '').trim()),

  /** 'development' | 'staging' | 'production' */
  environment: (Config.ENVIRONMENT ?? 'development') as
    | 'development'
    | 'staging'
    | 'production',

  /** Optional. Crash reporting is disabled when unset. */
  sentryDsn: (Config.SENTRY_DSN ?? '').trim() || undefined,

  get isProduction(): boolean {
    return this.environment === 'production';
  },

  get isDev(): boolean {
    return this.environment === 'development';
  },
} as const;

/**
 * Guard against the commonest misconfiguration: a release build still pointing at
 * a developer's localhost API. On a device, localhost is the phone itself, so
 * every request fails in a way that looks like the server being down.
 */
export function assertApiReachable(): void {
  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/i.test(env.apiUrl);
  if (isLoopback && env.isProduction) {
    throw new Error(
      `[config] API_URL is ${env.apiUrl}, a loopback address, in a production build. ` +
        `On a physical device that resolves to the phone itself and every request will fail.`,
    );
  }
  if (!env.isProduction && !/^https?:\/\//i.test(env.apiUrl)) {
    throw new Error(`[config] API_URL must include a scheme. Got: ${env.apiUrl}`);
  }
}
