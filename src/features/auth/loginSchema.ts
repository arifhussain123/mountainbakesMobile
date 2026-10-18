import { z } from 'zod';

/**
 * No client-side password length rule — `authService.login` just forwards
 * whatever is typed to `POST /auth/login` and the backend is the source of
 * truth for credential strength; a client-side minimum would reject a
 * legitimately short existing password the server accepts.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
