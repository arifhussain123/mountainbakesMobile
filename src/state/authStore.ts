import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import { authService } from '@/api/services';
import { isApiError, setRefreshHandler, setSessionExpiredHandler, setTokenAccessor, type RefreshOutcome } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { logger, withTimeout } from '@/shared/utils';
import type { SessionUser } from '@/api/types';

const KEYCHAIN_SERVICE = 'com.mountainbakes.branch.refreshToken';
const REMEMBERED_EMAIL_KEY = 'mountainbakes.rememberedEmail';

// The network leg of bootstrap (session refresh) must never be able to hang
// the launch screen indefinitely — see the bootsplash-hang investigation.
// Local-only legs (AsyncStorage/Keychain reads) are not network-bound and are
// given a much shorter budget since a hang there points to something wrong
// with the device, not a slow server.
const BOOTSTRAP_LOCAL_TIMEOUT_MS = 3000;
const BOOTSTRAP_NETWORK_TIMEOUT_MS = 8000;

// Neither the raw step name nor a friendly message should flash for a normal,
// fast boot — only a step that's actually taking a while should say anything
// at all, per the bootstrap spec. Both are driven by this one timer so a slow
// step (e.g. a flaky network on `sessionRefresh`) shows the user "Signing you
// in…" immediately where a dev build also shows the real step name for
// debugging, but a sub-1.5s boot — the common case — shows neither.
const SLOW_BOOTSTRAP_STEP_MS = 1500;

const FRIENDLY_BOOTSTRAP_MESSAGE: Record<string, string> = {
  rememberedEmail: 'Preparing your data…',
  refreshToken: 'Preparing your data…',
  sessionRefresh: 'Signing you in…',
};

async function timeBootstrapStep<T>(label: string, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  const slowTimer = setTimeout(() => {
    useAuthStore.setState({ bootstrapStep: label, bootstrapMessage: FRIENDLY_BOOTSTRAP_MESSAGE[label] ?? 'Preparing your data…' });
  }, SLOW_BOOTSTRAP_STEP_MS);
  try {
    return await task();
  } finally {
    clearTimeout(slowTimer);
    if (__DEV__) logger.debug(`[bootstrap] ${label} ${Date.now() - startedAt}ms`);
  }
}

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  accessToken: string | null;
  rememberedEmail: string | null;
  /** Dev-only: which bootstrap step is currently running — only set once that step has been running 1.5s+, so a fast boot never shows it. */
  bootstrapStep: string | null;
  /** User-facing: friendly text ("Signing you in…") shown on the JS splash once the current step has been running 1.5s+. Never set on a fast boot. */
  bootstrapMessage: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string, rememberEmail: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * After the forced password change succeeds: re-issue this session so the
   * cleared `mustChangePassword` comes back from the server (the web's
   * `refreshToken()` after `/change-password`), which lifts RootNavigator's
   * gate. If the refresh itself fails, the flag is cleared locally — the
   * server already cleared it, and it enforces the gate on every request anyway.
   */
  completePasswordChange: () => Promise<void>;
}

async function readRememberedEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
  } catch {
    return null;
  }
}

async function storeRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refreshToken', token, { service: KEYCHAIN_SERVICE });
}

async function readRefreshToken(): Promise<string | null> {
  const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  return result ? result.password : null;
}

async function clearRefreshToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'bootstrapping',
  user: null,
  accessToken: null,
  rememberedEmail: null,
  bootstrapStep: null,
  bootstrapMessage: null,

  bootstrap: async () => {
    try {
      const rememberedEmail = await timeBootstrapStep('rememberedEmail', () =>
        withTimeout(readRememberedEmail(), BOOTSTRAP_LOCAL_TIMEOUT_MS, 'bootstrap:rememberedEmail'),
      );
      set({ rememberedEmail });
    } catch (error) {
      // Not knowing the remembered email is never a reason to block startup.
      logger.warn('bootstrap: reading remembered email failed/timed out', { error });
    }

    let refreshToken: string | null = null;
    try {
      refreshToken = await timeBootstrapStep('refreshToken', () =>
        withTimeout(readRefreshToken(), BOOTSTRAP_LOCAL_TIMEOUT_MS, 'bootstrap:refreshToken'),
      );
    } catch (error) {
      logger.warn('bootstrap: reading refresh token failed/timed out', { error });
    }

    if (!refreshToken) {
      set({ status: 'signedOut', bootstrapStep: null, bootstrapMessage: null });
      return;
    }
    try {
      const session = await timeBootstrapStep('sessionRefresh', () =>
        withTimeout(authService.refresh(refreshToken as string), BOOTSTRAP_NETWORK_TIMEOUT_MS, 'bootstrap:sessionRefresh'),
      );
      await storeRefreshToken(session.refreshToken);
      set({ status: 'signedIn', user: session.user, accessToken: session.accessToken, bootstrapStep: null, bootstrapMessage: null });
    } catch (error) {
      // Covers both a real auth failure and a timed-out/offline network call —
      // either way we must fall back to signedOut rather than hang the splash.
      // Only clear the stored refresh token on an actual server rejection
      // (e.g. a 401 for a dead/reused token) — never on a timeout or offline
      // error (ApiError.status === null), since the token may still be good
      // and clearing it would force a needless re-login once back online.
      logger.warn('session restore failed/timed out', { error });
      if (isRefreshRefusal(error)) {
        await clearRefreshToken();
      }
      set({ status: 'signedOut', bootstrapStep: null, bootstrapMessage: null });
    }
  },

  login: async (identifier, password, rememberEmail) => {
    const session = await authService.login(identifier, password);
    await storeRefreshToken(session.refreshToken);
    if (rememberEmail) {
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, identifier);
    } else {
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
    set({ status: 'signedIn', user: session.user, accessToken: session.accessToken, rememberedEmail: rememberEmail ? identifier : get().rememberedEmail });
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Signing out locally must proceed even if the network call fails.
      logger.warn('server-side logout failed', { error });
    }
    await clearRefreshToken();
    // Cache only — never the unsynced write queue, which is the Drawer's Sign
    // Out sheet's own explicit, warned-about decision (`clearOfflineQueue`).
    // Clearing it here unconditionally would silently delete unsynced work on
    // every sign-out, including an accidental one.
    queryClient.clear();
    set({ status: 'signedOut', user: null, accessToken: null });
  },

  completePasswordChange: async () => {
    try {
      const refreshToken = await readRefreshToken();
      if (refreshToken) {
        const session = await authService.refresh(refreshToken);
        await storeRefreshToken(session.refreshToken);
        set({ status: 'signedIn', user: session.user, accessToken: session.accessToken });
        return;
      }
    } catch (error) {
      logger.warn('session refresh after password change failed', { error });
    }
    const user = get().user;
    if (user) set({ user: { ...user, mustChangePassword: false } });
  },
}));

// Wire this store into the API client once, at module load — the client has no
// other way to read the access token or trigger a refresh (api/ never imports
// state/ directly; see the folder-structure skill's import direction).
setTokenAccessor(() => useAuthStore.getState().accessToken);

/**
 * The API refused the refresh token itself (401/403) — the only answer that
 * ends a session. A 429 or 5xx is the server's trouble, not the session's.
 */
function isRefreshRefusal(error: unknown): boolean {
  return isApiError(error) && (error.status === 401 || error.status === 403);
}

/**
 * One refresh at a time. Several screens' requests 401 together when the
 * access token runs out; each refresh spends the stored token, so parallel ones
 * would present a token another had just spent. They share this one instead.
 */
let refreshing: Promise<RefreshOutcome> | null = null;

setRefreshHandler(() => {
  refreshing ??= (async (): Promise<RefreshOutcome> => {
    try {
      const refreshToken = await readRefreshToken();
      if (!refreshToken) return 'rejected';
      const session = await authService.refresh(refreshToken);
      await storeRefreshToken(session.refreshToken);
      useAuthStore.setState({ accessToken: session.accessToken, user: session.user, status: 'signedIn' });
      return 'refreshed';
    } catch (error) {
      logger.warn('token refresh failed', { error });
      return isRefreshRefusal(error) ? 'rejected' : 'unavailable';
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
});

setSessionExpiredHandler(() => {
  void clearRefreshToken();
  useAuthStore.setState({ status: 'signedOut', user: null, accessToken: null });
});
