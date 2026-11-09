import { z } from 'zod';

/**
 * What the Login screen checks before it calls the server.
 *
 * Password: required only. The server's sign-in route checks `min(1)` and
 * nothing else — strength rules apply when a password is SET
 * (`StrongPasswordSchema`), never when it is typed to sign in, so a client-side
 * length rule here would lock out a valid old password.
 *
 * Email: must be a valid address. (The server's `identifier` also accepts a
 * username; this screen is specified as email-only — loosen this one line if
 * username sign-in is wanted on mobile.)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email.')
    .pipe(z.email('Enter a valid email address.')),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

/** The whole form, including the "Remember me" checkbox. */
export const loginFormSchema = loginSchema.extend({
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
