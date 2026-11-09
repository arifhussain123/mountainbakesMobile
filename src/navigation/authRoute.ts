import type { AuthStatus } from '@/state';

export type AuthRoute = 'splash' | 'main' | 'onboarding' | 'login';

/**
 * The one place the launch routing rule lives (branchApp.md: "Splash → restore
 * session → route"):
 *   - still restoring the session → splash
 *   - a session → the role's main shell
 *   - no session and onboarding never completed → onboarding
 *   - no session otherwise → login
 */
export function selectAuthRoute(
  status: AuthStatus,
  onboardingCompleted: boolean,
): AuthRoute {
  if (status === 'bootstrapping') return 'splash';
  if (status === 'signedIn') return 'main';
  return onboardingCompleted ? 'login' : 'onboarding';
}
