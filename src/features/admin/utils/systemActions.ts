import type {
  AdminResetPasswordResult,
  AdminUserStatus,
  BackupJob,
  BackupRunResponse,
  ChangeUserEmailInput,
  CreateUserInput,
  RevokeSessionResult,
  SecuritySession,
  UpdateUserInput,
  UserRole,
} from '@/api';
// The types module directly, not the `@/api` barrel: this file stays free of the client and React Query.
import { FINANCE_ROLE_LABELS } from '@/api/types';

/**
 * Pure rules behind Super Admin's Users, Security and Database Backup actions —
 * the web `UsersPage` and its dialogs (`EditUserDialog`, `ResetPasswordDialog`,
 * `ChangeEmailDialog`), `RevokeSessionDialog` and `DatabaseBackupPage`,
 * reproduced exactly. The validation mirrors the server's zod schemas
 * (`user.schemas.ts`) message for message; the server re-validates everything.
 */

// ─── Users ──────────────────────────────────────────────────────────────────

/** Mirrors the server's `isBranchRole`: the only role that is tied to one branch. */
export function isBranchRole(role: string | null | undefined): boolean {
  return role === 'branch_manager';
}

/** The web Create User role list: the three app roles, then the four Finance Ledger roles by their labels. */
export const CREATE_ROLE_OPTIONS: readonly { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'production_user', label: 'Production User' },
  ...(Object.keys(FINANCE_ROLE_LABELS) as (keyof typeof FINANCE_ROLE_LABELS)[]).map((r) => ({ value: r, label: FINANCE_ROLE_LABELS[r] })),
];

const EDIT_ROLE_OPTIONS: readonly { value: UserRole; label: string }[] = CREATE_ROLE_OPTIONS.slice(0, 3);

/**
 * The web Edit dialog lists only the three app roles. A finance user's own
 * role is added so the picker shows what will be sent — the web sends it
 * unchanged too, it just shows the field blank.
 */
export function editRoleOptions(current: UserRole): readonly { value: UserRole; label: string }[] {
  if (EDIT_ROLE_OPTIONS.some((o) => o.value === current)) return EDIT_ROLE_OPTIONS;
  const own = CREATE_ROLE_OPTIONS.find((o) => o.value === current);
  return own ? [...EDIT_ROLE_OPTIONS, own] : EDIT_ROLE_OPTIONS;
}

export const USER_STATUS_OPTIONS: readonly { value: AdminUserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

/** zod's own `.email()` pattern, so the phone refuses exactly what the server would. */
const EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export type CreateUserField = 'email' | 'displayName' | 'phone' | 'username' | 'password' | 'branchId';
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/**
 * `CreateUserSchema`, first message per field. Values are sent as typed (the
 * schema does not trim); a branch is optional even for a Branch Manager, as on
 * the web.
 */
export function validateCreateUser(v: CreateUserInput): FieldErrors<CreateUserField> {
  const e: FieldErrors<CreateUserField> = {};
  if (!isValidEmail(v.email)) e.email = 'Invalid email address';
  if (v.displayName.length < 2) e.displayName = 'Name must be at least 2 characters';
  if (v.phone.length < 10) e.phone = 'Invalid phone number';
  if (v.username.length < 3) e.username = 'Username must be at least 3 characters';
  else if (!/^[a-z0-9_]+$/.test(v.username)) e.username = 'Username can only contain lowercase letters, numbers, and underscores';
  if (v.password.length < 8) e.password = 'Password must be at least 8 characters';
  return e;
}

/** The web's body: a non-branch role never carries a branch. */
export function createUserBody(v: CreateUserInput): CreateUserInput {
  return { ...v, branchId: isBranchRole(v.role) ? v.branchId : null };
}

export type EditUserField = 'displayName' | 'phone';

/** `UpdateUserSchema`'s two length rules (the web leaves them to the server; the wording is the Create form's). */
export function validateEditUser(v: Pick<UpdateUserInput, 'displayName' | 'phone'>): FieldErrors<EditUserField> {
  const e: FieldErrors<EditUserField> = {};
  if (v.displayName.length < 2) e.displayName = 'Name must be at least 2 characters';
  if (v.phone.length < 10) e.phone = 'Invalid phone number';
  return e;
}

/** The web Edit dialog's body: all five fields, branch cleared for a non-branch role. */
export function editUserBody(v: UpdateUserInput): UpdateUserInput {
  return { displayName: v.displayName, phone: v.phone, role: v.role, branchId: isBranchRole(v.role) ? v.branchId : null, status: v.status };
}

/** Exactly one of Activate / Deactivate per user: Deactivate only while active. */
export function userToggleAction(status: AdminUserStatus): 'activate' | 'deactivate' {
  return status === 'active' ? 'deactivate' : 'activate';
}

export const deactivatePrompt = (name: string) => `Deactivate ${name}?`;
export const deletePrompt = (name: string) =>
  `Permanently delete ${name}? The account is removed from the system and cannot be restored. Records they created are kept.`;

/** `AdminResetPasswordSchema`'s refine, in the web dialog's wording. */
export function resetPasswordProblem(generateTemp: boolean, sendEmail: boolean): string | null {
  return !generateTemp && !sendEmail ? 'Choose a temporary password or a reset email.' : null;
}

/**
 * The web's reading of a reset reply. A reset email that could not be sent is
 * a warning, not a failure: the password change itself already happened.
 */
export function resetPasswordOutcome(res: AdminResetPasswordResult, sendEmail: boolean): { warning: boolean; message: string } {
  const emailError = sendEmail && !res.emailSent ? (res.emailError ?? 'The reset email could not be sent.') : null;
  return emailError ? { warning: true, message: `Password reset, but no email was sent. ${emailError}` } : { warning: false, message: 'Password reset' };
}

export type ChangeEmailField = 'email' | 'confirmEmail' | 'reason';

/**
 * `ChangeUserEmailSchema` plus the web's "already their address" check.
 * Trimmed and lower-cased before comparing, as the API stores it. The
 * "do not match" rule only runs once every field is otherwise valid (zod's
 * object refine), so it never stacks on an "Invalid email address".
 */
export function validateChangeEmail(
  raw: { email: string; confirmEmail: string; reason: string },
  currentEmail: string,
): { errors: FieldErrors<ChangeEmailField> } | { input: ChangeUserEmailInput } {
  const email = raw.email.trim().toLowerCase();
  const confirmEmail = raw.confirmEmail.trim().toLowerCase();
  const reason = raw.reason.trim();
  const errors: FieldErrors<ChangeEmailField> = {};
  if (!isValidEmail(email)) errors.email = 'Invalid email address';
  if (reason.length > 300) errors.reason = 'Keep the reason under 300 characters';
  if (Object.keys(errors).length) return { errors };
  if (email !== confirmEmail) return { errors: { confirmEmail: 'The two email addresses do not match' } };
  if (email === currentEmail.trim().toLowerCase()) return { errors: { email: 'This is already the user’s email address.' } };
  return { input: { email, confirmEmail, ...(reason ? { reason } : {}) } };
}

// ─── Security ───────────────────────────────────────────────────────────────

/** Web `formatDevice`: 'Chrome 140 · Linux Desktop'. */
export function formatDevice(s: Pick<SecuritySession, 'browser' | 'browserVersion' | 'os' | 'deviceType'>): string {
  const browser = [s.browser, s.browserVersion].filter(Boolean).join(' ');
  const kind = s.deviceType && s.deviceType !== 'unknown' ? s.deviceType.charAt(0).toUpperCase() + s.deviceType.slice(1) : null;
  const os = [s.os, kind].filter(Boolean).join(' ');
  if (browser && os) return `${browser} · ${os}`;
  return browser || os || '—';
}

/** The optional reason, trimmed; an empty one is left out of the body. */
export function revokeReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * "Sign out all" on your OWN account keeps the session you are using — the
 * server decides that from your token — so one fewer is signed out.
 */
export function revokeAllCounts(sessionCount: number, own: boolean): { signedOut: number; keepsThisOne: boolean } {
  return own ? { signedOut: Math.max(0, sessionCount - 1), keepsThisOne: true } : { signedOut: sessionCount, keepsThisOne: false };
}

/** The confirmation's explanation, per mode — the web's sentence with "browser" read as this session. */
export function revokeExplanation(mode: 'one' | 'all', own: boolean): string {
  const lead =
    mode === 'all'
      ? own
        ? 'Every other session on your account will be signed out, including devices that never appeared in this list. The session you are using now is kept.'
        : 'Every session for this account will be signed out, including devices that never appeared in this list.'
      : 'This browser will be signed out. Other devices signed in as this account are not affected.';
  return `${lead} An open tab stops working within about two minutes; the sign-in itself is already dead.`;
}

/** The web's success toast: the two counts reported separately, never summed. */
export function revokeSuccess(result: RevokeSessionResult): { title: string; message: string } {
  const title = `${result.revoked} session${result.revoked === 1 ? '' : 's'} signed out`;
  const message =
    result.authSessionsEnded > 0
      ? `${result.authSessionsEnded} authentication session${result.authSessionsEnded === 1 ? '' : 's'} ended. Any open tab signs out within about two minutes.`
      : 'The authentication sessions had already lapsed. Any open tab signs out within about two minutes.';
  return { title, message };
}

/** "Sign out all sessions for …" is offered only for an account with more than one, and only when the account is known. */
export function canRevokeAll(group: { sessionCount: number; userId: string | null }): boolean {
  return group.sessionCount > 1 && !!group.userId;
}

// ─── Database Backup ────────────────────────────────────────────────────────

/** Verify (and the web's Download) work only on a backup that completed. */
export function isBackupDone(job: Pick<BackupJob, 'status'>): boolean {
  return job.status === 'verified' || job.status === 'success';
}

/** The web's reading of "Create backup": a start is a success; anything else is the server's own message. */
export function runBackupOutcome(res: BackupRunResponse): { started: boolean; message: string } {
  return res.outcome === 'started'
    ? { started: true, message: 'Manual backup started — it will appear below as it completes' }
    : { started: false, message: res.message };
}

/**
 * A manual run already in progress is a 409 whose body has `message`, not
 * `error`, so the API client cannot read it; this is the server's sentence
 * for that case.
 */
export function runBackupConflictMessage(status: number | null | undefined): string | null {
  return status === 409 ? 'A manual backup is already running' : null;
}

export function verifyOutcome(backupId: string, ok: boolean): string {
  return ok ? `${backupId} verified — every check passed` : `${backupId} failed verification`;
}
