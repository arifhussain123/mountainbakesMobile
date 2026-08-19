import type { UserRole } from '@/shared/types/user.types';

/**
 * Human labels for the eight `user_role` values.
 *
 * Deliberately NOT in `src/shared/`. That directory is a byte-identical mirror
 * of the server's and the web client's copies, so anything added there has to be
 * added to two other repositories by hand or `npm run shared:check` fails. These
 * strings are presentation, only this app needs them, and they carry no
 * contract — so they live here.
 *
 * Keys are the enum values verbatim (see docs/mobile-architecture-audit.md §3);
 * never invent one.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  branch_manager: 'Branch Manager',
  branch_user: 'Branch Staff',
  production_user: 'Production',
  finance_admin: 'Finance Admin',
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  finance_auditor: 'Finance Auditor',
};

/** Falls back to the raw value rather than throwing on an unknown role. */
export function roleLabel(role: UserRole | string): string {
  return USER_ROLE_LABELS[role as UserRole] ?? role;
}
