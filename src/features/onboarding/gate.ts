import type { AuthStatus } from '@/state/authStore';

/**
 * Whether `RootNavigator` should show the first-run panels.
 *
 * Pure and exported for the same reason `pressTargets` is: the rule below has
 * two halves, only one of them is obvious, and neither is observable by
 * rendering `RootNavigator` — which pulls in every navigator in the app.
 *
 * The obvious half is `!seen`. The half worth a test is `status`: this flag
 * ships to phones that have been running the app for months, where it reads
 * absent, so a check on `seen` alone would hand a tour of the app to every
 * existing user in the middle of a shift. A live session is proof the panels
 * are not owed.
 *
 * `signingIn` and any other in-flight status count as signed out, deliberately.
 * A first-run device has nothing in flight; a returning one is `signedIn` from
 * the restored session before this ever renders.
 */
export function shouldShowOnboarding(seen: boolean, status: AuthStatus): boolean {
  return !seen && status !== 'signedIn';
}
