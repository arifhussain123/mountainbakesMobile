import type { SessionUser, UserRole } from '@/api/types';

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  branch_manager: 'Branch Manager',
  production_user: 'Production User',
  finance_admin: 'Finance Admin',
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  finance_auditor: 'Finance Auditor',
};

/** The server's role string as a person reads it; an unknown role is shown as-is rather than guessed at. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role as UserRole] ?? role;
}

/**
 * Mirrors the server's `BRANCH_ROLES`/`isBranchRole` (`backend/src/shared/types/user.types.ts`):
 * only these roles have their reads scoped to their own `branchId`. Every other
 * role's list endpoints return every branch.
 */
const BRANCH_SCOPED_ROLES: readonly string[] = ['branch_manager'];

/** "Committee Chowk" for a branch-scoped user, "All branches" for everyone the server lets see every branch. */
export function branchScopeLabel(user: Pick<SessionUser, 'role' | 'branchName'>): string {
  if (!BRANCH_SCOPED_ROLES.includes(user.role)) return 'All branches';
  return user.branchName ?? 'No branch assigned';
}
