import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import { authService } from '@/api/services';
import { setRefreshHandler, setSessionExpiredHandler, setTokenAccessor } from '@/api/client';
import { logger } from '@/shared/utils';
import type { SessionUser } from '@/api/types';

const KEYCHAIN_SERVICE = 'com.mountainbakes.branch.refreshToken';
const REMEMBERED_EMAIL_KEY = 'mountainbakes.rememberedEmail';

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  accessToken: string | null;
  rememberedEmail: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string, rememberEmail: boolean) => Promise<void>;
  logout: () => Promise<void>;
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

  bootstrap: async () => {
    const rememberedEmail = await readRememberedEmail();
    set({ rememberedEmail });

    const refreshToken = await readRefreshToken();
    if (!refreshToken) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      const session = await authService.refresh(refreshToken);
      await storeRefreshToken(session.refreshToken);
      set({ status: 'signedIn', user: session.user, accessToken: session.accessToken });
    } catch (error) {
      logger.warn('session restore failed', { error });
      await clearRefreshToken();
      set({ status: 'signedOut' });
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
    set({ status: 'signedOut', user: null, accessToken: null });
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
    useAuthStore.setState({ accessToken: session.accessToken, user: session.user, status: 'signedIn' });
    return true;
  } catch (error) {
    logger.warn('token refresh failed', { error });
    return false;
  }
});

setSessionExpiredHandler(() => {
  void clearRefreshToken();
  useAuthStore.setState({ status: 'signedOut', user: null, accessToken: null });
});
