/**
 * Every role the app recognises.
 *
 * The four `finance_*` / `accountant` values were added by migration 51 for the
 * Finance Ledger module. They are ordinary members of the `user_role` Postgres
 * enum rather than a parallel claim, so RLS
 * (`app.jwt_role()`), the API's `requireRole()` and the client's RouteGuard all
 * keep working unchanged.
 *
 * ORDER MATTERS to nothing here, but the VALUES must stay identical to the
 * Postgres enum — a drift surfaces as a runtime 22P02 on the first insert.
 */
export type UserRole =
  | 'super_admin'
  | 'branch_manager'
  | 'production_user'
  | 'finance_admin'
  | 'finance_manager'
  | 'accountant'
  | 'finance_auditor';

export const USER_ROLES = [
  'super_admin',
  'branch_manager',
  'production_user',
  'finance_admin',
  'finance_manager',
  'accountant',
  'finance_auditor',
] as const satisfies readonly UserRole[];

/**
 * The roles that work a shop floor. Today that is only `branch_manager`; the
 * list is kept so the branch-scoping test (`isBranchRole`) has one definition.
 *
 * Use this for the branch-scoping test and nothing broader: gates that only a
 * manager passes (Help Desk, Reports, user management, settings) keep naming
 * `'branch_manager'` literally so the grant stays visible at the call site.
 */
export const BRANCH_ROLES = ['branch_manager'] as const satisfies readonly UserRole[];

/**
 * True for a shop-floor role. Replaces `role === 'branch_manager'` wherever
 * that test meant "scope this to the caller's own branch" rather than "only a
 * manager may do this".
 *
 * Takes a loose `string` for the same reason `financeCan` does: the client reads
 * the role off a JWT claim, where it is whatever Supabase put there, and the
 * guard that has to cope with an unrecognised value is exactly the caller that
 * must not be forced to cast one in.
 */
export function isBranchRole(role: UserRole | string | null | undefined): boolean {
  return (BRANCH_ROLES as readonly string[]).includes(role ?? '');
}

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  /**
   * Mountain Bakes staff ID — `MBU-000125`. Allocated by Postgres on insert
   * (migration 98) and never reassigned, so it is safe to print, quote and
   * search by. `MBU-`, not `MB-`: `MB-######` has meant a sales order since
   * migration 03 and one namespace cannot mean two things.
   */
  userCode: string;
  email: string;
  displayName: string;
  phone: string;
  username: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Password-recovery / admin-reset management
  mustChangePassword?: boolean;
  lastPasswordReset?: string | null;
  passwordResetBy?: string | null;
  passwordResetByName?: string | null;
}

export interface UserCustomClaims {
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
}

export interface CreateUserPayload {
  email: string;
  displayName: string;
  phone: string;
  username: string;
  password: string;
  role: UserRole;
  branchId: string | null;
}

export interface UpdateUserPayload {
  displayName?: string;
  phone?: string;
  role?: UserRole;
  branchId?: string | null;
  status?: UserStatus;
}
