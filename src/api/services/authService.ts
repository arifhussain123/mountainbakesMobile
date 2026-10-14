import { apiClient } from '../client';
import type { IssuedSession, MeResponse } from '../types';

export async function login(identifier: string, password: string): Promise<IssuedSession> {
  return apiClient.post<IssuedSession>('/auth/login', { identifier, password, client: 'mobile' });
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
