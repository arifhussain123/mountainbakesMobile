/**
 * @format
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as authService from '@/api/services/authService';
import type { IssuedSession } from '@/api/types';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { LOGIN_MESSAGES } from '@/features/auth/loginErrors';
import { selectAuthRoute } from '@/navigation/authRoute';
import { useAuthStore } from '@/state/authStore';

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

const session: IssuedSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 900,
  expiresAt: 1_800_000_000,
  user: {
    id: 'u1',
    email: 'ali@mountainbakes.com',
    displayName: 'Ali',
    username: null,
    role: 'branch_manager',
    branchId: 'b1',
    branchName: 'Gilgit',
    mustChangePassword: false,
  },
};

type LoginHook = ReturnType<typeof useLogin>;

function renderUseLogin() {
  const latest: { current: LoginHook | null } = { current: null };
  function Harness() {
    latest.current = useLogin();
    return null;
  }
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  return {
    latest,
    unmount: () => {
      act(() => renderer?.unmount());
      // Drops the mutation cache's garbage-collection timer so the worker exits cleanly.
      client.clear();
    },
  };
}

/** TanStack Query notifies observers on a macrotask; flush until the mutation has settled. */
async function settle(latest: { current: LoginHook | null }) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 0));
    });
    const state = latest.current;
    if (
      state &&
      !state.isPending &&
      (state.isSuccess || state.errorMessage !== null)
    )
      return;
  }
  throw new Error('login mutation never settled');
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    status: 'signedOut',
    user: null,
    accessToken: null,
    rememberedEmail: null,
    onboardingCompleted: true,
  });
});

describe('useLogin', () => {
  it('on success signs the store in, which routes the app to Main', async () => {
    mockedLogin.mockResolvedValue(session);
    const { latest, unmount } = renderUseLogin();

    act(() =>
      latest.current!.submit({
        email: ' ali@mountainbakes.com ',
        password: 'hunter2',
        rememberMe: true,
      }),
    );
    await settle(latest);

    expect(mockedLogin).toHaveBeenCalledWith(
      'ali@mountainbakes.com',
      'hunter2',
    );
    expect(latest.current!.errorMessage).toBeNull();
    expect(latest.current!.isPending).toBe(false);
    const { status, onboardingCompleted, user } = useAuthStore.getState();
    expect(status).toBe('signedIn');
    expect(user?.branchId).toBe('b1');
    expect(selectAuthRoute(status, onboardingCompleted)).toBe('main');
    unmount();
  });

  it('on 401 shows "Email or password is incorrect." and leaves the button usable', async () => {
    mockedLogin.mockRejectedValue({
      status: 401,
      message: 'Invalid email or password',
      code: 'invalid_credentials',
    });
    const { latest, unmount } = renderUseLogin();

    act(() =>
      latest.current!.submit({
        email: 'ali@mountainbakes.com',
        password: 'wrong',
        rememberMe: false,
      }),
    );
    await settle(latest);

    expect(latest.current!.errorMessage).toBe(
      LOGIN_MESSAGES.invalidCredentials,
    );
    expect(latest.current!.isPending).toBe(false);
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(selectAuthRoute(useAuthStore.getState().status, true)).toBe('login');
    unmount();
  });

  it('when the request never reaches the server shows the offline sentence', async () => {
    mockedLogin.mockRejectedValue({
      status: null,
      message:
        'No internet connection. Please check your network and try again.',
      code: 'network',
    });
    const { latest, unmount } = renderUseLogin();

    act(() =>
      latest.current!.submit({
        email: 'ali@mountainbakes.com',
        password: 'hunter2',
        rememberMe: true,
      }),
    );
    await settle(latest);

    expect(latest.current!.errorMessage).toBe(LOGIN_MESSAGES.offline);
    expect(latest.current!.isPending).toBe(false);
    expect(useAuthStore.getState().status).toBe('signedOut');
    unmount();
  });

  it('on 429 / 5xx shows the generic retry sentence, and clearError dismisses it', async () => {
    mockedLogin.mockRejectedValue({
      status: 429,
      message:
        'Too many sign-in attempts. Please wait a few minutes and try again.',
    });
    const { latest, unmount } = renderUseLogin();

    act(() =>
      latest.current!.submit({
        email: 'ali@mountainbakes.com',
        password: 'hunter2',
        rememberMe: true,
      }),
    );
    await settle(latest);
    expect(latest.current!.errorMessage).toBe(LOGIN_MESSAGES.retry);

    act(() => latest.current!.clearError());
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 0));
    });
    expect(latest.current!.errorMessage).toBeNull();
    unmount();
  });
});
