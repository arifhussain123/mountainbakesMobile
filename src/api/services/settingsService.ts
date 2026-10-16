import { apiClient } from '../client';
import type { AppSettings } from '../types';

/** `GET /api/settings` — open to any authenticated role (no `requireRole` guard server-side). */
export async function getAppSettings(): Promise<AppSettings> {
  const { settings } = await apiClient.get<{ settings: AppSettings }>('/settings');
  return settings;
}
