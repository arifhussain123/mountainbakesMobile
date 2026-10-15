import { useMutation } from '@tanstack/react-query';
import { authService } from '../services';

export function useLogin() {
  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) => authService.login(identifier, password),
  });
}
