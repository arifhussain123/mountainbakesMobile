import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/state';
import type { LoginFormValues } from './loginSchema';

export interface LoginMutationInput extends LoginFormValues {
  rememberMe: boolean;
}

/**
 * Wraps `authStore.login` (not `api/services/authService.login` directly) —
 * the store is what persists the refresh token to Keychain, saves/clears the
 * remembered email, and hydrates `user`/`status` on success; a mutation that
 * called the service directly would sign the user in without any of that.
 */
export function useLogin() {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: ({ email, password, rememberMe }: LoginMutationInput) => login(email, password, rememberMe),
  });
}
