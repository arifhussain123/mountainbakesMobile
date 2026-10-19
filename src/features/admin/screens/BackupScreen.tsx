import { useMemo } from 'react';
import { useBackupHealth, useBackupJobPages, type BackupHealthStatus, type BackupJob, type BackupJobStatus } from '@/api';
import type { StatusVariant } from '@/shared/ui';
import { formatCount, formatDisplayDate, formatDisplayTime, formatRelativeTime } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles, type SummaryTile } from '../components';

const JOB_VARIANT: Record<BackupJobStatus, StatusVariant> = { running: 'info', success: 'success', verified: 'success', failed: 'danger', stale: 'warning' };
const HEALTH_TONE: Record<BackupHealthStatus, SummaryTile['tone']> = { healthy: 'success', overdue: 'warning', failed: 'danger', never: 'warning' };

function formatSize(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Backup health per schedule (age-based, from the server) and every run, newest first. */
export function BackupScreen() {
  const healthQ = useBackupHealth();
  const q = useBackupJobPages();
  const jobs = useMemo(() => q.data?.pages.flatMap((p) => p.jobs) ?? [], [q.data]);
  const h = healthQ.data;

  const healthTile = (label: string, t: NonNullable<typeof h>['daily']): SummaryTile => ({
    label: `${label} · ${t.lastSuccessfulAt ? formatRelativeTime(t.lastSuccessfulAt) : 'never'}`,
    value: t.status[0].toUpperCase() + t.status.slice(1),
    tone: HEALTH_TONE[t.status],
  });

  return (
    <AdminListScreen<BackupJob>
      title="Database Backup"
      subtitle="Backup health and run history. Read-only."
      data={jobs}
      keyExtractor={(j) => j.id}
      renderItem={({ item }) => (
        <AdminRow
          title={`${item.backupType[0].toUpperCase()}${item.backupType.slice(1)} · ${item.backupId}`}
          lines={[
            `${formatDisplayDate(item.startedAt.slice(0, 10))} · ${formatDisplayTime(item.startedAt)} · ${item.trigger}${item.triggeredByName ? ` by ${item.triggeredByName}` : ''}`,
            [formatSize(item.fileSize), item.durationMs ? `${Math.round(item.durationMs / 1000)} s` : null].filter(Boolean).join(' · ') || null,
            item.errorMessage,
          ]}
          badge={{ label: item.status[0].toUpperCase() + item.status.slice(1), variant: JOB_VARIANT[item.status] ?? 'neutral' }}
        />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching && !q.isFetchingNextPage}
      onRefresh={() => {
        void q.refetch();
        void healthQ.refetch();
      }}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
      }}
      loadingMore={q.isFetchingNextPage}
      emptyTitle="No Backup Runs"
      emptyMessage="Runs appear here once a backup is started."
      header={
        h ? (
          <SummaryTiles
            tiles={[
              healthTile('Daily', h.daily),
              healthTile('Weekly', h.weekly),
              healthTile('Monthly', h.monthly),
              { label: 'Failures, 7 days', value: formatCount(h.recentFailures), tone: h.recentFailures > 0 ? 'danger' : undefined },
            ]}
          />
        ) : null
      }
    />
  );
}
