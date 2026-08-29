import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBLedgerTable,
  MBSearchBar,
  MBSectionHeader,
  MBSkeletonList,
  type LedgerColumn,
  type LedgerRow,
} from '@/common/ui';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import { getLoginHistory } from '@/api/services/loginHistoryService';
import type { LoginSession } from '@/shared/types/login-session.types';
import { formatBusinessDate } from '@/common/helpers/businessDay';

/**
 * Sign-in history on the branch dashboard.
 *
 * ---------------------------------------------------------------------------
 * This card shows YOUR sign-ins, not the branch's, and it has to say so
 * ---------------------------------------------------------------------------
 * `GET /api/login-history` decides scope from the JWT: only a super admin reads
 * other people's sessions, and every other role — including `branch_manager` —
 * is pinned to its own `uid`. A `userId` sent by a branch account is *silently
 * ignored* rather than refused, so nothing about the response says it was
 * narrowed.
 *
 * That makes the heading load-bearing. A card titled "Login history" on a branch
 * manager's dashboard reads as *the shop's* logins, and a manager checking
 * whether their shift user signed in this morning would find nothing and
 * conclude nobody did. The subtitle names the scope for that reason, and it is
 * not decoration to be tidied away.
 *
 * ---------------------------------------------------------------------------
 * The search filters what was fetched — it is not a query
 * ---------------------------------------------------------------------------
 * The endpoint takes `days` and `limit` and nothing else: no search parameter,
 * and no `offset`, so there is no pagination to page through either. The filter
 * below therefore runs over the rows already on the device.
 *
 * The consequence is stated in the UI rather than hidden: an empty result says
 * "no matches in the last N days" and names the window, because "no matches" on
 * its own is indistinguishable from "you have never signed in" and one of those
 * is alarming. `capped` does the same job when the window hit the row ceiling.
 */

const DAYS = 30;

/** Deliberately below the server's 500 ceiling. See `capped` below. */
const LIMIT = 100;

const COLUMNS: readonly LedgerColumn[] = [
  { key: 'duration', title: 'Duration', align: 'left' },
  { key: 'where', title: 'Where', align: 'left' },
  { key: 'state', title: 'Status', align: 'right' },
];

/**
 * `durationMs` as something a person reads.
 *
 * Server-derived (`coalesce(endedAt, lastSeenAt) − loginAt`), so this only
 * formats — it never computes a duration from two timestamps of its own, which
 * would disagree with the server the moment a clock drifted.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

/**
 * Where the session opened. Null is normal, not an error — the IP lookup is
 * skipped, refused or timed out often enough that it is an expected outcome.
 *
 * The **country code**, not the country name. This sits in one of three columns
 * sharing the width equally, and on a 360dp phone "Karachi, Pakistan" truncates
 * to "Karachi, P…" — which loses the country entirely while still spending the
 * width on it. "Karachi, PK" fits and keeps both halves. Verified on device
 * rather than reasoned about: the full name was what shipped first and it was
 * cut off in the screenshot.
 */
export function formatWhere(session: LoginSession): string {
  const region = session.countryCode ?? session.country;
  const parts = [session.city, region].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return session.ipAddress ?? 'Unknown';
}

const STATE_TONE = {
  active: 'success',
  ended: 'muted',
  expired: 'warning',
} as const satisfies Record<LoginSession['state'], 'success' | 'muted' | 'warning'>;

const STATE_LABEL = {
  active: 'Active',
  ended: 'Signed out',
  expired: 'Expired',
} as const satisfies Record<LoginSession['state'], string>;

/** The time of day a session opened, in the reader's locale. */
function loginTime(session: LoginSession): string {
  const d = new Date(session.loginAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Matches on the fields a person would actually type: where they were, the
 * device, and the status word. Not the date — the rows are already grouped by
 * it and typing "Aug" to filter a month is what the window is for.
 */
function matches(session: LoginSession, needle: string): boolean {
  if (needle === '') return true;
  const hay = [
    formatWhere(session),
    STATE_LABEL[session.state],
    session.userAgent ?? '',
    session.userEmail,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export function LoginHistoryCard(): React.ReactElement {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const needle = debounced.trim().toLowerCase();

  const history = useQuery({
    queryKey: qk.loginHistory.window(DAYS, LIMIT),
    queryFn: () => getLoginHistory({ days: DAYS, limit: LIMIT }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const sessions = history.data?.sessions;

  const rows: readonly LedgerRow[] = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(s => matches(s, needle)).map(s => ({
      key: s.id,
      // The date is what the row *is*, not a fourth column competing for width.
      heading: `${formatBusinessDate(s.date)} · ${loginTime(s)}`,
      cells: [
        { value: formatDuration(s.durationMs) },
        { value: formatWhere(s), tone: 'muted' as const },
        { value: STATE_LABEL[s.state], tone: STATE_TONE[s.state] },
      ],
    }));
  }, [sessions, needle]);

  /**
   * The window hit the ceiling, so "the last 30 days" is not what is on screen.
   *
   * `total` is the length of the answer and never exceeds `limit`, so equality
   * is the only signal available that rows were left behind — the endpoint
   * reports no database total. Said out loud rather than inferred by the reader.
   */
  const capped = (history.data?.total ?? 0) >= LIMIT;

  const windowNote = capped
    ? `Most recent ${LIMIT} sign-ins`
    : `Last ${DAYS} days`;

  return (
    <View>
      <MBSectionHeader
        title="Login history"
        /* Names the scope. See the note at the top of this file — a branch
           manager reading this as the shop's logins is the failure mode. */
        subtitle="Your sign-ins on this account"
      />
      <MBCard>
        <MBSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Filter by place, device or status"
          testID="login-history-search"
        />

        {history.isPending ? (
          <View style={styles.body}>
            <MBSkeletonList rows={4} />
          </View>
        ) : history.isError ? (
          <View style={styles.body}>
            {/* The error itself, not a sentence written here: MBErrorState
                renders `ApiError.userMessage`, so a 403 says "You don't have
                permission" rather than a generic failure that hides which of
                the two things went wrong. */}
            <MBErrorState
              error={history.error}
              onRetry={() => {
                history.refetch();
              }}
              retrying={history.isFetching}
            />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.body}>
            <MBEmptyState
              title={needle === '' ? 'No sign-ins recorded' : 'No matches'}
              /* Never a bare "nothing found": the window is the other half of
                 the answer, and without it an empty table reads as "you have
                 never signed in" rather than "not in this window". */
              message={
                needle === ''
                  ? `Nothing in the ${windowNote.toLowerCase()}.`
                  : `No sign-ins match “${debounced.trim()}” in the ${windowNote.toLowerCase()}.`
              }
            />
          </View>
        ) : (
          <View style={styles.body}>
            <MBLedgerTable columns={COLUMNS} rows={rows} testID="login-history-table" />
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {capped
                ? `Showing the most recent ${LIMIT} sign-ins. Older ones are not listed.`
                : `${rows.length} of ${sessions?.length ?? 0} sign-ins · last ${DAYS} days`}
            </Text>
          </View>
        )}
      </MBCard>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: space.md, gap: space.sm },
});
