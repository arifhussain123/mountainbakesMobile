import type { SessionUser, UserRole } from '@/api/types';
import { branchScopeLabel } from '@/shared/utils';
import { useAuthStore } from '@/state';
import { computeBranchBadges, computeFinanceBadges, computeNoBadges, computeProductionBadges, type NavBadges } from './navBadgeCounts';
import { BRANCH_NAV_ITEMS, FINANCE_NAV_ITEMS, PRODUCTION_NAV_ITEMS, type NavItem } from './navItems';
import { Routes } from './routes';
import { BRANCH_TAB_ITEMS, FINANCE_TAB_ITEMS, PRODUCTION_TAB_ITEMS, type TabItem } from './tabItems';

/** The root-stack screen holding a role's whole app (its drawer, tabs and stacks). */
export type ShellRoute = typeof Routes.DRAWER | typeof Routes.PRODUCTION_DRAWER | typeof Routes.FINANCE_DRAWER | typeof Routes.UNSUPPORTED_ROLE;

export interface RoleShell {
  route: ShellRoute;
  /** Drawer menu. */
  navItems: NavItem[];
  /** Notch tab bar slots. */
  tabItems: TabItem[];
  /** Reads this shell's badge counts from the query cache — see `navBadgeCounts.ts`. */
  computeBadges: () => NavBadges;
  /** The accent line under the drawer header: whose data this user is looking at. */
  contextLine: (user: Pick<SessionUser, 'role' | 'branchName'>) => string;
}

const NO_MENU = { navItems: [], tabItems: [], computeBadges: computeNoBadges, contextLine: () => '' };
// The four finance roles share one menu across every branch (only
// `branch_manager` is branch-scoped on the server).
const FINANCE_SHELL: RoleShell = {
  route: Routes.FINANCE_DRAWER,
  navItems: FINANCE_NAV_ITEMS,
  tabItems: FINANCE_TAB_ITEMS,
  computeBadges: computeFinanceBadges,
  contextLine: (user) => `Finance · ${branchScopeLabel(user)}`,
};
const UNSUPPORTED_SHELL: RoleShell = { route: Routes.UNSUPPORTED_ROLE, ...NO_MENU };

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
  branch_manager: {
    route: Routes.DRAWER,
    navItems: BRANCH_NAV_ITEMS,
    tabItems: BRANCH_TAB_ITEMS,
    computeBadges: computeBranchBadges,
    contextLine: branchScopeLabel,
  },
  // No branch and no production-unit concept on the server: a production_user
  // reads every branch (only `branch_manager` is branch-scoped), so the line
  // says exactly that.
  production_user: {
    route: Routes.PRODUCTION_DRAWER,
    navItems: PRODUCTION_NAV_ITEMS,
    tabItems: PRODUCTION_TAB_ITEMS,
    computeBadges: computeProductionBadges,
    contextLine: (user) => `Production · ${branchScopeLabel(user)}`,
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
