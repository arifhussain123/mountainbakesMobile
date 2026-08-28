import React, { useMemo } from 'react';

import { DailySalesScreen } from '@/features/reports';
import { SalesVsExpensesScreen } from '@/features/reports';
import { TopProductsScreen } from '@/features/reports';
import type { UserRole } from '@/shared/types/user.types';
import { NAV_LABELS } from '../roleConfig';
import { placeholderFor, resolveTabScreen, type ScreenComponent } from '../screenRegistry';
import { createTabStack, type TabStackScreen } from './createTabStack';
import { REPORT_DETAIL_SCREENS } from '../types';

/**
 * The three statements reached from the Reports index, as components.
 *
 * Keyed by the names in `REPORT_DETAIL_SCREENS` so this file and `MoreStack`
 * register the same set from the same list — Reports is a tab for the admin and
 * a More row for a branch manager, and the two navigators must not drift into
 * offering different statements to the two roles.
 */
export const REPORT_DETAIL_COMPONENTS: Record<string, ScreenComponent> = {
  DailySales: DailySalesScreen as unknown as ScreenComponent,
  TopProducts: TopProductsScreen as unknown as ScreenComponent,
  SalesVsExpenses: SalesVsExpensesScreen as unknown as ScreenComponent,
};

/**
 * The Reports tab.
 *
 * ---------------------------------------------------------------------------
 * Why this needs its own file when five other tabs share the factory
 * ---------------------------------------------------------------------------
 * `createTabStack` covers a tab whose stack is just a root, and it covered this
 * one until Reports grew statements to push. The rule stated in that file
 * applies here: the moment a tab has a real second screen it gets its own
 * factory, and the shared one stops being used for it.
 *
 * ---------------------------------------------------------------------------
 * The statements are gated by the index, not by role
 * ---------------------------------------------------------------------------
 * There is no per-screen capability check below, and there does not need to be:
 * every one of the three reads `GET /api/reports/summary`, which is the same
 * endpoint the index reads and is mounted behind
 * `requireRole('super_admin', 'branch_manager')`. A role that cannot open the
 * index cannot reach these, because the index is the only way in. A
 * `branch_user` never gets the tab or the More row at all — `roleConfig`'s
 * `reports` capability mirrors that same `requireRole` — so the statements are
 * unreachable for exactly the accounts the server would 403.
 *
 * `SalesVsExpenses` additionally reads `GET /api/expenses`, which both admitted
 * roles may read for their own scope, and degrades to a message rather than an
 * error screen if that half fails.
 */
export function makeReportsStack(role: UserRole): React.ComponentType {
  const root = resolveTabScreen(role, 'Reports') ?? placeholderFor('Reports', NAV_LABELS.reports);

  /**
   * Only when the index resolved to a real screen.
   *
   * A placeholder has nothing to navigate onward from, so registering the
   * statements behind one would put three routes in the navigator that only a
   * deep link could ever land on — which is precisely the unreachable route
   * `MoreStack` avoids for the same reason.
   */
  const extra: TabStackScreen[] = resolveTabScreen(role, 'Reports')
    ? REPORT_DETAIL_SCREENS.flatMap(name => {
        const component = REPORT_DETAIL_COMPONENTS[name];
        return component ? [{ name, component }] : [];
      })
    : [];

  return createTabStack('ReportsIndex', root, extra);
}

/** Memoised per role so a re-render does not remount the whole stack. */
export function useReportsStack(role: UserRole): React.ComponentType {
  return useMemo(() => makeReportsStack(role), [role]);
}
