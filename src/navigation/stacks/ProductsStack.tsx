import React, { useMemo } from 'react';

import { PriceChangeScreen } from '@/screens/catalog/PriceChangeScreen';
import { PriceHistoryScreen } from '@/screens/catalog/PriceHistoryScreen';
import { ProductDetailScreen } from '@/screens/catalog/ProductDetailScreen';
import { ProductFormScreen } from '@/screens/catalog/ProductFormScreen';
import type { UserRole } from '@/shared/types/user.types';
import { NAV_LABELS } from '../roleConfig';
import { placeholderFor, resolveTabScreen, type ScreenComponent } from '../screenRegistry';
import { createTabStack, type TabStackScreen } from './createTabStack';

/**
 * The Products tab.
 *
 * Its own file rather than the `createTabStack` factory because it has four
 * screens behind the list, which is the threshold the factory's own note names:
 * a tab with a real second screen gets a file.
 *
 * ---------------------------------------------------------------------------
 * Why the create form and the price form are modals
 * ---------------------------------------------------------------------------
 * Both are short administrative acts that end by returning to what you were
 * looking at. A modal rising over the list says "this is a detour" and dismisses
 * back to it; a pushed card would leave the list one back-press further away and
 * make "cancel" look like "go back a page".
 *
 * Detail and history are cards: they are places you *go*, and you may want to
 * move between them.
 *
 * ---------------------------------------------------------------------------
 * The whole stack is registered for every role that has a Products tab
 * ---------------------------------------------------------------------------
 * Today that is `super_admin` alone, and the write screens check the `admin`
 * capability before offering anything. Registration is not authorization: every
 * endpoint behind these screens is `requireRole('super_admin')` on the server,
 * and that is the boundary. Hiding a button only decides what is convenient to
 * reach.
 */
export function makeProductsStack(role: UserRole): React.ComponentType {
  const root =
    resolveTabScreen(role, 'Products') ?? placeholderFor('Products', NAV_LABELS.products);

  const extra: TabStackScreen[] = [
    { name: 'ProductDetail', component: ProductDetailScreen as ScreenComponent },
    { name: 'PriceHistory', component: PriceHistoryScreen as ScreenComponent },
    {
      name: 'ProductForm',
      component: ProductFormScreen as ScreenComponent,
      presentation: 'modal',
    },
    {
      name: 'PriceChange',
      component: PriceChangeScreen as ScreenComponent,
      presentation: 'modal',
    },
  ];

  return createTabStack('ProductsList', root, extra);
}

/** Memoised per role so a re-render does not remount the whole stack. */
export function useProductsStack(role: UserRole): React.ComponentType {
  return useMemo(() => makeProductsStack(role), [role]);
}
