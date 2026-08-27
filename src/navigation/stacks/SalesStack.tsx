import React, { useMemo } from 'react';

import type { UserRole } from '@/shared/types/user.types';
import { NAV_LABELS } from '../roleConfig';
import {
  placeholderFor,
  resolveNewSaleScreen,
  resolveTabScreen,
  type ScreenComponent,
} from '../screenRegistry';
import { createTabStack, type TabStackScreen } from './createTabStack';

/**
 * The Sales tab: the day's register, with the till presented over it.
 *
 * The same move `OrdersStack` made, for the same reason. The POS used to *be*
 * this tab, so the screen a branch opens most often could only ring up the next
 * sale — it could not answer "what have we taken", "was that one recorded", or
 * "which sale was Mrs Khan's", and a sale saved offline had nowhere to appear.
 * A create screen that is a resource's whole tab is a form with nothing to
 * return to.
 *
 * So `SalesList` is the register and `NewSale` is a modal over it: it rises, and
 * finishing a sale dismisses it back onto the list the sale just joined. The
 * outcome of the write travels with the dismissal as a route param — see
 * `SalesScreen` for why the banner belongs on the register rather than on the
 * form that is closing.
 *
 * Branch roles only. No other role has a Sales tab: the production counter's
 * till and the admin's cross-branch money view are More rows, split by
 * `resolveMoreScreen`, and neither writes through this form.
 */

export function makeSalesStack(role: UserRole): React.ComponentType {
  const extra: TabStackScreen[] = [];
  const NewSale = resolveNewSaleScreen(role);
  if (NewSale) {
    extra.push({ name: 'NewSale', component: NewSale, presentation: 'modal' });
  }

  const root: ScreenComponent =
    resolveTabScreen(role, 'Sales') ?? placeholderFor('Sales', NAV_LABELS.sales);

  return createTabStack('SalesList', root, extra);
}

/** Memoised per role so a re-render does not remount the whole stack. */
export function useSalesStack(role: UserRole): React.ComponentType {
  return useMemo(() => makeSalesStack(role), [role]);
}
