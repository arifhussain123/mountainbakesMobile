/**
 * @format
 */
import type { CreateUserInput } from '@/api/types';
import {
  CREATE_ROLE_OPTIONS,
  canRevokeAll,
  createUserBody,
  editRoleOptions,
  editUserBody,
  formatDevice,
  isBackupDone,
  isValidEmail,
  resetPasswordOutcome,
  resetPasswordProblem,
  revokeAllCounts,
  revokeExplanation,
  revokeReason,
  revokeSuccess,
  runBackupConflictMessage,
  runBackupOutcome,
  userToggleAction,
  validateChangeEmail,
  validateCreateUser,
  validateEditUser,
  verifyOutcome,
} from '@/features/admin/utils/systemActions';

const user = (over: Partial<CreateUserInput> = {}): CreateUserInput => ({
  email: 'ahmed@mountainbakes.com',
  displayName: 'Ahmed Khan',
  phone: '03001234567',
  username: 'gulshan01',
  password: 'secret123',
  role: 'branch_manager',
  branchId: 'b1',
  ...over,
});

describe('create user', () => {
  it('accepts a valid form', () => {
    expect(validateCreateUser(user())).toEqual({});
  });

  it('reports the schema messages, first per field', () => {
    expect(validateCreateUser(user({ email: 'nope', displayName: 'A', phone: '123', username: 'ab', password: 'short' }))).toEqual({
      email: 'Invalid email address',
      displayName: 'Name must be at least 2 characters',
      phone: 'Invalid phone number',
      username: 'Username must be at least 3 characters',
      password: 'Password must be at least 8 characters',
    });
    expect(validateCreateUser(user({ username: 'Gulshan01' })).username).toBe(
      'Username can only contain lowercase letters, numbers, and underscores',
    );
  });

  it('leaves a branch optional, and drops it for a non-branch role', () => {
    expect(validateCreateUser(user({ branchId: null }))).toEqual({});
    expect(createUserBody(user({ role: 'production_user' })).branchId).toBeNull();
    expect(createUserBody(user()).branchId).toBe('b1');
  });

  it('offers the three app roles then the four finance roles', () => {
    expect(CREATE_ROLE_OPTIONS.map((o) => o.value)).toEqual([
      'super_admin',
      'branch_manager',
      'production_user',
      'finance_admin',
      'finance_manager',
      'accountant',
      'finance_auditor',
    ]);
  });
});

describe('edit user', () => {
  it('lists the three app roles, plus a finance user’s own role', () => {
    expect(editRoleOptions('branch_manager').map((o) => o.value)).toEqual(['super_admin', 'branch_manager', 'production_user']);
    expect(editRoleOptions('accountant').map((o) => o.value)).toEqual(['super_admin', 'branch_manager', 'production_user', 'accountant']);
  });

  it('checks the length rules and clears the branch for a non-branch role', () => {
    expect(validateEditUser({ displayName: 'A', phone: '1' })).toEqual({
      displayName: 'Name must be at least 2 characters',
      phone: 'Invalid phone number',
    });
    expect(editUserBody({ displayName: 'Ahmed', phone: '03001234567', role: 'super_admin', branchId: 'b1', status: 'active' })).toEqual({
      displayName: 'Ahmed',
      phone: '03001234567',
      role: 'super_admin',
      branchId: null,
      status: 'active',
    });
  });

  it('offers Deactivate only while active', () => {
    expect(userToggleAction('active')).toBe('deactivate');
    expect(userToggleAction('inactive')).toBe('activate');
    expect(userToggleAction('suspended')).toBe('activate');
  });
});

describe('reset password', () => {
  it('needs a temporary password or a reset email', () => {
    expect(resetPasswordProblem(false, false)).toBe('Choose a temporary password or a reset email.');
    expect(resetPasswordProblem(true, false)).toBeNull();
    expect(resetPasswordProblem(false, true)).toBeNull();
  });

  it('warns, not fails, when the email could not be sent', () => {
    expect(resetPasswordOutcome({ success: true, tempPassword: null, email: 'a@b.co', emailSent: false, emailError: 'Mail is off.' }, true)).toEqual({
      warning: true,
      message: 'Password reset, but no email was sent. Mail is off.',
    });
    expect(resetPasswordOutcome({ success: true, tempPassword: null, email: 'a@b.co', emailSent: false }, true).message).toBe(
      'Password reset, but no email was sent. The reset email could not be sent.',
    );
    expect(resetPasswordOutcome({ success: true, tempPassword: 'x', email: null }, false)).toEqual({ warning: false, message: 'Password reset' });
  });
});

describe('change email', () => {
  const current = 'old@mountainbakes.com';

  it('trims, lower-cases and drops an empty reason', () => {
    expect(validateChangeEmail({ email: ' New@MountainBakes.com ', confirmEmail: 'new@mountainbakes.com', reason: '  ' }, current)).toEqual({
      input: { email: 'new@mountainbakes.com', confirmEmail: 'new@mountainbakes.com' },
    });
  });

  it('checks the address before the match, and refuses the current one', () => {
    expect(validateChangeEmail({ email: 'bad', confirmEmail: 'other', reason: '' }, current)).toEqual({ errors: { email: 'Invalid email address' } });
    expect(validateChangeEmail({ email: 'a@b.co', confirmEmail: 'c@b.co', reason: '' }, current)).toEqual({
      errors: { confirmEmail: 'The two email addresses do not match' },
    });
    expect(validateChangeEmail({ email: 'OLD@mountainbakes.com', confirmEmail: 'old@mountainbakes.com', reason: '' }, current)).toEqual({
      errors: { email: 'This is already the user’s email address.' },
    });
    expect(validateChangeEmail({ email: 'a@b.co', confirmEmail: 'a@b.co', reason: 'x'.repeat(301) }, current)).toEqual({
      errors: { reason: 'Keep the reason under 300 characters' },
    });
  });

  it('uses zod’s email pattern', () => {
    expect(isValidEmail('a.b+c@mountain-bakes.com')).toBe(true);
    expect(isValidEmail('.a@b.co')).toBe(false);
    expect(isValidEmail('a..b@b.co')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});

describe('sign out sessions', () => {
  it('formats the device as the web does', () => {
    expect(formatDevice({ browser: 'Chrome', browserVersion: '140', os: 'Linux', deviceType: 'desktop' })).toBe('Chrome 140 · Linux Desktop');
    expect(formatDevice({ browser: null, browserVersion: null, os: 'Android', deviceType: 'unknown' })).toBe('Android');
    expect(formatDevice({ browser: null, browserVersion: null, os: null, deviceType: null })).toBe('—');
  });

  it('sends a reason only when one was typed', () => {
    expect(revokeReason('  lost phone ')).toBe('lost phone');
    expect(revokeReason('   ')).toBeUndefined();
  });

  it('keeps your own session when you clear your own account', () => {
    expect(revokeAllCounts(3, true)).toEqual({ signedOut: 2, keepsThisOne: true });
    expect(revokeAllCounts(3, false)).toEqual({ signedOut: 3, keepsThisOne: false });
    expect(revokeAllCounts(0, true).signedOut).toBe(0);
    expect(revokeExplanation('all', true)).toContain('The session you are using now is kept.');
    expect(revokeExplanation('one', false)).toMatch(/^This browser will be signed out\./);
  });

  it('reports the two counts separately', () => {
    expect(revokeSuccess({ revoked: 1, authSessionsEnded: 1 })).toEqual({
      title: '1 session signed out',
      message: '1 authentication session ended. Any open tab signs out within about two minutes.',
    });
    expect(revokeSuccess({ revoked: 3, authSessionsEnded: 0 })).toEqual({
      title: '3 sessions signed out',
      message: 'The authentication sessions had already lapsed. Any open tab signs out within about two minutes.',
    });
  });

  it('offers "sign out all" only for a known account with more than one session', () => {
    expect(canRevokeAll({ sessionCount: 2, userId: 'u1' })).toBe(true);
    expect(canRevokeAll({ sessionCount: 1, userId: 'u1' })).toBe(false);
    expect(canRevokeAll({ sessionCount: 2, userId: null })).toBe(false);
  });
});

describe('database backup', () => {
  it('verifies only a completed backup', () => {
    expect(isBackupDone({ status: 'verified' })).toBe(true);
    expect(isBackupDone({ status: 'success' })).toBe(true);
    expect(isBackupDone({ status: 'running' })).toBe(false);
    expect(isBackupDone({ status: 'failed' })).toBe(false);
  });

  it('reads the run reply as the web does', () => {
    expect(runBackupOutcome({ backupId: 'm1', outcome: 'started', message: 'manual backup started' })).toEqual({
      started: true,
      message: 'Manual backup started — it will appear below as it completes',
    });
    expect(runBackupOutcome({ backupId: 'm1', outcome: 'already_completed', message: 'm1 already completed' })).toEqual({
      started: false,
      message: 'm1 already completed',
    });
    expect(runBackupConflictMessage(409)).toBe('A manual backup is already running');
    expect(runBackupConflictMessage(500)).toBeNull();
  });

  it('words the verification outcome', () => {
    expect(verifyOutcome('BK-1', true)).toBe('BK-1 verified — every check passed');
    expect(verifyOutcome('BK-1', false)).toBe('BK-1 failed verification');
  });
});
