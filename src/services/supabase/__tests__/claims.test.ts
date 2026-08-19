import { claimsFromSession, isValidRole } from '../claims';
import { USER_ROLES } from '@/shared/types/user.types';

/**
 * Claim extraction is the app's entire authorization input on the client side.
 * Role and branch come from the JWT's `app_metadata`, which the server sets via
 * the Supabase Admin API — never from a form, a response body, or user input.
 */

function session(appMetadata: Record<string, unknown>) {
  return {
    user: { id: 'user-1', email: 'staff@mountainbakes.com', app_metadata: appMetadata },
  };
}

describe('isValidRole', () => {
  it('accepts every role in the shared USER_ROLES list', () => {
    for (const role of USER_ROLES) {
      expect(isValidRole(role)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    // A role the Postgres enum does not contain would fail at the first insert
    // with a runtime 22P02, so it must never reach a request.
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole('Branch Manager')).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(null)).toBe(false);
  });
});

describe('claimsFromSession', () => {
  it('reads role and branch from app_metadata', () => {
    const claims = claimsFromSession(
      session({ role: 'branch_manager', branchId: 'b-1', branchName: 'Saddar' }),
    );

    expect(claims).toMatchObject({
      userId: 'user-1',
      email: 'staff@mountainbakes.com',
      role: 'branch_manager',
      branchId: 'b-1',
      branchName: 'Saddar',
      mustChangePassword: false,
    });
  });

  it('fails closed when the role is missing', () => {
    // An earlier web build defaulted these accounts to branch_manager and handed
    // them a working branch session. Returning null makes the caller sign out.
    expect(claimsFromSession(session({ branchId: 'b-1' }))).toBeNull();
  });

  it('fails closed when the role is unrecognised', () => {
    expect(claimsFromSession(session({ role: 'superuser' }))).toBeNull();
  });

  it('returns null for no session', () => {
    expect(claimsFromSession(null)).toBeNull();
  });

  it('surfaces mustChangePassword only when literally true', () => {
    expect(claimsFromSession(session({ role: 'super_admin', mustChangePassword: true }))
      ?.mustChangePassword).toBe(true);
    // A truthy string must not be read as a boolean flag.
    expect(claimsFromSession(session({ role: 'super_admin', mustChangePassword: 'no' }))
      ?.mustChangePassword).toBe(false);
  });

  it('tolerates a super_admin with no branch', () => {
    const claims = claimsFromSession(session({ role: 'super_admin' }));
    expect(claims?.branchId).toBeNull();
    expect(claims?.branchName).toBeNull();
  });

  it('ignores a non-string branchId rather than trusting it', () => {
    const claims = claimsFromSession(session({ role: 'branch_user', branchId: 42 }));
    expect(claims?.branchId).toBeNull();
  });
});
