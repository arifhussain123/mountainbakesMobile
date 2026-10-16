/**
 * @format
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/api/services', () => ({
  authService: {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  },
}));

import { authService } from '@/api/services';
import { useAuthStore } from '@/state/authStore';

const FAKE_SESSION = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 3600,
  expiresAt: Date.now() + 3_600_000,
  user: { id: 'u1', email: 'branch@mountainbakes.com', displayName: null, username: null, role: 'branch_manager' as const, branchId: 'b1', branchName: 'Committee Chowk', mustChangePassword: false },
};

const REMEMBERED_EMAIL_KEY = 'mountainbakes.rememberedEmail';

describe('authStore.login — remember me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.login as jest.Mock).mockResolvedValue(FAKE_SESSION);
  });

  it('saves the email when rememberMe is true', async () => {
    await useAuthStore.getState().login('branch@mountainbakes.com', 'secret', true);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(REMEMBERED_EMAIL_KEY, 'branch@mountainbakes.com');
    expect(useAuthStore.getState().rememberedEmail).toBe('branch@mountainbakes.com');
  });

  it('clears the saved email when rememberMe is false, and never persists the password', async () => {
    await useAuthStore.getState().login('branch@mountainbakes.com', 'secret', false);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REMEMBERED_EMAIL_KEY);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(REMEMBERED_EMAIL_KEY, expect.anything());
    const persistedCalls = [...(AsyncStorage.setItem as jest.Mock).mock.calls, ...(AsyncStorage.removeItem as jest.Mock).mock.calls];
    expect(persistedCalls.flat().some((arg) => arg === 'secret')).toBe(false);
  });

  it('signs the user in on success regardless of rememberMe', async () => {
    await useAuthStore.getState().login('branch@mountainbakes.com', 'secret', false);

    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().user?.email).toBe('branch@mountainbakes.com');
  });
});
