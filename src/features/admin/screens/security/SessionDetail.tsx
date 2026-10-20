import { Text, View } from 'react-native';
import { useSecuritySession, type SecuritySession } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { LoadingSkeleton } from '@/shared/ui';
import { ActionChip } from '../../components';
import { DetailHeading, DetailRows, MONO, NoticeBox, Pill, formatDateOnly, formatDateTime } from '../../components/AdminDetail';
import {
  EMAIL_NOT_RECORDED,
  LOCATION_SOURCE_LABELS,
  STATE_LABELS,
  STATE_TONES,
  formatBrowser,
  formatLocation,
  formatPlatform,
  formatSessionDuration,
  roleChip,
} from './sessionFormat';

/**
 * The web's "Session detail" dialog: `GET /api/login-history/:id` (fetched,
 * not passed down — the server may reveal an address the list masked, and
 * records the view in its audit log), with "Sign out this session" when the
 * session can still be ended.
 */
export function SessionDetail({ sessionId, onRevoke }: { sessionId: string; onRevoke?: (session: SecuritySession) => void }) {
  const theme = useAppTheme();
  const q = useSecuritySession(sessionId);
  const s = q.data;

  if (q.isLoading) return <LoadingSkeleton height={240} />;
  if (q.isError || !s) {
    return (
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 24 }]}>
        That session could not be loaded. It may have been removed.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {s.userName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }, MONO]}>{s.userCode ?? 'No staff ID'}</Text>
        </View>
        <Pill label={STATE_LABELS[s.state] ?? s.state} tone={STATE_TONES[s.state] ?? 'neutral'} />
      </View>

      {s.isSuspicious ? (
        <NoticeBox tone="warning" title="Unusual sign-in">
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{s.suspiciousReason}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 4 }]}>
            Worth reviewing, not proof of anything. VPNs, mobile networks and approximate IP locations all produce this.
          </Text>
        </NoticeBox>
      ) : null}

      {s.state === 'revoked' ? (
        <NoticeBox tone="neutral" title={`Signed out by ${s.revokedByName ?? '—'}`}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatDateTime(s.revokedAt)}</Text>
          {s.revokeReason ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{s.revokeReason}</Text> : null}
        </NoticeBox>
      ) : null}

      <DetailHeading title="User" />
      <DetailRows
        rows={[
          { label: 'Mountain Bakes ID', value: s.userCode ?? '—', mono: true },
          { label: 'Role', value: roleChip(s.userRole) },
          { label: 'Branch', value: s.branchName || '—' },
          {
            label: 'Browser (Google) email',
            value: `${s.browserEmail || EMAIL_NOT_RECORDED}${s.browserEmail && s.emailMasked ? ' (hidden)' : ''}`,
          },
        ]}
      />

      <DetailHeading title="Session" />
      <DetailRows
        rows={[
          { label: 'Signed in', value: formatDateTime(s.loginAt) },
          { label: s.endedAt ? 'Ended' : 'Last active', value: formatDateTime(s.endedAt ?? s.lastSeenAt) },
          { label: 'Duration', value: formatSessionDuration(s.durationMs) },
          { label: 'Business day', value: formatDateOnly(s.date) },
        ]}
      />

      <DetailHeading title="Location" />
      <DetailRows
        rows={[
          { label: 'Location', value: formatLocation(s) },
          { label: 'Region', value: s.region || '—' },
          { label: 'Timezone', value: s.timezone || '—' },
          { label: 'IP address', value: s.ipAddress || '—', mono: true },
          { label: 'Source', value: LOCATION_SOURCE_LABELS[s.locationSource] ?? s.locationSource },
          s.latitude !== null && s.longitude !== null
            ? {
                label: 'Coordinates',
                value: `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)} (${s.locationSource === 'IP' ? 'city centre, approximate' : 'device fix'})`,
                mono: true,
              }
            : null,
        ]}
      />

      <DetailHeading title="Device" />
      <DetailRows
        rows={[
          { label: 'Browser', value: formatBrowser(s) },
          { label: 'Platform', value: formatPlatform(s) },
          { label: 'OS version', value: s.osVersion || '—' },
          s.deviceName ? { label: 'Model', value: s.deviceName } : null,
          s.screenSize ? { label: 'Screen', value: `${s.screenSize} (device-reported)` } : null,
        ]}
      />

      <DetailHeading title="Security" />
      <DetailRows
        rows={[
          { label: 'Session ID', value: s.id, mono: true },
          { label: 'Auth session', value: s.authSessionId ?? 'not recorded', mono: true },
          { label: 'Sign-in method', value: 'Email and password' },
        ]}
      />

      {s.userAgent ? (
        <>
          <DetailHeading title="Raw user agent" />
          <Text selectable style={[theme.typography.label, { color: theme.colors.text, backgroundColor: theme.colors.cardFill, padding: 10, borderRadius: 8 }, MONO]}>
            {s.userAgent}
          </Text>
        </>
      ) : null}

      {onRevoke && s.canRevoke ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
          <ActionChip icon="logout" label="Sign out this session" danger onPress={() => onRevoke(s)} />
        </View>
      ) : null}
    </View>
  );
}
