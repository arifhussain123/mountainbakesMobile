import { useMutation } from '@tanstack/react-query';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useAuthStore } from '@/state';
import { mapLoginError } from '../loginErrors';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * The sign-in mutation. Goes through `authStore.login`, which calls
 * POST /auth/login, stores the refresh token in the Keychain, saves (or
 * clears) the remembered email, mirrors the user/branch into SQLite and flips
 * `status` to `signedIn` — which is what moves the root navigator to Main.
 *
 * `errorMessage` is derived, not stored: the same failure always reads the
 * same way, and `clearError` (the banner's dismiss) resets the mutation.
 */
export function useLogin() {
  const login = useAuthStore(state => state.login);
  const { isOffline } = useNetworkStatus();

  const mutation = useMutation({
    mutationFn: ({ email, password, rememberMe }: LoginInput) =>
      login(email.trim(), password, rememberMe),
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    errorMessage: mutation.error
      ? mapLoginError(mutation.error, { isOffline })
      : null,
    clearError: mutation.reset,
  };
}
