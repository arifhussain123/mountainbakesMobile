import { useMutation } from '@tanstack/react-query';
import { authService } from '../services';

/**
 * Signing IN is not here: it lives in `features/auth/hooks/useLogin.ts`,
 * because it has to go through `authStore.login` (keychain, remembered email,
 * SQLite session cache) rather than call the endpoint bare.
 */

/** POST /auth/forgot-password — Administrator accounts only, by server policy (a 403 with a fixed message for anyone else). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });
}
