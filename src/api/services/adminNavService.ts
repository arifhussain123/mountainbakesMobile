import { apiClient } from '../client';
import type { BackupHealth } from '../types';

/** `GET /api/admin/backups/health` — super_admin only. */
export async function getBackupHealth(): Promise<BackupHealth> {
  return apiClient.get<BackupHealth>('/admin/backups/health');
}

/**
 * Suspicious sign-ins on or after `from` (a business date), counted by the
 * server: one row is asked for and only `total` is read.
 */
export async function countSuspiciousSignIns(from: string): Promise<number> {
  const page = await apiClient.get<{ total: number }>('/login-history', { suspiciousOnly: 'true', from, page: 1, pageSize: 1 });
  return page.total;
}
