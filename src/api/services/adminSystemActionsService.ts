import { apiClient } from '../client';
import type {
  AdminResetPasswordInput,
  AdminResetPasswordResult,
  BackupRunResponse,
  BackupVerifyResult,
  ChangeUserEmailInput,
  CreateUserInput,
  RevokeSessionResult,
  UpdateUserInput,
} from '../types';

/**
 * Super Admin's system write actions — the web `UsersPage` (+ its Edit, Reset
 * Password and Change Email dialogs), `RevokeSessionDialog` and
 * `DatabaseBackupPage`, same endpoints and bodies. Every route is behind
 * `requireRole('super_admin')`. Passwords travel in the body only and are
 * never logged.
 */

// ─── Users (web /users) ─────────────────────────────────────────────────────

/** `POST /api/users` — a taken email or username is a 409. */
export async function createUser(input: CreateUserInput): Promise<{ id: string; email: string; displayName: string }> {
  return apiClient.post<{ id: string; email: string; displayName: string }>('/users', input);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/users/${id}`, input);
}

/** `DELETE /api/users/:id` — the web's Deactivate: status `inactive`, the account stays. */
export async function deactivateUser(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/users/${id}`);
}

export async function activateUser(id: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/users/${id}/activate`);
}

/** `DELETE /api/users/:id/permanent` — the account is removed; records they created are kept. Refuses your own account. */
export async function deleteUserPermanently(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/users/${id}/permanent`);
}

export async function resetUserPassword(id: string, input: AdminResetPasswordInput): Promise<AdminResetPasswordResult> {
  return apiClient.post<AdminResetPasswordResult>(`/users/${id}/reset-password`, input);
}

export async function changeUserEmail(id: string, input: ChangeUserEmailInput): Promise<{ success: boolean; email: string; previousEmail: string }> {
  return apiClient.post<{ success: boolean; email: string; previousEmail: string }>(`/users/${id}/change-email`, input);
}

// ─── Security (web /security) ───────────────────────────────────────────────

/** `POST /api/login-history/:id/revoke` — the body carries `reason` only when one was typed. */
export async function revokeSession(sessionId: string, reason?: string): Promise<RevokeSessionResult> {
  return apiClient.post<RevokeSessionResult>(`/login-history/${encodeURIComponent(sessionId)}/revoke`, reason ? { reason } : {});
}

/**
 * `POST /api/login-history/revoke-all` — every session for one account. When
 * the account is the caller's own, the server spares the caller's session from
 * the token; the web sends no `keepSessionId` and neither does this.
 */
export async function revokeAllSessions(userId: string, reason?: string): Promise<RevokeSessionResult> {
  return apiClient.post<RevokeSessionResult>('/login-history/revoke-all', { userId, ...(reason ? { reason } : {}) });
}

// ─── Database Backup (web /database-backup) ─────────────────────────────────

/** `POST /api/admin/backups/run` — the web's "Create backup" only ever sends `{ type: 'manual' }`. */
export async function runManualBackup(): Promise<BackupRunResponse> {
  return apiClient.post<BackupRunResponse>('/admin/backups/run', { type: 'manual' });
}

/** Re-checks one backup against S3; a failed check is a 200 with `ok: false`. */
export async function verifyBackup(id: string): Promise<BackupVerifyResult> {
  return apiClient.post<BackupVerifyResult>(`/admin/backups/${encodeURIComponent(id)}/verify`);
}
