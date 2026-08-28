import { useMemo } from 'react';
import { accessProfileFor, type AccessProfile } from '@/navigation/roleConfig';
import { useAuthStore } from '@/state/authStore';

/**
 * The signed-in user's access profile, for screens.
 *
 * `AppNavigator` resolves one of these to build the tab tree, but it does not
 * pass it down — screens are resolved by `screenRegistry` as bare components
 * with no props, precisely so a screen never depends on how it was mounted.
 * This derives the same profile from the same claims instead.
 *
 * It is a pure function of `role` and `branchId`, so the two agree by
 * construction rather than by being kept in step. The one input that could
 * eventually diverge is `allowSuperAdminWrite`, which both sides pass as
 * `false` today because the client cannot read the server-side finance setting;
 * when it becomes real state, it belongs in one place that both read.
 *
 * Returns `null` when signed out — every caller is inside the authenticated
 * tree, but the store's type admits the gap and a screen unmounting during
 * sign-out would otherwise read claims that are already gone.
 */
export function useAccessProfile(): AccessProfile | null {
  const claims = useAuthStore(s => s.claims);

  return useMemo(() => {
    if (!claims) return null;
    return accessProfileFor(claims.role, claims.branchId, false);
  }, [claims]);
}
