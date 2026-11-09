import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import { authService } from '@/api/services';
import {
  setRefreshHandler,
  setSessionExpiredHandler,
  setTokenAccessor,
} from '@/api/client';
import { clearSessionUser, saveSessionUser } from '@/shared/offline';
import { logger } from '@/shared/utils';
import type { IssuedSession, SessionUser } from '@/api/types';

const KEYCHAIN_SERVICE = 'com.mountainbakes.branch.refreshToken';

/** AsyncStorage keys — exported for the tests; nothing else reads them directly. */
export const AUTH_STORAGE_KEYS = {
  /** The ONLY credential-adjacent thing ever written to plain storage: the email, when "Remember me" is on. Never the password. */
  rememberedEmail: 'mountainbakes.rememberedEmail',
  onboardingCompleted: 'mountainbakes.onboardingCompleted',
  /** The pre-rebuild flag name; still honoured so an existing install does not see onboarding a second time. */
  legacyOnboardingSeen: 'mountainbakes.onboardingSeen',
} as const;

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  accessToken: string | null;
  rememberedEmail: string | null;
  /** True once the user has tapped Skip or Get Started on the onboarding pager (persisted). */
  onboardingCompleted: boolean;
  bootstrap: () => Promise<void>;
  login: (
    identifier: string,
    password: string,
    rememberEmail: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

async function readFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === 'true';
  } catch {
    return false;
  }
}

async function readOnboardingCompleted(): Promise<boolean> {
  return (
    (await readFlag(AUTH_STORAGE_KEYS.onboardingCompleted)) ||
    (await readFlag(AUTH_STORAGE_KEYS.legacyOnboardingSeen))
  );
}

async function readRememberedEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_STORAGE_KEYS.rememberedEmail);
  } catch {
    return null;
  }
}

async function persistRememberedEmail(email: string | null): Promise<void> {
  try {
    if (email)
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.rememberedEmail, email);
    else await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.rememberedEmail);
  } catch (error) {
    // A failed convenience write must never fail the sign-in itself.
    logger.warn('remembered email not saved', { error });
  }
}

// Only the refresh token is persisted, in the Keychain. The access token is
// short-lived and is reissued by /auth/refresh on every launch, so storing it
// too would only leave a stale bearer token lying around.
async function storeRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refreshToken', token, {
    service: KEYCHAIN_SERVICE,
  });
}

async function readRefreshToken(): Promise<string | null> {
  const result = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
  });
  return result ? result.password : null;
}

async function clearRefreshToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
}

// The SQLite mirror of the user/branch is a cache: a failure to write it is
// logged, never surfaced, and never blocks the session from being established.
async function cacheSessionUser(user: SessionUser): Promise<void> {
  try {
    await saveSessionUser(user);
  } catch (error) {
    logger.warn('session user not cached', { error });
  }
}

async function dropCachedSessionUser(): Promise<void> {
  try {
    await clearSessionUser();
  } catch (error) {
    logger.warn('session user cache not cleared', { error });
  }
}

export const useAuthStore = create<AuthState>(set => ({
  status: 'bootstrapping',
  user: null,
  accessToken: null,
  rememberedEmail: null,
  onboardingCompleted: false,

  bootstrap: async () => {
    const [rememberedEmail, onboardingCompleted] = await Promise.all([
      readRememberedEmail(),
      readOnboardingCompleted(),
    ]);
    set({ rememberedEmail, onboardingCompleted });

    const refreshToken = await readRefreshToken();
    if (!refreshToken) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      const session = await authService.refresh(refreshToken);
      await storeRefreshToken(session.refreshToken);
      await cacheSessionUser(session.user);
      set({
        status: 'signedIn',
        user: session.user,
        accessToken: session.accessToken,
      });
    } catch (error) {
      logger.warn('session restore failed', { error });
      await clearRefreshToken();
      await dropCachedSessionUser();
      set({ status: 'signedOut' });
    }
  },

  login: async (identifier, password, rememberEmail) => {
    const session: IssuedSession = await authService.login(
      identifier,
      password,
    );
    await storeRefreshToken(session.refreshToken);
    await persistRememberedEmail(rememberEmail ? identifier : null);
    await cacheSessionUser(session.user);
    set({
      status: 'signedIn',
      user: session.user,
      accessToken: session.accessToken,
      rememberedEmail: rememberEmail ? identifier : null,
    });
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Signing out locally must proceed even if the network call fails.
      logger.warn('server-side logout failed', { error });
    }
    await clearRefreshToken();
    await dropCachedSessionUser();
    set({ status: 'signedOut', user: null, accessToken: null });
  },

  completeOnboarding: async () => {
    set({ onboardingCompleted: true });
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.onboardingCompleted, 'true');
    } catch (error) {
      logger.warn('onboarding flag not saved', { error });
    }
  },
}));

// Wire this store into the API client once, at module load — the client has no
// other way to read the access token or trigger a refresh (api/ never imports
// state/ directly; see the folder-structure skill's import direction).
setTokenAccessor(() => useAuthStore.getState().accessToken);

setRefreshHandler(async () => {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) return false;
  try {
    const session = await authService.refresh(refreshToken);
    await storeRefreshToken(session.refreshToken);
    await cacheSessionUser(session.user);
    useAuthStore.setState({
      accessToken: session.accessToken,
      user: session.user,
      status: 'signedIn',
    });
    return true;
  } catch (error) {
    logger.warn('token refresh failed', { error });
    return false;
  }
});

setSessionExpiredHandler(() => {
  void clearRefreshToken();
  void dropCachedSessionUser();
  useAuthStore.setState({ status: 'signedOut', user: null, accessToken: null });
});
