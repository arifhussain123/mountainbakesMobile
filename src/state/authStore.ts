import { create } from 'zustand';
import { supabase } from '@/api/supabase/client';
import { claimsFromSession, type SessionClaims } from '@/api/supabase/claims';
import { canAccessFinance } from '@/shared/types/finance.types';
import * as authApi from '@/api/services/authService';
import { env } from '@/config/env';
import { clearCachedServerState } from '@/api/queryClient';

/**
 * Authentication state.
 *
 * The session itself is owned by the Supabase SDK (persisted to encrypted MMKV,
 * auto-refreshed). This store holds only the derived claims the UI routes on, so
 * there is never a second copy of the token to go stale.
 *
 * Fail-closed rule, matching the web client: an account whose `app_metadata.role`
 * is missing or unrecognised gets NO session. An earlier web build defaulted such
 * accounts to branch_manager and handed them a working branch session.
 */

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

/** Set when a Finance sign-in needs a TOTP code before the session is usable. */
export interface MfaChallenge {
  factorId: string;
  challengeId: string;
}

interface AuthState {
  status: AuthStatus;
  claims: SessionClaims | null;
  lastError: string | null;
  mfaChallenge: MfaChallenge | null;

  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInFinance: (userId: string, password: string) => Promise<{ needsMfa: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  cancelMfa: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const NO_ROLE_MESSAGE = 'This account has no role assigned. Contact an administrator.';
const NOT_FINANCE_MESSAGE =
  'Those credentials are not for a Finance account. Use the main sign-in for Branch, Production or Admin access.';

/** Guards against stacking a listener each time bootstrap() is retried. */
let authListenerAttached = false;

/**
 * Tear down a session that was established but must not be kept — a wrong-module
 * sign-in, or an account with no usable role. Leaving it in place would mean a
 * valid token sitting on the device for an account the user may not use here.
 */
async function abandonSession(message: string): Promise<never> {
  await supabase.auth.signOut();
  clearCachedServerState();
  throw new Error(message);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'bootstrapping',
  claims: null,
  lastError: null,
  mfaChallenge: null,

  bootstrap: async () => {
    // Attach the SDK listener exactly once, before any early return below.
    // bootstrap() is re-invoked by the splash screen's retry, and registering
    // per call would stack a new listener on every attempt; putting it after the
    // no-role branch would leave that path with no listener at all.
    if (!authListenerAttached) {
      authListenerAttached = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        const next = claimsFromSession(session);
        // A refresh failure while offline reports a null session that is
        // indistinguishable from a real sign-out. Only transition to signedOut
        // when the store isn't already holding valid claims, so a dropped
        // connection cannot strand unsynced work behind a login screen. An
        // explicit sign-out clears claims itself, so it is unaffected.
        if (!next && !session && get().claims) return;
        // A session that ended without the user asking — an expired refresh
        // token — must drop cached server state too, or the next account to
        // sign in on this handset inherits it. The guard above is what keeps a
        // merely offline refresh failure from reaching this.
        if (!next && get().claims) clearCachedServerState();
        set({ status: next ? 'signedIn' : 'signedOut', claims: next });
      });
    }

    const { data } = await supabase.auth.getSession();
    const claims = claimsFromSession(data.session);

    if (data.session && !claims) {
      // Authenticated but unusable. Do not leave a half-established session behind.
      await supabase.auth.signOut();
      clearCachedServerState();
      set({ status: 'signedOut', claims: null, lastError: NO_ROLE_MESSAGE });
      return;
    }

    set({ status: claims ? 'signedIn' : 'signedOut', claims, lastError: null });
  },

  signIn: async (email, password) => {
    set({ lastError: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ lastError: error.message, status: 'signedOut', claims: null });
      throw error;
    }

    const claims = claimsFromSession(data.session);
    if (!claims) {
      set({ status: 'signedOut', claims: null, lastError: NO_ROLE_MESSAGE });
      await abandonSession(NO_ROLE_MESSAGE);
    }

    set({ status: 'signedIn', claims, lastError: null });
  },

  /**
   * Finance sign-in.
   *
   * Finance staff are issued a "Finance User ID" rather than an email, so the ID
   * is resolved server-side first. The lookup is enumeration-hardened: an
   * unknown ID, a non-finance account and a deactivated one return the same 404,
   * so the failure is reported here exactly like a wrong password.
   */
  signInFinance: async (userId, password) => {
    set({ lastError: null, mfaChallenge: null });

    let email: string;
    try {
      const result = await authApi.financeLookup(userId);
      email = result.email;
    } catch {
      // Deliberately identical to a wrong-password failure — the lookup must not
      // reveal whether an account exists.
      const message = 'Those sign-in details were not recognised.';
      set({ lastError: message });
      throw new Error(message);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      const message = 'Those sign-in details were not recognised.';
      set({ lastError: message });
      throw new Error(message);
    }

    // A second factor shows up as an assurance-level gap: the session exists at
    // aal1 but the account requires aal2, so it is not yet usable.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (!totp) {
        await abandonSession(
          'This account requires two-factor authentication, but no authenticator is enrolled. Contact your Finance Admin.',
        );
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totp!.id,
      });
      if (challengeError || !challenge) {
        await abandonSession('Could not start two-factor verification. Please try again.');
      }

      set({ mfaChallenge: { factorId: totp!.id, challengeId: challenge!.id } });
      return { needsMfa: true };
    }

    await finalizeFinanceSignIn(set, data.session);
    return { needsMfa: false };
  },

  verifyMfa: async code => {
    const challenge = get().mfaChallenge;
    if (!challenge) throw new Error('No verification is in progress.');

    set({ lastError: null });
    const { error } = await supabase.auth.mfa.verify({
      factorId: challenge.factorId,
      challengeId: challenge.challengeId,
      code: code.trim(),
    });

    if (error) {
      const message = 'That code was not accepted.';
      set({ lastError: message });
      throw new Error(message);
    }

    const { data } = await supabase.auth.getSession();
    set({ mfaChallenge: null });
    await finalizeFinanceSignIn(set, data.session);
  },

  /** Abandon a half-completed Finance sign-in; the aal1 session must not persist. */
  cancelMfa: async () => {
    await supabase.auth.signOut();
    set({ mfaChallenge: null, status: 'signedOut', claims: null, lastError: null });
  },

  /**
   * Password recovery. Administrator accounts only — the server decides, and
   * returns 403 for non-admins and unknown addresses alike.
   *
   * On approval, Supabase sends its own reset email pointing at the WEB app's
   * /reset-password page; this app has no deep-link scheme registered.
   */
  requestPasswordReset: async email => {
    await authApi.forgotPassword(email);

    const redirectTo = env.webUrl ? `${env.webUrl}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  /**
   * Change the signed-in user's password, clearing the forced-change gate.
   *
   * The refreshSession() call is load-bearing, not defensive: the server clears
   * `mustChangePassword` in app_metadata, but this app routes on the claim inside
   * the JWT it already holds. Without the refresh, that JWT still carries the old
   * claim and the user is bounced back to this screen forever.
   */
  changePassword: async newPassword => {
    await authApi.changePassword(newPassword);
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;

    const claims = claimsFromSession(data.session);
    if (claims) set({ status: 'signedIn', claims, lastError: null });
  },

  /**
   * Sign out. Does NOT clear local SQLite — pending offline transactions must
   * survive a sign-out and resume after the next sign-in. Callers that need to
   * warn about unsynced work check the queue before calling this.
   */
  signOut: async () => {
    await supabase.auth.signOut();
    // Server state goes with the session. Local transactions do not — they stay
    // in SQLite and resume on the next sign-in on this phone.
    clearCachedServerState();
    set({ status: 'signedOut', claims: null, lastError: null, mfaChallenge: null });
  },
}));

type SetState = (partial: Partial<AuthState>) => void;

/**
 * The Finance role gate.
 *
 * Read from `app_metadata` on the session Supabase just issued — never from
 * anything the sign-in form supplied. app_metadata is writable only with the
 * service-role key, so it is exactly as trustworthy as the JWT itself.
 */
async function finalizeFinanceSignIn(
  set: SetState,
  session: Parameters<typeof claimsFromSession>[0],
): Promise<void> {
  const claims = claimsFromSession(session);

  if (!claims) {
    set({ status: 'signedOut', claims: null, lastError: NO_ROLE_MESSAGE });
    await abandonSession(NO_ROLE_MESSAGE);
  }

  if (!canAccessFinance(claims!.role)) {
    set({ status: 'signedOut', claims: null, lastError: NOT_FINANCE_MESSAGE });
    await abandonSession(NOT_FINANCE_MESSAGE);
  }

  set({ status: 'signedIn', claims, lastError: null });
}
