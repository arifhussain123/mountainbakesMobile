import React, { useMemo } from 'react';

import { StockDayScreen } from '@/screens/catalog/StockDayScreen';
import { StockHistoryScreen } from '@/screens/catalog/StockHistoryScreen';
import { StockReturnScreen } from '@/screens/catalog/StockReturnScreen';
import { isBranchRole } from '@/navigation/roleNavigation';
import type { UserRole } from '@/shared/types/user.types';
import { NAV_LABELS } from '../roleConfig';
import { placeholderFor, resolveTabScreen, type ScreenComponent } from '../screenRegistry';
import { createTabStack, type TabStackScreen } from './createTabStack';

/**
 * The Stock tab.
 *
 * ---------------------------------------------------------------------------
 * Returning is registered for branch roles only
 * ---------------------------------------------------------------------------
 * `POST /api/stock/return` is a **branch** action — it moves units out of the
 * caller's own branch and into the production pool, and the server derives the
 * branch from the caller rather than from the body. A super admin viewing a
 * branch's stock has no branch of their own to return from, and production sees
 * the other side of the movement on its own screens.
 *
 * So the modal is not registered for them at all, rather than registered and
 * hidden. A route that exists but can never be reached is the one that gets
 * linked to by accident later.
 */
export function makeStockStack(role: UserRole): React.ComponentType {
  const root = resolveTabScreen(role, 'Stock') ?? placeholderFor('Stock', NAV_LABELS.stock);

  /**
   * The ledger is branch-only for the same reason the return modal is, and it is
   * the server that decides: `GET /api/stock/history` scopes a branch role to
   * its own shop, requires an explicit `branchId` from a super admin, and
   * refuses everyone else outright with 403. Registering it for production or
   * finance would be a route whose only outcome is an error screen.
   *
   * A super admin is left out too, deliberately: they *may* read it, but only by
   * naming a branch, and this app has no branch picker on the Stock tab for
   * them. Adding the route without that picker is a screen that 400s.
   */
  const extra: TabStackScreen[] = isBranchRole(role)
    ? [
        {
          name: 'StockReturn',
          component: StockReturnScreen as ScreenComponent,
          presentation: 'modal',
        },
        { name: 'StockHistory', component: StockHistoryScreen as ScreenComponent },
        { name: 'StockDay', component: StockDayScreen as ScreenComponent },
      ]
    : [];

  return createTabStack('StockList', root, extra);
}

/** Memoised per role so a re-render does not remount the whole stack. */
export function useStockStack(role: UserRole): React.ComponentType {
  return useMemo(() => makeStockStack(role), [role]);
}
