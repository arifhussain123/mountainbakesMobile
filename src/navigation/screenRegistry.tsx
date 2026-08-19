import React from 'react';
import type { UserRole } from '@/shared/types/user.types';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { ProductsScreen } from '@/screens/catalog/ProductsScreen';
import { StockScreen } from '@/screens/catalog/StockScreen';
import { BranchDashboardScreen } from '@/screens/branch/BranchDashboardScreen';
import { ExpensesScreen } from '@/screens/branch/ExpensesScreen';
import { NewOrderScreen } from '@/screens/branch/NewOrderScreen';
import { SalesScreen } from '@/screens/branch/SalesScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { OrdersScreen } from '@/screens/admin/OrdersScreen';
import { ReportsScreen } from '@/screens/admin/ReportsScreen';
import { FinanceDashboardScreen } from '@/screens/finance/FinanceDashboardScreen';
import { LedgerScreen } from '@/screens/finance/LedgerScreen';
import { ProductionDashboardScreen } from '@/screens/production/ProductionDashboardScreen';
import { ProductionOrdersScreen } from '@/screens/production/ProductionOrdersScreen';
import { ProductionStockScreen } from '@/screens/production/ProductionStockScreen';
import { isBranchRole, isFinanceRole } from './roleNavigation';
import type { AppTabName, MoreRouteName } from './types';

/**
 * (role, route) → screen component.
 *
 * This used to live inside `AppNavigator`, which meant the navigator imported
 * the entire screen tree and could not be reasoned about without it. It is here
 * so the routing table is one readable thing, and so the stacks below can ask
 * for a screen without each importing twenty modules.
 *
 * **Route names are shared across roles; screens are not interchangeable.**
 * That is the whole reason this keys on the role as well as the name:
 *
 *   - "Sales" at the production counter posts to a different endpoint and
 *     permits a `staff` payment method — an unpaid hand-out requiring a comment —
 *     that a branch sale must never offer.
 *   - "Orders" is customer orders for the admin and branch demands on central
 *     production for the production account. Different resources, one word.
 *   - "Dashboard" is four different screens.
 *
 * Returning `null` means "this role has no screen for this route yet" and the
 * caller renders a placeholder naming the phase, so an unbuilt screen is never
 * mistaken for an empty one.
 */

/** What each unbuilt route is waiting on, so the placeholder can say so. */
const SCREEN_PLAN: Partial<Record<string, { phase: string; endpoint?: string }>> = {
  Orders: { phase: 'Phase 8', endpoint: 'GET /api/orders' },
  OrderDetail: { phase: 'Phase 8', endpoint: 'GET /api/orders/:id' },
  Closing: { phase: 'Phase 6', endpoint: 'GET /api/business-day' },
  Income: { phase: 'Phase 8', endpoint: 'GET /api/finance/income' },
  // Finance's Expenses is the web client's Finance Entries screen; there is no
  // /api/finance/expenses resource.
  Expenses: { phase: 'Phase 8', endpoint: 'GET /api/finance/income/entries' },
  Sales: { phase: 'Phase 9', endpoint: 'POST /api/production-sales' },
  Users: { phase: 'Phase 9', endpoint: 'GET /api/users' },
  Categories: { phase: 'Phase 9', endpoint: 'GET /api/categories' },
  Vendors: { phase: 'Phase 9', endpoint: 'GET /api/vendors' },
  Branches: { phase: 'Phase 9', endpoint: 'GET /api/branches' },
  PartnerExpenses: { phase: 'Phase 9', endpoint: 'GET /api/finance/partner-expenses' },
  Settings: { phase: 'Phase 9' },
  Help: { phase: 'Phase 9' },
};

export type ScreenComponent = React.ComponentType<Record<string, never>>;

export function resolveTabScreen(role: UserRole, route: AppTabName): ScreenComponent | null {
  const branch = isBranchRole(role);
  const production = role === 'production_user';
  const admin = role === 'super_admin';
  const finance = isFinanceRole(role);

  switch (route) {
    case 'Home':
      if (branch) return BranchDashboardScreen;
      if (production) return ProductionDashboardScreen;
      if (admin) return AdminDashboardScreen;
      if (finance) return FinanceDashboardScreen;
      return null;
    case 'Orders':
      if (production) return ProductionOrdersScreen;
      if (admin) return OrdersScreen;
      // Branch order list is not built; New Order (the create half) is.
      return null;
    case 'Products':
      return ProductsScreen;
    case 'Stock':
      if (production) return ProductionStockScreen;
      return StockScreen;
    case 'Sales':
      return branch ? SalesScreen : null;
    case 'Reports':
      return admin ? ReportsScreen : null;
    case 'Ledger':
      return finance ? LedgerScreen : null;
    case 'Expenses':
      // Branch shop expenses only. Finance's Expenses is a different resource
      // with its own approval model, and a finance account carries no branchId —
      // this form would fail on save.
      return branch ? ExpensesScreen : null;
    case 'Income':
    case 'More':
      return null;
    default:
      return null;
  }
}

export function resolveMoreScreen(role: UserRole, route: MoreRouteName): ScreenComponent | null {
  const branch = isBranchRole(role);
  switch (route) {
    case 'Expenses':
      return branch ? ExpensesScreen : null;
    default:
      return null;
  }
}

/** The branch create-order form, reached as a modal from OrdersStack. */
export function resolveCreateOrderScreen(role: UserRole): ScreenComponent | null {
  return isBranchRole(role) ? NewOrderScreen : null;
}

/**
 * A placeholder bound to a route, so an unbuilt destination still renders
 * something honest instead of a blank screen.
 */
export function placeholderFor(route: string, title: string): ScreenComponent {
  const plan = SCREEN_PLAN[route] ?? { phase: 'a later phase' };
  function Placeholder(): React.ReactElement {
    return <PlaceholderScreen title={title} phase={plan.phase} endpoint={plan.endpoint} />;
  }
  Placeholder.displayName = `Placeholder(${route})`;
  return Placeholder as ScreenComponent;
}
