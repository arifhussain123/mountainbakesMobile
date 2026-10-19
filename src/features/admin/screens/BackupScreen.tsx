import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  isApiError,
  useBackupHistory,
  useBackupStatus,
  useLatestRestoreTest,
  type BackupJob,
  type BackupStatusResponse,
  type BackupTypeHealth,
} from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { Card, FormBottomSheet, Icon, LoadingSkeleton, SearchBar } from '@/shared/ui';
import { includesTerm } from '@/shared/utils';
import { AdminListScreen } from '../components';
import { DetailRows, NoticeBox, Pill, formatDateTime } from '../components/AdminDetail';
import {
  HEALTH_LABELS,
  HEALTH_TONES,
  STATUS_LABELS,
  STATUS_TONES,
  TYPE_LABELS,
  formatBackupDuration,
  formatBytes,
  keyFileName,
  shortChecksum,
} from './backup/backupFormat';

type ScheduledType = 'daily' | 'weekly' | 'monthly';
const SCHEDULED: ScheduledType[] = ['daily', 'weekly', 'monthly'];

/**
 * Database Backup — the web `/database-backup` page, read side: the three
 * health cards (status, schedule, retention, latest run), the running /
 * failures / restore-test tiles, and the newest 100 runs with search. Tap a
 * run for the web's detail view. Create backup, Verify and Download are web
 * actions and are not on mobile in this phase.
 */
export function BackupScreen() {
  const statusQ = useBackupStatus();
  const historyQ = useBackupHistory();
  const restoreQ = useLatestRestoreTest();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase());
  const [detail, setDetail] = useState<BackupJob | null>(null);
  const sheet = useRef<BottomSheetModal>(null);

  const status = statusQ.data;
  const notConfigured = isApiError(statusQ.error) && statusQ.error.status === 503;
  const jobs = useMemo(() => historyQ.data?.jobs ?? [], [historyQ.data]);
  const rows = useMemo(
    () =>
      !term
        ? jobs
        : jobs.filter(
            (j) =>
              includesTerm(j.backupId, term) ||
              includesTerm(TYPE_LABELS[j.backupType], term) ||
              includesTerm(STATUS_LABELS[j.status], term) ||
              includesTerm(j.s3Key, term) ||
              includesTerm(formatDateTime(j.startedAt), term) ||
              includesTerm(j.checksumSha256, term),
          ),
    [jobs, term],
  );

  const subtitle = `PostgreSQL dumps of the production database, encrypted in S3${
    status ? ` at s3://${status.storage.bucket}/${status.storage.prefix}/ (${status.schedule.timezone})` : ''
  }. Only a verified backup counts.`;

  const refresh = () => {
    void statusQ.refetch();
    void historyQ.refetch();
    void restoreQ.refetch();
  };

  const open = (job: BackupJob) => {
    setDetail(job);
    sheet.current?.present();
  };

  return (
    <>
      <AdminListScreen<BackupJob>
        title="Database Backup"
        subtitle={subtitle}
        data={rows}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => <JobCard job={item} onPress={() => open(item)} />}
        isLoading={historyQ.isLoading}
        error={notConfigured ? null : historyQ.error}
        refreshing={historyQ.isRefetching || statusQ.isRefetching}
        onRefresh={refresh}
        emptyTitle={term ? 'No matches' : 'No backups yet'}
        emptyMessage={term ? 'No backup matches this search.' : 'The first scheduled run will appear here, or create a manual backup now.'}
        header={
          <>
            {notConfigured ? (
              <NoticeBox tone="warning">
                The backup system is not configured on this server yet (missing environment). See docs/database-backup.md in the backend repository.
              </NoticeBox>
            ) : null}
            {statusQ.isLoading ? <LoadingSkeleton height={200} /> : null}
            {status ? (
              <>
                {SCHEDULED.map((t) => (
                  <HealthCard key={t} type={t} status={status} health={status.health[t]} job={status.latest[t]} />
                ))}
                <Tiles status={status} restore={restoreQ.data?.restoreTest ?? null} />
              </>
            ) : null}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search backups…" />
          </>
        }
      />
      <FormBottomSheet
        ref={sheet}
        title={detail?.backupId ?? 'Backup'}
        subtitle={detail ? `${TYPE_LABELS[detail.backupType]} backup · ${STATUS_LABELS[detail.status]} · triggered by ${detail.triggeredByName ?? detail.trigger}` : undefined}
        onRequestClose={() => sheet.current?.dismiss()}>
        {detail ? <JobDetail job={detail} /> : null}
      </FormBottomSheet>
    </>
  );
}

function HealthCard({ type, status, health, job }: { type: ScheduledType; status: BackupStatusResponse; health: BackupTypeHealth; job: BackupJob | null }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{TYPE_LABELS[type]} Backup</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {status.schedule[type]} · kept {status.retention[`${type}Days`]} days
          </Text>
        </View>
        <Pill label={HEALTH_LABELS[health.status] ?? health.status} tone={HEALTH_TONES[health.status] ?? 'neutral'} />
      </View>
      <DetailRows
        rows={[
          { label: 'Last verified', value: health.lastSuccessfulAt ? `${formatDateTime(health.lastSuccessfulAt)} (${health.ageHours}h ago)` : 'never' },
          {
            label: 'Last run',
            value: job ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{formatDateTime(job.startedAt)}</Text>
                <Pill label={STATUS_LABELS[job.status] ?? job.status} tone={STATUS_TONES[job.status] ?? 'neutral'} />
              </View>
            ) : (
              '—'
            ),
          },
          { label: 'Size', value: job?.fileSize ? `${formatBytes(job.fileSize)} + ${formatBytes(job.authFileSize)} auth` : '—' },
          { label: 'S3 location', value: keyFileName(job?.s3Key), mono: true },
          { label: 'Retention until', value: job?.retentionUntil ? formatDateTime(job.retentionUntil) : '—' },
          { label: 'SHA-256', value: shortChecksum(job?.checksumSha256), mono: true },
        ]}
      />
      {job?.errorCategory ? (
        <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 6 }]}>
          {job.errorCategory}: {job.errorMessage}
        </Text>
      ) : null}
    </Card>
  );
}

function Tiles({ status, restore }: { status: BackupStatusResponse; restore: { startedAt: string; status: string } | null }) {
  const theme = useAppTheme();
  const failures = status.health.recentFailures;
  const tile = (icon: 'database' | 'check' | 'warning' | 'calendar', iconColor: string, label: string, value: string) => (
    <Card key={label} style={styles.tile}>
      <Icon name={icon} size={18} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{value}</Text>
      </View>
    </Card>
  );
  return (
    <View style={{ gap: 8 }}>
      {tile('database', theme.colors.textSecondary, 'Running now', status.running.length === 0 ? 'Nothing' : status.running.map((r) => r.backupId).join(', '))}
      {tile(failures > 0 ? 'warning' : 'check', failures > 0 ? theme.colors.danger : theme.colors.success, 'Failures, last 7 days', String(failures))}
      {tile('calendar', theme.colors.textSecondary, 'Last restore test', restore ? `${formatDateTime(restore.startedAt)} — ${restore.status}` : 'never')}
    </View>
  );
}

function JobCard({ job, onPress }: { job: BackupJob; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${TYPE_LABELS[job.backupType]} backup ${job.backupId}, ${STATUS_LABELS[job.status]}`}>
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDateTime(job.startedAt)}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{TYPE_LABELS[job.backupType] ?? job.backupType}</Text>
          </View>
          <Pill label={STATUS_LABELS[job.status] ?? job.status} tone={STATUS_TONES[job.status] ?? 'neutral'} />
        </View>
        <DetailRows
          rows={[
            { label: 'Backup ID', value: job.backupId, mono: true },
            { label: 'Size', value: formatBytes(job.fileSize) },
            { label: 'Duration', value: formatBackupDuration(job.durationMs) },
            { label: 'S3 Key', value: job.s3Key ?? '—', mono: true },
            { label: 'Retention Until', value: job.retentionUntil ? formatDateTime(job.retentionUntil) : '—' },
            { label: 'SHA-256', value: shortChecksum(job.checksumSha256), mono: true },
          ]}
        />
      </Card>
    </Pressable>
  );
}

/** The web's backup detail dialog, every row. */
function JobDetail({ job: d }: { job: BackupJob }) {
  return (
    <View>
      <DetailRows
        rows={[
          { label: 'Started', value: formatDateTime(d.startedAt) },
          { label: 'Completed', value: d.completedAt ? formatDateTime(d.completedAt) : '—' },
          {
            label: 'Duration',
            value: `${formatBackupDuration(d.durationMs)} (dump ${formatBackupDuration(d.dumpMs)}, upload ${formatBackupDuration(d.uploadMs)})`,
          },
          { label: 'Bucket', value: d.s3Bucket ?? '—', mono: true },
          { label: 'Main archive', value: d.s3Key ?? '—', mono: true },
          { label: 'Main size', value: formatBytes(d.fileSize) },
          { label: 'Main SHA-256', value: d.checksumSha256 ?? '—', mono: true },
          { label: 'Auth archive', value: d.authS3Key ?? '—', mono: true },
          { label: 'Auth size', value: formatBytes(d.authFileSize) },
          { label: 'Auth SHA-256', value: d.authChecksumSha256 ?? '—', mono: true },
          { label: 'Manifest', value: d.manifestS3Key ?? '—', mono: true },
          { label: 'Retention until', value: d.retentionUntil ? formatDateTime(d.retentionUntil) : '—' },
          { label: 'PostgreSQL', value: d.databaseVersion ?? '—' },
          { label: 'pg_dump', value: d.pgDumpVersion ?? '—' },
          { label: 'App version', value: d.appVersion ?? '—' },
          { label: 'Environment', value: d.environment ?? '—' },
          { label: 'Attempts', value: d.attempts === undefined ? '—' : String(d.attempts) },
          { label: 'Last verified', value: d.lastVerifiedAt ? formatDateTime(d.lastVerifiedAt) : '—' },
          { label: 'Error', value: d.errorCategory ? `${d.errorCategory}: ${d.errorMessage ?? ''}` : '—' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
});
