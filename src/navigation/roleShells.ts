import type { UserRole } from '@/api/types';
import { useAuthStore } from '@/state';
import { computeBranchBadges, computeNoBadges, computeProductionBadges, type NavBadges } from './navBadgeCounts';
import { BRANCH_NAV_ITEMS, PRODUCTION_NAV_ITEMS, type NavItem } from './navItems';
import { Routes } from './routes';
import { BRANCH_TAB_ITEMS, PRODUCTION_TAB_ITEMS, type TabItem } from './tabItems';

/** The root-stack screen holding a role's whole app (its drawer, tabs and stacks). */
export type ShellRoute = typeof Routes.DRAWER | typeof Routes.PRODUCTION_DRAWER | typeof Routes.FINANCE_DRAWER | typeof Routes.UNSUPPORTED_ROLE;

export interface RoleShell {
  route: ShellRoute;
  /** Drawer menu. Empty for a shell that draws its own (Finance). */
  navItems: NavItem[];
  /** Notch tab bar slots. Empty for a shell that uses its own tab bar (Finance). */
  tabItems: TabItem[];
  /** Reads this shell's badge counts from the query cache — see `navBadgeCounts.ts`. */
  computeBadges: () => NavBadges;
}

const FINANCE_SHELL: RoleShell = { route: Routes.FINANCE_DRAWER, navItems: [], tabItems: [], computeBadges: computeNoBadges };
const UNSUPPORTED_SHELL: RoleShell = { route: Routes.UNSUPPORTED_ROLE, navItems: [], tabItems: [], computeBadges: computeNoBadges };

/**
 * Every role-dependent navigation decision, keyed by the role the server put on
 * the session — the mobile twin of the web's `NAV_MAP`/`PRIMARY_NAV`. The server
 * has no finer permission list (each endpoint is `requireRole(...)` on that one
 * string), so this map is the whole of it, and nothing below it checks a role.
 *
 * A role missing here (super_admin) gets the explicit "not built for this role"
 * screen rather than borrowing a shell it was never designed for.
 */
export const ROLE_SHELLS: Partial<Record<UserRole, RoleShell>> = {
  branch_manager: { route: Routes.DRAWER, navItems: BRANCH_NAV_ITEMS, tabItems: BRANCH_TAB_ITEMS, computeBadges: computeBranchBadges },
  production_user: {
    route: Routes.PRODUCTION_DRAWER,
    navItems: PRODUCTION_NAV_ITEMS,
    tabItems: PRODUCTION_TAB_ITEMS,
    computeBadges: computeProductionBadges,
  },
  finance_admin: FINANCE_SHELL,
  finance_manager: FINANCE_SHELL,
  accountant: FINANCE_SHELL,
  finance_auditor: FINANCE_SHELL,
};

export function getRoleShell(role: string | null | undefined): RoleShell {
  return (role && ROLE_SHELLS[role as UserRole]) || UNSUPPORTED_SHELL;
}

/** The signed-in user's shell — what the drawer and the notch tab bar render. */
export function useRoleShell(): RoleShell {
  const role = useAuthStore((s) => s.user?.role);
  return getRoleShell(role);
}
