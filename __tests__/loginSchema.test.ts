/**
 * @format
 */
import type { ResolverOptions } from 'react-hook-form';
import {
  loginFormSchema,
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/loginSchema';
import { zodResolver } from '@/shared/forms';

describe('loginSchema', () => {
  it('accepts a valid email and any non-empty password, trimming the email', () => {
    const result = loginSchema.safeParse({
      email: '  Ali@MountainBakes.com ',
      password: 'x',
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data).toEqual({
        email: 'Ali@MountainBakes.com',
        password: 'x',
      });
  });

  it('requires an email', () => {
    const result = loginSchema.safeParse({ email: '   ', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]).toMatchObject({
        path: ['email'],
        message: 'Enter your email.',
      });
  });

  it('rejects a malformed email', () => {
    const result = loginSchema.safeParse({ email: 'ali@', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]).toMatchObject({
        path: ['email'],
        message: 'Enter a valid email address.',
      });
  });

  it('requires a password but imposes no length rule (the server checks min(1) only)', () => {
    expect(
      loginSchema.safeParse({ email: 'ali@mountainbakes.com', password: 'a' })
        .success,
    ).toBe(true);
    const empty = loginSchema.safeParse({
      email: 'ali@mountainbakes.com',
      password: '',
    });
    expect(empty.success).toBe(false);
    if (!empty.success)
      expect(empty.error.issues[0]).toMatchObject({
        path: ['password'],
        message: 'Enter your password.',
      });
  });

  it('loginFormSchema adds the Remember me flag', () => {
    expect(
      loginFormSchema.safeParse({
        email: 'ali@mountainbakes.com',
        password: 'x',
        rememberMe: true,
      }).success,
    ).toBe(true);
    expect(
      loginFormSchema.safeParse({
        email: 'ali@mountainbakes.com',
        password: 'x',
      }).success,
    ).toBe(false);
  });
});

describe('zodResolver', () => {
  const options = {
    fields: {},
    shouldUseNativeValidation: false,
  } as ResolverOptions<LoginFormValues>;

  it('shapes Zod issues into react-hook-form field errors, one per field', async () => {
    const resolve = zodResolver(loginFormSchema);
    const result = await resolve(
      { email: '', password: '', rememberMe: true },
      undefined,
      options,
    );
    expect(result.values).toEqual({});
    expect(result.errors).toEqual({
      email: { type: expect.any(String), message: 'Enter your email.' },
      password: { type: expect.any(String), message: 'Enter your password.' },
    });
  });

  it('returns the parsed values and no errors when the form is valid', async () => {
    const resolve = zodResolver(loginFormSchema);
    const result = await resolve(
      {
        email: ' ali@mountainbakes.com ',
        password: 'secret',
        rememberMe: false,
      },
      undefined,
      options,
    );
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({
      email: 'ali@mountainbakes.com',
      password: 'secret',
      rememberMe: false,
    });
  });
});
