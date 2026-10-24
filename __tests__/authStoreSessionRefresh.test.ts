/**
 * @format
 */
import * as Keychain from 'react-native-keychain';

jest.mock('@/api/services', () => ({
  authService: {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  },
}));

// Capture the handlers authStore wires into the API client at module load.
jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  setRefreshHandler: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));

import { authService } from '@/api/services';
import { setRefreshHandler, type RefreshOutcome } from '@/api/client';
import { useAuthStore } from '@/state/authStore';

const refresh = (setRefreshHandler as jest.Mock).mock.calls[0][0] as () => Promise<RefreshOutcome>;

const FAKE_SESSION = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresIn: 900,
  expiresAt: Date.now() + 900_000,
  user: { id: 'u1', email: 'branch@mountainbakes.com', displayName: null, username: null, role: 'branch_manager' as const, branchId: 'b1', branchName: 'Committee Chowk', mustChangePassword: false },
};

describe('authStore token refresh — only the server refusing it ends the session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({ username: 'refreshToken', password: 'refresh-1' });
    useAuthStore.setState({ status: 'signedIn', accessToken: 'access-1' });
  });

  it('renews the session on success', async () => {
    (authService.refresh as jest.Mock).mockResolvedValue(FAKE_SESSION);
    await expect(refresh()).resolves.toBe('refreshed');
    expect(useAuthStore.getState().accessToken).toBe('access-2');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith('refreshToken', 'refresh-2', expect.anything());
  });

  it.each([
    ['no network / timeout', { status: null, message: 'No internet connection.' }],
    ['a 5xx', { status: 503, message: 'Service unavailable' }],
    ['rate limited', { status: 429, message: 'Too many requests' }],
  ])('keeps the session on %s', async (_label, error) => {
    (authService.refresh as jest.Mock).mockRejectedValue(error);
    await expect(refresh()).resolves.toBe('unavailable');
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('keeps the session when the keychain read itself fails', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('keychain busy'));
    await expect(refresh()).resolves.toBe('unavailable');
  });

  it.each([401, 403])('reports a %s refusal as rejected', async (status) => {
    (authService.refresh as jest.Mock).mockRejectedValue({ status, message: 'This session was signed out.' });
    await expect(refresh()).resolves.toBe('rejected');
  });

  it('shares one refresh between requests that 401 together', async () => {
    let resolve!: (v: typeof FAKE_SESSION) => void;
    (authService.refresh as jest.Mock).mockReturnValue(new Promise((r) => { resolve = r; }));
    const all = Promise.all([refresh(), refresh(), refresh()]);
    await new Promise((r) => setImmediate(r));
    resolve(FAKE_SESSION);
    await expect(all).resolves.toEqual(['refreshed', 'refreshed', 'refreshed']);
    expect(authService.refresh).toHaveBeenCalledTimes(1);
  });
});

describe('authStore bootstrap — a server hiccup at launch keeps the stored token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({ username: 'refreshToken', password: 'refresh-1' });
  });

  it('does not clear the token on a 5xx', async () => {
    (authService.refresh as jest.Mock).mockRejectedValue({ status: 502, message: 'Bad gateway' });
    await useAuthStore.getState().bootstrap();
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
  });

  it('clears it when the server refuses the token', async () => {
    (authService.refresh as jest.Mock).mockRejectedValue({ status: 401, message: 'Signed out' });
    await useAuthStore.getState().bootstrap();
    expect(Keychain.resetGenericPassword).toHaveBeenCalled();
  });
});
