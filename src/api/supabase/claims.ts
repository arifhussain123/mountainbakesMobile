import { USER_ROLES, type UserRole } from '@/shared/types/user.types';

/**
 * Session claim extraction — pure, with no dependency on the Supabase client.
 *
 * Deliberately separate from client.ts: importing that module constructs a live
 * client with auto-refresh timers, which keeps a Jest worker alive and makes the
 * suite hang. Keeping the logic here lets the rules below be tested directly.
 *
 * Role and branch come from the JWT's `app_metadata` — claims the server sets
 * through the Supabase Admin API. They are never read from a form or a response
 * body, so a client cannot promote itself by editing a request.
 */

export interface SessionClaims {
  userId: string;
  email: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  mustChangePassword: boolean;
}

/**
 * Validated against `USER_ROLES` from the **mirrored** shared types, not a copy.
 *
 * This file used to hand-list the same eight values. Two lists of the Postgres
 * `user_role` enum is one too many: `src/shared/` is byte-identical to the
 * server's, so `USER_ROLES` moves when the enum moves, while a local copy only
 * moves when someone remembers. The failure that copy invites is quiet and
 * specific — a ninth role ships, the server issues it, and `isValidRole` rejects
 * a session the backend considers perfectly valid, so a real user cannot sign in
 * and the reason is a list nobody thought to update.
 */
export function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export interface ClaimSource {
  user: {
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
  };
}

/**
 * Read claims off a session.
 *
 * Returns null when the role is missing or unrecognised — the caller must then
 * sign the session back out rather than assume a default. The web client fails
 * closed the same way, deliberately: an earlier version defaulted to
 * branch_manager and handed unassigned accounts a working branch session.
 */
export function claimsFromSession(session: ClaimSource | null): SessionClaims | null {
  if (!session?.user) return null;

  const meta = session.user.app_metadata ?? {};
  const role = meta.role;
  if (!isValidRole(role)) return null;

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    role,
    branchId: typeof meta.branchId === 'string' ? meta.branchId : null,
    branchName: typeof meta.branchName === 'string' ? meta.branchName : null,
    mustChangePassword: meta.mustChangePassword === true,
  };
}
