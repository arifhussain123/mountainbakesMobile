import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useActiveSessions, type ActiveSessionGroup } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card, EmptyState, ErrorState, Icon, LoadingSkeleton, SecondaryButton } from '@/shared/ui';
import { formatCount } from '@/shared/utils';
import { SummaryTiles } from '../../components';
import { MONO, NoticeBox, Pill, formatClock } from '../../components/AdminDetail';
import { EMAIL_NOT_RECORDED, STATE_LABELS, STATE_TONES, formatBrowser, formatLocation, formatPlatform, formatSessionDuration, roleChip } from './sessionFormat';

/**
 * Security → Active Sessions (`GET /api/login-history/active`): everything
 * signed in now, grouped by account, with the unusual-activity banner and the
 * three counts. Groups start collapsed; tapping one shows its sessions. The
 * web's "Sign out" / "Sign out all sessions" are not offered on mobile yet.
 */
export function ActiveSessionsTab({ header, onView }: { header: ReactNode; onView: (sessionId: string) => void }) {
  const theme = useAppTheme();
  const q = useActiveSessions();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const data = q.data;
  const flagged = (data?.groups ?? []).filter((g) => g.multiCountry || g.hasSuspicious);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <FlatList
      data={q.isLoading || q.error ? [] : (data?.groups ?? [])}
      keyExtractor={(g, i) => g.userId ?? g.userCode ?? `${g.userName}-${i}`}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: theme.spacing.sm }}>
          {header}
          {flagged.length > 0 ? (
            <NoticeBox
              tone="warning"
              title={flagged.length === 1 ? 'One account has unusual sign-in activity' : `${flagged.length} accounts have unusual sign-in activity`}>
              {`${flagged.map((g) => g.userCode ?? g.userName).join(' · ')} — signed in from more than one country at once, or on a device or from a place this account has not used before. Review the sessions below before acting; a VPN, a roaming SIM, a new phone and an approximate IP location all look exactly like this.`}
            </NoticeBox>
          ) : null}
          {data ? (
            <SummaryTiles
              tiles={[
                { label: 'Live sessions', value: formatCount(data.totalSessions) },
                { label: 'Accounts signed in', value: formatCount(data.totalUsers) },
                { label: 'In multiple countries', value: formatCount(data.multiCountryUsers), tone: data.multiCountryUsers > 0 ? 'danger' : undefined },
              ]}
            />
          ) : null}
          {q.isLoading ? <LoadingSkeleton height={160} /> : null}
          {q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={
        !q.isLoading && !q.error ? (
          <EmptyState title="Nobody is signed in" message="A session counts as live while its tab has checked in within the last ten minutes." />
        ) : undefined
      }
      renderItem={({ item, index }) => {
        const key = item.userId ?? item.userCode ?? `${item.userName}-${index}`;
        return <GroupCard group={item} open={expanded.has(key)} onToggle={() => toggle(key)} onView={onView} />;
      }}
    />
  );
}

function GroupCard({ group: g, open, onToggle, onView }: { group: ActiveSessionGroup; open: boolean; onToggle: () => void; onView: (id: string) => void }) {
  const theme = useAppTheme();
  const many = g.sessionCount > 1;
  const first = g.sessions[0];
  return (
    <Card style={[styles.card, g.multiCountry ? { borderColor: theme.colors.warning } : null]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.head}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} color={theme.colors.textSecondary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.inline}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }, MONO]}>{g.userCode ?? '—'}</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
              {g.userName}
            </Text>
            {g.userRole ? <Pill label={roleChip(g.userRole)} tone="neutral" /> : null}
          </View>
          <Text
            style={[theme.typography.label, { color: theme.colors.textSecondary, fontStyle: g.userEmail ? 'normal' : 'italic' }]}
            numberOfLines={1}>
            {g.userEmail || EMAIL_NOT_RECORDED}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {many || !first ? `${g.sessionCount} active sessions` : `${formatBrowser(first)} · ${formatLocation(first)}`}
            {` · last active ${formatClock(g.lastSeenAt)}`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {g.hasSuspicious ? <Icon name="warning" size={16} color={theme.colors.warning} /> : null}
          <Pill label={String(g.sessionCount)} tone="success" />
        </View>
      </Pressable>

      {g.multiCountry ? (
        <View style={{ marginTop: 8 }}>
          <NoticeBox tone="warning">
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>
              <Text style={{ fontWeight: '700' }}>{`Signed in from ${g.countries.length} countries: `}</Text>
              {`${g.countries.join(' · ')}. Review the sessions below — a VPN, a roaming SIM or an approximate IP location all look like this.`}
            </Text>
          </NoticeBox>
        </View>
      ) : null}

      {open
        ? g.sessions.map((s) => (
            <View key={s.id} style={[styles.session, { borderTopColor: theme.colors.border }]}>
              <View style={styles.inline}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flexShrink: 1 }]}>
                  {formatBrowser(s)} · {formatPlatform(s)}
                </Text>
                <Pill label={STATE_LABELS[s.state] ?? s.state} tone={STATE_TONES[s.state] ?? 'neutral'} />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {formatLocation(s)} · signed in {formatClock(s.loginAt)} · last active {formatClock(s.lastSeenAt)} · {formatSessionDuration(s.durationMs)}
              </Text>
              {s.isSuspicious && s.suspiciousReason ? (
                <Text style={[theme.typography.label, { color: theme.colors.warning }]}>{s.suspiciousReason}</Text>
              ) : null}
              <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                <SecondaryButton label="View" onPress={() => onView(s.id)} />
              </View>
            </View>
          ))
        : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  session: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10, gap: 3 },
});
