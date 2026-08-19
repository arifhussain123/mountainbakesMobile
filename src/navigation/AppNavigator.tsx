import React, { useMemo } from 'react';
import type { UserRole } from '@/shared/types/user.types';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { AccountDrawer } from './AccountDrawer';
import { accessProfileFor, isKnownRole } from './roleConfig';

/**
 * The authenticated shell.
 *
 *   AccountDrawer  — account panel, not navigation (see docs/navigation.md)
 *     └── RoleTabs — 4 daily-operations tabs + More, from roleConfig
 *           └── one native stack per tab
 *
 * Detail and create screens live inside the stack of the tab that owns the
 * resource, so nothing is registered here that a tab could own. What used to sit
 * at this level — a loose `Expenses` screen and `SyncCenter` — has moved into
 * More's stack, which is where the rest of the secondary surface lives.
 */
export function AppNavigator({
  role,
  branchId,
}: {
  role: UserRole;
  branchId: string | null;
}): React.ReactElement {
  // Mounted once for the whole authenticated tree, so a drain is not restarted
  // by a tab switch.
  useSyncEngine();

  const profile = useMemo(() => {
    if (!isKnownRole(role)) {
      /**
       * A role the app does not know is a backend/client version mismatch — a
       * new `user_role` value shipped before this build knew about it.
       *
       * The response is a minimal Home + More shell and a log, never a crash and
       * never the admin set. Failing open here would hand an unrecognised
       * account the widest menu in the app; the API would still refuse the
       * requests, but the UI would be advertising capabilities that are not
       * theirs.
       */
      console.warn(
        `[navigation] Unknown role "${role}" — falling back to the minimal shell. ` +
          'This build predates a user_role value the server is issuing.',
      );
    }
    // `allowSuperAdminWrite` mirrors the server-side finance setting and is
    // read-only to this client, so finance stays view-only for a Super Admin
    // until the backend says otherwise.
    return accessProfileFor(role, branchId, false);
  }, [role, branchId]);

  return <AccountDrawer profile={profile} />;
}
