import type { BackupHealthStatus, BackupJobStatus, BackupJobType } from '@/api';
import type { PillTone } from '../../components/AdminDetail';

/** The web's `backupFormat.tsx`. Only `verified` is green: an upload nobody has read back is not yet a backup. */
export const STATUS_LABELS: Record<BackupJobStatus, string> = {
  running: 'Running',
  success: 'Uploaded',
  verified: 'Verified',
  failed: 'Failed',
  stale: 'Interrupted',
};

export const STATUS_TONES: Record<BackupJobStatus, PillTone> = {
  running: 'info',
  success: 'warning',
  verified: 'success',
  failed: 'danger',
  stale: 'danger',
};

export const HEALTH_LABELS: Record<BackupHealthStatus, string> = {
  healthy: 'Healthy',
  overdue: 'Overdue',
  failed: 'Last run failed',
  never: 'No backup yet',
};

export const HEALTH_TONES: Record<BackupHealthStatus, PillTone> = {
  healthy: 'success',
  overdue: 'warning',
  failed: 'danger',
  never: 'neutral',
};

export const TYPE_LABELS: Record<BackupJobType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  manual: 'Manual',
};

export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatBackupDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/** First 12 hex characters — enough to compare by eye; the full hash is in the detail sheet. */
export function shortChecksum(sha: string | null | undefined): string {
  return sha ? `${sha.slice(0, 12)}…` : '—';
}

/** 'database-backups/daily/2026/09/mountainbakes-daily-2026-09-21.dump' → the file name. */
export function keyFileName(key: string | null | undefined): string {
  return key ? (key.split('/').pop() ?? key) : '—';
}
