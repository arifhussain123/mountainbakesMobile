import type { UserRole } from '@/shared/types/user.types';

/**
 * Role predicates.
 *
 * This is navigation UX, NOT an authorization boundary. The API re-authorises
 * every request against the JWT; hiding a tab hides nothing from a determined
 * caller.
 */

export type RoleGroup = 'admin' | 'branch' | 'production' | 'finance';

const BRANCH_ROLES: readonly UserRole[] = ['branch_manager'];
const FINANCE_ROLES: readonly UserRole[] = [
  'finance_admin',
  'finance_manager',
  'accountant',
  'finance_auditor',
];

/** True for a shop-floor role — one scoped to its own branch. */
export function isBranchRole(role: UserRole): boolean {
  return BRANCH_ROLES.includes(role);
}

export function isFinanceRole(role: UserRole): boolean {
  return FINANCE_ROLES.includes(role);
}

export function roleGroupFor(role: UserRole): RoleGroup {
  if (role === 'super_admin') return 'admin';
  if (isBranchRole(role)) return 'branch';
  if (role === 'production_user') return 'production';
  return 'finance';
}

/**
 * Tab and More structure moved to `roleConfig.ts`.
 *
 * This file now holds only the role *predicates*, which are about who someone is
 * rather than what they can reach — `isBranchRole` in particular is a domain
 * rule, not a navigation one: it decides whether queries are scoped to the
 * caller's own branch. It is used by screens and hooks that have nothing to do
 * with navigation, which is why it did not move.
 */
