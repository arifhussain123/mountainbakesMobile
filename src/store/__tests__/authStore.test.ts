/**
 * Auth store behaviour.
 *
 * The Supabase client and the auth API are mocked so the store's own rules can
 * be asserted: fail-closed on a bad role, the Finance role gate, MFA hand-off,
 * and the refresh that clears the forced-password-change gate.
 */

// The mock object is built INSIDE the factory and read back through the import
// below. Jest hoists jest.mock() above every const in the file, so a factory
// that closes over an outer variable captures it while it is still undefined.
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
      refreshSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      resetPasswordForEmail: jest.fn(async () => ({ error: null })),
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn(async () => ({ data: null })),
        listFactors: jest.fn(),
        challenge: jest.fn(),
        verify: jest.fn(),
      },
    },
  },
  getAccessToken: jest.fn(async () => 'token'),
}));

jest.mock('@/services/api/authApi', () => ({
  financeLookup: jest.fn(),
  forgotPassword: jest.fn(),
  changePassword: jest.fn(),
}));

import * as authApi from '@/services/api/authApi';
import { supabase } from '@/services/supabase/client';
import { queryClient } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import { useAuthStore } from '../authStore';

const mockAuth = (supabase as any).auth as {
  getSession: jest.Mock;
  signInWithPassword: jest.Mock;
  signOut: jest.Mock;
  refreshSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  mfa: {
    getAuthenticatorAssuranceLevel: jest.Mock;
    listFactors: jest.Mock;
    challenge: jest.Mock;
    verify: jest.Mock;
  };
};

const financeLookup = authApi.financeLookup as jest.Mock;
const forgotPassword = authApi.forgotPassword as jest.Mock;
const changePassword = authApi.changePassword as jest.Mock;

function sessionWith(appMetadata: Record<string, unknown>) {
  return {
    user: { id: 'u-1', email: 'staff@mountainbakes.com', app_metadata: appMetadata },
    access_token: 'jwt',
  };
}

function resetStore() {
  useAuthStore.setState({
    status: 'bootstrapping',
    claims: null,
    lastError: null,
    mfaChallenge: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
  mockAuth.getSession.mockResolvedValue({ data: { session: null } });
  mockAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: null });
});

describe('signIn', () => {
  it('stores claims read from app_metadata', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: sessionWith({ role: 'branch_manager', branchId: 'b-1' }) },
      error: null,
    });

    await useAuthStore.getState().signIn('staff@mountainbakes.com', 'pw');

    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.claims).toMatchObject({ role: 'branch_manager', branchId: 'b-1' });
  });

  it('fails closed and signs out when the account has no role', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: sessionWith({}) },
      error: null,
    });

    await expect(
      useAuthStore.getState().signIn('nobody@mountainbakes.com', 'pw'),
    ).rejects.toThrow(/no role assigned/i);

    // The half-established session must not be left on the device.
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(useAuthStore.getState().claims).toBeNull();
  });

  it('surfaces a credential failure without a session', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials'),
    });

    await expect(useAuthStore.getState().signIn('a@b.com', 'wrong')).rejects.toThrow();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});

describe('signInFinance', () => {
  it('resolves the Finance User ID then signs in', async () => {
    financeLookup.mockResolvedValue({ email: 'acct@mountainbakes.com' });
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: sessionWith({ role: 'accountant' }) },
      error: null,
    });

    const result = await useAuthStore.getState().signInFinance('FIN-004', 'pw');

    expect(financeLookup).toHaveBeenCalledWith('FIN-004');
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'acct@mountainbakes.com',
      password: 'pw',
    });
    expect(result.needsMfa).toBe(false);
    expect(useAuthStore.getState().claims?.role).toBe('accountant');
  });

  it('reports an unknown ID exactly like a wrong password', async () => {
    // The lookup endpoint is enumeration-hardened server-side; reporting the
    // two cases differently here would undo that.
    financeLookup.mockRejectedValue(new Error('No Finance account matches that User ID.'));
    await expect(useAuthStore.getState().signInFinance('nope', 'pw')).rejects.toThrow(
      'Those sign-in details were not recognised.',
    );

    financeLookup.mockResolvedValue({ email: 'acct@mountainbakes.com' });
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials'),
    });
    await expect(useAuthStore.getState().signInFinance('FIN-004', 'bad')).rejects.toThrow(
      'Those sign-in details were not recognised.',
    );
  });

  it('rejects a non-finance account and abandons the session', async () => {
    financeLookup.mockResolvedValue({ email: 'mgr@mountainbakes.com' });
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: sessionWith({ role: 'branch_manager' }) },
      error: null,
    });

    await expect(useAuthStore.getState().signInFinance('FIN-1', 'pw')).rejects.toThrow(
      /not for a Finance account/i,
    );
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('hands off to MFA when the account requires aal2', async () => {
    financeLookup.mockResolvedValue({ email: 'admin@mountainbakes.com' });
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: sessionWith({ role: 'finance_admin' }) },
      error: null,
    });
    mockAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    });
    mockAuth.mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'factor-1' }] } });
    mockAuth.mfa.challenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });

    const result = await useAuthStore.getState().signInFinance('FIN-1', 'pw');

    expect(result.needsMfa).toBe(true);
    expect(useAuthStore.getState().mfaChallenge).toEqual({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
    });
    // Not signed in yet — an aal1 session is not a usable session.
    expect(useAuthStore.getState().status).not.toBe('signedIn');
  });

  it('refuses an account that requires MFA with no factor enrolled', async () => {
    financeLookup.mockResolvedValue({ email: 'admin@mountainbakes.com' });
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: sessionWith({ role: 'finance_admin' }) },
      error: null,
    });
    mockAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    });
    mockAuth.mfa.listFactors.mockResolvedValue({ data: { totp: [] } });

    await expect(useAuthStore.getState().signInFinance('FIN-1', 'pw')).rejects.toThrow(
      /no authenticator is enrolled/i,
    );
    expect(mockAuth.signOut).toHaveBeenCalled();
  });
});

describe('verifyMfa', () => {
  beforeEach(() => {
    useAuthStore.setState({
      mfaChallenge: { factorId: 'factor-1', challengeId: 'challenge-1' },
    });
  });

  it('completes sign-in on a valid code', async () => {
    mockAuth.mfa.verify.mockResolvedValue({ data: {}, error: null });
    mockAuth.getSession.mockResolvedValue({
      data: { session: sessionWith({ role: 'finance_admin' }) },
    });

    await useAuthStore.getState().verifyMfa('123456');

    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().mfaChallenge).toBeNull();
  });

  it('keeps the challenge open on a rejected code', async () => {
    mockAuth.mfa.verify.mockResolvedValue({ data: null, error: new Error('invalid') });

    await expect(useAuthStore.getState().verifyMfa('000000')).rejects.toThrow(
      'That code was not accepted.',
    );
    expect(useAuthStore.getState().mfaChallenge).not.toBeNull();
    expect(useAuthStore.getState().status).not.toBe('signedIn');
  });

  it('cancelMfa tears down the half-established session', async () => {
    await useAuthStore.getState().cancelMfa();
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().mfaChallenge).toBeNull();
  });
});

describe('changePassword', () => {
  it('refreshes the session so the cleared claim reaches the JWT', async () => {
    changePassword.mockResolvedValue({ success: true });
    mockAuth.refreshSession.mockResolvedValue({
      data: { session: sessionWith({ role: 'branch_manager', mustChangePassword: false }) },
      error: null,
    });

    await useAuthStore.getState().changePassword('N3wPassw0rd!');

    // Without the refresh the app still holds a JWT saying the password must be
    // changed, and the gate loops forever.
    expect(changePassword).toHaveBeenCalledWith('N3wPassw0rd!');
    expect(mockAuth.refreshSession).toHaveBeenCalled();
    expect(useAuthStore.getState().claims?.mustChangePassword).toBe(false);
  });

  it('propagates a server rejection without touching the session', async () => {
    changePassword.mockRejectedValue(new Error('Password does not meet the requirements'));

    await expect(useAuthStore.getState().changePassword('weak')).rejects.toThrow();
    expect(mockAuth.refreshSession).not.toHaveBeenCalled();
  });
});

describe('requestPasswordReset', () => {
  it('asks the server first, then triggers the Supabase email', async () => {
    forgotPassword.mockResolvedValue({ allowed: true });

    await useAuthStore.getState().requestPasswordReset('admin@mountainbakes.com');

    expect(forgotPassword).toHaveBeenCalledWith('admin@mountainbakes.com');
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalled();
  });

  it('does not send an email when the server refuses', async () => {
    // Recovery is Administrator-only; a 403 must stop the flow entirely.
    forgotPassword.mockRejectedValue(new Error('not-admin'));

    await expect(
      useAuthStore.getState().requestPasswordReset('branch@mountainbakes.com'),
    ).rejects.toThrow();
    expect(mockAuth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('clears session state', async () => {
    useAuthStore.setState({
      status: 'signedIn',
      claims: {
        userId: 'u-1',
        email: 'a@b.com',
        role: 'branch_manager',
        branchId: 'b-1',
        branchName: 'Saddar',
        mustChangePassword: false,
      },
    });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(useAuthStore.getState().claims).toBeNull();
  });
});

/**
 * Signing out drops cached server state.
 *
 * A branch handset is shared. The `queryClient` is a module singleton mounted
 * above the auth tree, so it outlives every sign-out in the process, and
 * `gcTime` is 24 hours — while several keys carry **no identity at all**,
 * because the server scopes those responses from the JWT:
 *
 *   qk.reports.summary({period})       branch figures, keyed only by period
 *   qk.productionOrders.list({status}) "the caller's own branch"
 *   qk.stock.byBranch(null, date)      literally keyed 'self'
 *
 * So without this, a manager signing out and a shift user signing in on the same
 * phone could be shown the previous account's takings, demands and balances —
 * and with staleTime up to ten minutes on settings, branches and categories,
 * possibly without a refetch to correct it.
 *
 * This clears **server state only**. Unsynced transactions and the SQLite
 * reference mirror are untouched, which is the documented invariant: sign-out
 * never deletes local data, and clearing the mirror would break offline
 * sign-in.
 */
describe('signOut and cached server state', () => {
  it('empties the query cache so the next account cannot be shown this one', async () => {
    queryClient.setQueryData(qk.reports.summary({ period: 'daily' }), { totalRevenue: '9999' });
    queryClient.setQueryData(qk.stock.byBranch(null, 'today'), { date: 'today', rows: [] });
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);

    await useAuthStore.getState().signOut();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('still ends the session', async () => {
    await useAuthStore.getState().signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().claims).toBeNull();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});
