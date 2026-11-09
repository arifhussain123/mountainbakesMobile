import { apiClient } from '../client';
import type { IssuedSession, MeResponse } from '../types';

/**
 * POST /api/auth/login — the same endpoint the web client signs in through
 * (`mountainbakes-frontend/src/lib/auth/session.ts`); neither client talks to
 * Supabase Auth directly. `identifier` is an email address or a username.
 */
export async function login(
  identifier: string,
  password: string,
): Promise<IssuedSession> {
  return apiClient.post<IssuedSession>('/auth/login', {
    identifier,
    password,
    client: 'mobile',
  });
}

export async function refresh(refreshToken: string): Promise<IssuedSession> {
  return apiClient.post<IssuedSession>('/auth/refresh', { refreshToken });
}

export async function me(): Promise<MeResponse> {
  return apiClient.get<MeResponse>('/auth/me');
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/**
 * POST /api/auth/forgot-password with `deliver: true` — the server mails a
 * reset link to Administrator accounts and answers `{ allowed: true }`. Every
 * other address (branch, production, finance, unknown) gets a 403 with the
 * fixed "only available for Administrator accounts" message, which the screen
 * shows verbatim: that is the product's recovery policy, not a bug.
 */
export async function forgotPassword(
  email: string,
): Promise<{ allowed: boolean }> {
  return apiClient.post<{ allowed: boolean }>('/auth/forgot-password', {
    email,
    deliver: true,
  });
}
