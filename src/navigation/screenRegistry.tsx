import React from 'react';
import type { UserRole } from '@/shared/types/user.types';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { ProductsScreen } from '@/screens/catalog/ProductsScreen';
import { StockScreen } from '@/screens/catalog/StockScreen';
import { BranchDashboardScreen } from '@/screens/branch/BranchDashboardScreen';
import { ExpensesScreen } from '@/screens/branch/ExpensesScreen';
import { NewOrderScreen } from '@/screens/branch/NewOrderScreen';
import { SalesScreen } from '@/screens/branch/SalesScreen';
import { NewSaleScreen } from '@/screens/branch/NewSaleScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { AdminExpensesScreen } from '@/screens/admin/AdminExpensesScreen';
import { AdminSalesScreen } from '@/screens/admin/AdminSalesScreen';
import { CategoriesScreen } from '@/screens/admin/CategoriesScreen';
import { OrdersScreen } from '@/screens/admin/OrdersScreen';
import { ReportsScreen } from '@/screens/admin/ReportsScreen';
import { SettingsScreen } from '@/screens/admin/SettingsScreen';
import { UsersScreen } from '@/screens/admin/UsersScreen';
import { FinanceDashboardScreen } from '@/screens/finance/FinanceDashboardScreen';
import { LedgerScreen } from '@/screens/finance/LedgerScreen';
import { ProductionDashboardScreen } from '@/screens/production/ProductionDashboardScreen';
import { BranchDemandsScreen } from '@/screens/branch/BranchDemandsScreen';
import { EventsScreen } from '@/screens/events/EventsScreen';
import { BranchReturnsScreen } from '@/screens/branch/BranchReturnsScreen';
import { ProductionSalesScreen } from '@/screens/production/ProductionSalesScreen';
import { ProductionReturnsScreen } from '@/screens/production/ProductionReturnsScreen';
import { HelpScreen } from '@/screens/support/HelpScreen';
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
  // The two production-floor stages. Separate resources, separate status enums
  // — see PreparationStackParamList in types.ts.
  Preparation: { phase: 'Phase 7', endpoint: 'GET /api/production/queue' },
  Delivery: { phase: 'Phase 7', endpoint: 'GET /api/production-orders' },
  // Only ever rendered for the production account now: the admin reaches
  // Reports as a tab and the branch manager as a More row, and both resolve to
  // the real screen. So this names the PRODUCTION report resource, not
  // `/api/reports` — which is `requireRole('super_admin', 'branch_manager')`
  // and would 403 the account reading this placeholder.
  Reports: { phase: 'Phase 9', endpoint: 'GET /api/production-reports' },
  /**
   * NO SERVER RESOURCE EXISTS.
   *
   * This entry used to promise `GET /api/vendors`. There is no vendors router,
   * no service, no table and no migration — `grep -ri vendor` across the server
   * returns nothing at all. Naming an endpoint that does not exist sends the
   * next person to look for a bug in the client.
   *
   * The row stays visible because the feature is a real gap worth seeing, but
   * building the screen means building the resource on the server first: this
   * app is a third client of that API and never reaches Supabase directly.
   */
  Vendors: { phase: 'a server resource that does not exist yet' },
  Branches: { phase: 'Phase 9', endpoint: 'GET /api/branches' },
  Production: { phase: 'Phase 9', endpoint: 'GET /api/production-orders' },
  Profile: { phase: 'Phase 9' },
  PartnerExpenses: { phase: 'Phase 9', endpoint: 'GET /api/finance/partner-expenses' },
  Settings: { phase: 'Phase 9' },
  // No endpoint named on purpose: there is no inbox resource on the server and
  // no notification library in the app. The placeholder should not print an API
  // path that does not exist — see docs/navigation.md.
  Notifications: { phase: 'Phase 9' },
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
      // A branch's "Orders" are its demands on central production — the other
      // side of the same workflow the production counter reviews, not a second
      // one. Customer orders are the admin's list above.
      if (branch) return BranchDemandsScreen;
      return null;
    case 'Products':
      return ProductsScreen;
    case 'Stock':
      if (production) return ProductionStockScreen;
      return StockScreen;
    case 'Sales':
      // The day's register. The till is `NewSale`, a modal inside this tab's
      // stack — see `SalesStack`.
      return branch ? SalesScreen : null;
    case 'Preparation':
    case 'Delivery':
      // Production's two floor stages. Neither is built; both render a
      // placeholder naming the endpoint they are waiting on, so an unbuilt
      // stage is never mistaken for an empty queue.
      return null;
    case 'Reports':
      // Admin only. Finance shares the tab NAME but not the resource —
      // `/api/finance/reports` is a different endpoint behind a different gate,
      // so it falls through to its own placeholder rather than borrowing this
      // screen and 403ing on first load.
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
  const admin = role === 'super_admin';
  switch (route) {
    case 'Users':
    case 'Categories':
      // Every route behind both is `requireRole('super_admin')`, and only the
      // admin More list carries them. Gated here as well so a deep link cannot
      // land another role on a screen that would 403 on first load.
      if (!admin) return null;
      return route === 'Users' ? UsersScreen : CategoriesScreen;
    case 'Settings':
      // `GET /api/settings` is open to any signed-in account, but `PUT` is
      // super_admin only — and this screen exists to edit. Other roles keep the
      // placeholder rather than a form whose save button always fails.
      return admin ? SettingsScreen : null;
    case 'Sales':
      // Three different screens have worn this word, and only two of them are
      // reachable from More. A branch reaches its own Sales as a TAB — the
      // day's register, with the till as a modal inside it — never from here.
      //
      // Production's is the counter till, and it is a different RESOURCE rather
      // than a different view of one: `POST /api/orders/production-sale` sells
      // out of the central pool, offers a `staff` method that takes no money,
      // and refuses this account the branch POS outright. The admin's is a money
      // view across every branch and writes nothing.
      if (role === 'production_user') return ProductionSalesScreen;
      return admin ? AdminSalesScreen : null;
    case 'Expenses':
      // Two different screens behind one word. A branch RECORDS an expense —
      // `POST /api/expenses` takes the branch from the caller's own JWT. An
      // admin carries no branchId, so there is nothing for an admin-entered
      // expense to belong to; the admin screen is the audit across branches.
      if (branch) return ExpensesScreen;
      return admin ? AdminExpensesScreen : null;
    case 'Stock':
      // Production reaches Stock from More rather than a tab, and it must land
      // on its own screen: `ProductionStockScreen` reads the central pool,
      // `StockScreen` reads a branch's shelf. Same word, different balance.
      return role === 'production_user' ? ProductionStockScreen : StockScreen;
    case 'Returns':
      /**
       * One word, two routes, and the gate is what separates them.
       *
       * `GET /api/production-returns` is `requireRole('super_admin',
       * 'production_user')` on the router itself — a branch is refused the read
       * as well as the review — and it is a work queue over 30 business days.
       * `GET /api/stock/returns` is `requireRole('super_admin',
       * ...BRANCH_ROLES)`, scoped off the JWT, and is a shop's own record over
       * 90 days with no actions on it. Same table, different question.
       *
       * Gated here as well as in `roleConfig` so a deep link cannot land either
       * role on the other's screen and 403 on first load.
       */
      if (isBranchRole(role)) return BranchReturnsScreen;
      return role === 'production_user' || admin ? ProductionReturnsScreen : null;
    case 'Events':
      // Every role, deliberately. The endpoint is authenticated-only and scopes
      // its own rows, so there is nothing here for the client to gate — and
      // gating it would hide from a branch the events it is being asked to bake
      // for. Read-only: creating and confirming an event is `super_admin` and
      // lives in the web client.
      return EventsScreen;
    case 'Help':
      // Also every role, and for the same reason: `GET /api/support` returns
      // the caller's OWN tickets whoever they are. Raising one is narrower —
      // `requireRole('branch_manager', 'production_user')` — and the screen
      // asks before it offers the button rather than letting a submit 403.
      return HelpScreen;
    case 'Reports':
      // `/api/reports` is mounted behind
      // `requireRole('super_admin', 'branch_manager')`, and a branch manager is
      // auto-scoped to their own branch server-side without sending a
      // `branchId` — so the admin's screen shows one shop unmodified. A
      // `branch_user` would get a 403 from every route under it, which is why
      // `roleConfig` gates the row and this call never sees that role.
      //
      // Production's reports are a narrower resource that is not built, so it
      // stays a placeholder rather than being handed an admin screen.
      return role === 'branch_manager' ? ReportsScreen : null;
    default:
      return null;
  }
}

/** The branch create-order form, reached as a modal from OrdersStack. */
export function resolveCreateOrderScreen(role: UserRole): ScreenComponent | null {
  return isBranchRole(role) ? NewOrderScreen : null;
}

/**
 * The till, presented as a modal over the branch register.
 *
 * Branch roles only, and it is the same screen for both: a `branch_user` is a
 * shift account carrying its manager's `branchId`, so it sells from the same
 * shop through the same endpoint. The production counter's till is a different
 * resource (`POST /api/orders/production-sale`, its own pool, a `staff` method
 * that takes no money) and is reached from its own More row.
 */
export function resolveNewSaleScreen(role: UserRole): ScreenComponent | null {
  return isBranchRole(role) ? NewSaleScreen : null;
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
