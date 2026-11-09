/**
 * @format
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import * as authService from '@/api/services/authService';
import type { IssuedSession } from '@/api/types';
import { AUTH_STORAGE_KEYS, useAuthStore } from '@/state/authStore';

jest.mock('../src/api/services/authService', () => ({
  login: jest.fn(),
  refresh: jest.fn(),
  me: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
}));

const mockedLogin = authService.login as jest.MockedFunction<
  typeof authService.login
>;
const getItem = AsyncStorage.getItem as jest.MockedFunction<
  typeof AsyncStorage.getItem
>;
const setItem = AsyncStorage.setItem as jest.MockedFunction<
  typeof AsyncStorage.setItem
>;
const removeItem = AsyncStorage.removeItem as jest.MockedFunction<
  typeof AsyncStorage.removeItem
>;
const setGenericPassword = Keychain.setGenericPassword as jest.MockedFunction<
  typeof Keychain.setGenericPassword
>;

const EMAIL = 'ali@mountainbakes.com';
const PASSWORD = 'hunter2-never-stored';

const session: IssuedSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 900,
  expiresAt: 1_800_000_000,
  user: {
    id: 'u1',
    email: EMAIL,
    displayName: 'Ali',
    username: null,
    role: 'branch_manager',
    branchId: 'b1',
    branchName: 'Gilgit',
    mustChangePassword: false,
  },
};

/** Every string argument ever passed to AsyncStorage.setItem — to prove the password is not among them. */
function everythingWrittenToPlainStorage(): string[] {
  return setItem.mock.calls.flatMap(([key, value]) => [key, value]);
}

beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockImplementation(() => Promise.resolve(null));
  useAuthStore.setState({
    status: 'signedOut',
    user: null,
    accessToken: null,
    rememberedEmail: null,
    onboardingCompleted: false,
  });
});

describe('bootstrap() — onboarding flag', () => {
  it('reports onboardingCompleted=false on a fresh install and ends signed out', async () => {
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().onboardingCompleted).toBe(false);
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('reports onboardingCompleted=true once the flag has been stored', async () => {
    getItem.mockImplementation(key =>
      Promise.resolve(
        key === AUTH_STORAGE_KEYS.onboardingCompleted ? 'true' : null,
      ),
    );
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
  });

  it('still honours the pre-rebuild "seen" flag so existing installs skip onboarding', async () => {
    getItem.mockImplementation(key =>
      Promise.resolve(
        key === AUTH_STORAGE_KEYS.legacyOnboardingSeen ? 'true' : null,
      ),
    );
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
  });

  it('pre-fills the remembered email', async () => {
    getItem.mockImplementation(key =>
      Promise.resolve(key === AUTH_STORAGE_KEYS.rememberedEmail ? EMAIL : null),
    );
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().rememberedEmail).toBe(EMAIL);
  });
});

describe('completeOnboarding()', () => {
  it('flips the flag immediately and persists it', async () => {
    await useAuthStore.getState().completeOnboarding();
    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      AUTH_STORAGE_KEYS.onboardingCompleted,
      'true',
    );
  });
});

describe('login() — remember me', () => {
  it('with Remember me on: saves ONLY the email, keeps the refresh token in the keychain, and signs in', async () => {
    mockedLogin.mockResolvedValue(session);

    await useAuthStore.getState().login(EMAIL, PASSWORD, true);

    expect(mockedLogin).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(setItem).toHaveBeenCalledWith(
      AUTH_STORAGE_KEYS.rememberedEmail,
      EMAIL,
    );
    expect(everythingWrittenToPlainStorage()).not.toContain(PASSWORD);
    expect(setGenericPassword).toHaveBeenCalledTimes(1);
    expect(setGenericPassword).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-1',
      expect.objectContaining({ service: expect.any(String) }),
    );
    expect(setGenericPassword.mock.calls[0]).not.toContain(PASSWORD);

    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.user).toEqual(session.user);
    expect(state.accessToken).toBe('access-1');
    expect(state.rememberedEmail).toBe(EMAIL);
  });

  it('with Remember me off: clears any saved email and remembers nothing', async () => {
    mockedLogin.mockResolvedValue(session);
    useAuthStore.setState({ rememberedEmail: EMAIL });

    await useAuthStore.getState().login(EMAIL, PASSWORD, false);

    expect(removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.rememberedEmail);
    expect(setItem).not.toHaveBeenCalledWith(
      AUTH_STORAGE_KEYS.rememberedEmail,
      expect.anything(),
    );
    expect(everythingWrittenToPlainStorage()).not.toContain(PASSWORD);
    expect(useAuthStore.getState().rememberedEmail).toBeNull();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('rethrows the API error and stays signed out when the credentials are rejected', async () => {
    mockedLogin.mockRejectedValue({
      status: 401,
      message: 'Invalid email or password',
      code: 'invalid_credentials',
    });

    await expect(
      useAuthStore.getState().login(EMAIL, PASSWORD, true),
    ).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(setGenericPassword).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
