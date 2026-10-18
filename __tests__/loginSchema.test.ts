/**
 * @format
 */
import { loginSchema } from '@/features/auth/loginSchema';

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({ email: 'branch@mountainbakes.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password without imposing a minimum length', () => {
    const empty = loginSchema.safeParse({ email: 'branch@mountainbakes.com', password: '' });
    expect(empty.success).toBe(false);

    // No client-side length rule — a short password the server already accepts must still pass here.
    const short = loginSchema.safeParse({ email: 'branch@mountainbakes.com', password: 'ab' });
    expect(short.success).toBe(true);
  });
});
