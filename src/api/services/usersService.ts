import type {
  AdminResetPasswordInput,
  CreateUserInput,
  UpdateUserInput,
} from '@/shared/schemas/user.schemas';
import type { User, UserRole, UserStatus } from '@/shared/types/user.types';
import { api } from '../client';

/**
 * User administration.
 *
 * Every route under `/api/users` is mounted behind
 * `router.use(authenticate, requireRole('super_admin'))` — one gate on the
 * router rather than per handler, so there is no route here a non-admin can
 * reach. Hiding these screens from other roles in the app is convenience; the
 * boundary is on the server and is re-decided on every request.
 *
 * ---------------------------------------------------------------------------
 * Deactivation, not deletion
 * ---------------------------------------------------------------------------
 * `DELETE /api/users/:id` does **not** delete. It sets `status = 'inactive'` and
 * bans the Supabase auth user for ~100 years, which blocks sign-in while leaving
 * the row — and every order, expense and audit entry that references it —
 * intact. `POST /:id/activate` is the exact inverse (`ban_duration: 'none'`).
 *
 * The method name here says what it does rather than what the verb is, because
 * an admin pressing something called "delete" and finding the account still in
 * the list is how a real account gets left signed-in-able by someone who assumed
 * it was gone.
 */

export interface UserFilters {
  status?: UserStatus;
  role?: UserRole;
}

export async function getUsers(filters: UserFilters = {}): Promise<User[]> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.role) params.role = filters.role;

  const data = await api.get<{ users: User[]; total: number }>('/api/users', { params });
  return data.users ?? [];
}

export async function getUser(id: string): Promise<User> {
  const data = await api.get<{ user: User }>(`/api/users/${id}`);
  return data.user;
}

export async function createUser(payload: CreateUserInput): Promise<{ id: string }> {
  return api.post<{ id: string }>('/api/users', payload);
}

export async function updateUser(id: string, payload: UpdateUserInput): Promise<void> {
  await api.put<{ success: boolean }>(`/api/users/${id}`, payload);
}

/**
 * Block or restore sign-in.
 *
 * Two different routes rather than one flag: the server bans the auth user on
 * deactivate and lifts the ban on activate, and those are not the same call.
 */
export async function setUserActive(id: string, active: boolean): Promise<void> {
  if (active) {
    await api.post<{ success: boolean }>(`/api/users/${id}/activate`, {});
    return;
  }
  await api.delete<{ success: boolean }>(`/api/users/${id}`);
}

export interface ResetPasswordResult {
  /** Present only when `generateTemp` was asked for. Shown once, never stored. */
  tempPassword?: string;
  emailSent?: boolean;
}

/**
 * Reset another account's password.
 *
 * The schema refuses a request that does neither — `generateTemp` and
 * `sendEmail` are both optional individually but at least one is required, so a
 * form that submits both false is rejected by the server rather than silently
 * doing nothing.
 *
 * A generated temporary password comes back in the response and is the only
 * time it exists in readable form. It is shown once and never written to
 * storage: this device holds business records, and a password that outlives the
 * dialog is a credential sitting in an unencrypted database.
 */
export async function resetUserPassword(
  id: string,
  input: AdminResetPasswordInput,
): Promise<ResetPasswordResult> {
  return api.post<ResetPasswordResult>(`/api/users/${id}/reset-password`, input);
}
