import React, { useMemo } from 'react';

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

  const extra: TabStackScreen[] = isBranchRole(role)
    ? [
        {
          name: 'StockReturn',
          component: StockReturnScreen as ScreenComponent,
          presentation: 'modal',
        },
      ]
    : [];

  return createTabStack('StockList', root, extra);
}

/** Memoised per role so a re-render does not remount the whole stack. */
export function useStockStack(role: UserRole): React.ComponentType {
  return useMemo(() => makeStockStack(role), [role]);
}
