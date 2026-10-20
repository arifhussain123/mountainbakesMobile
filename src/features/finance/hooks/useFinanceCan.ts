import { useCallback } from 'react';
import { financeCan, useFinanceSettings, type FinancePermission } from '@/api';
import { useAuthStore } from '@/state';

/**
 * The web's `useFinanceAbilities()` (`finance-ui.tsx`): what the signed-in user
 * may do in the finance screens, with Finance Settings' "Allow Super Admin to
 * modify" (`allowSuperAdminWrite`) fed in — the same input the API's
 * `requireFinance(permission)` decides from. A Super Admin gets `view` only
 * until the toggle is on, then every permission; the four finance roles are
 * unaffected (`financeCan` ignores the toggle for them). Restrictive while
 * settings load (`?? false`), exactly as the web.
 *
 * Courtesy, not a boundary: every write re-decides on the server.
 */
export function useFinanceCan(): (permission: FinancePermission) => boolean {
  const role = useAuthStore((state) => state.user?.role);
  const { data } = useFinanceSettings();
  const allowSuperAdminWrite = data?.allowSuperAdminWrite ?? false;
  return useCallback((permission: FinancePermission) => financeCan(role, permission, allowSuperAdminWrite), [role, allowSuperAdminWrite]);
}
