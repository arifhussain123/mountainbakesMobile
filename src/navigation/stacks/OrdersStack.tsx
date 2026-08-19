import React, { useMemo } from 'react';
import type { UserRole } from '@/shared/types/user.types';
import { NAV_LABELS } from '../roleConfig';
import {
  placeholderFor,
  resolveCreateOrderScreen,
  resolveTabScreen,
} from '../screenRegistry';
import { createTabStack, type TabStackScreen } from './createTabStack';

/**
 * The Orders tab.
 *
 * This is the stack that earns the per-tab-stack rule. **New Order used to be a
 * top-level tab** — a create form sitting in the tab bar with no list behind it,
 * so submitting one left the user on an empty form with no way to see what they
 * had just created. It is now a modal presented over the order list: it slides
 * up, and dismissing it returns to the list that now contains the new row.
 *
 * The create screen is registered only for branch roles. The admin and
 * production order lists are different resources — customer orders and branch
 * demands on central production — and neither is created from this form.
 */
export function makeOrdersStack(role: UserRole): React.ComponentType {
  const root =
    resolveTabScreen(role, 'Orders') ?? placeholderFor('Orders', NAV_LABELS.orders);

  const extra: TabStackScreen[] = [];

  const CreateOrder = resolveCreateOrderScreen(role);
  if (CreateOrder) {
    extra.push({ name: 'CreateOrder', component: CreateOrder, presentation: 'modal' });
  }

  return createTabStack('OrdersList', root, extra);
}

/** Memoised per role so a re-render does not remount the whole stack. */
export function useOrdersStack(role: UserRole): React.ComponentType {
  return useMemo(() => makeOrdersStack(role), [role]);
}
