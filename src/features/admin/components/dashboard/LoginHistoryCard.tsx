import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, useLoginHistoryPage } from '@/api';
import type { LoginSessionRow } from '@/api/types';
import { karachiTime } from '@/features/finance';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { Card, Dropdown, FormBottomSheet, Icon, LoadingSkeleton, SearchBar, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import {
  LOGIN_DATE_OPTIONS,
  LOGIN_ROLE_OPTIONS,
  SESSION_STATE_LABELS,
  formatDeviceKind,
  formatDuration,
  loginDateWindow,
  type LoginDatePreset,
} from '../../utils/dashboardModel';
import { SessionDetail } from '../../screens/security/SessionDetail';
import { SmallButton } from './parts';

const PAGE_SIZE = 20;
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;

const STATE_VARIANT: Record<string, StatusVariant> = {
  active: 'success',
  idle: 'warning',
  ended: 'neutral',
  expired: 'warning',
  revoked: 'danger',
};

/** The login's Karachi calendar date. */
function karachiDate(iso: string): string {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? '' : new Date(t + KARACHI_OFFSET_MS).toISOString().slice(0, 10);
}

function location(s: LoginSessionRow): string | null {
  const parts = [s.area, s.city, s.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/**
 * Login History — who signed in, from where. Collapsed by default and silent
 * while collapsed: opening the card is what asks for the history. Paged,
 * searched and filtered by the API (role, business-date window), as the web
 * card does. A row's View opens the Security screen's Session detail
 * (`GET /api/login-history/:id`); as on the web card it offers no Sign out —
 * ending a session stays on the Security screen.
 */
export function LoginHistoryCard({ onOpenSecurity }: { onOpenSecurity?: () => void }) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [preset, setPreset] = useState<LoginDatePreset>('all');
  const q = useDebouncedValue(search.trim(), 300);
  const range = loginDateWindow(preset, getBusinessDate());

  const historyQ = useLoginHistoryPage(
    { page, pageSize: PAGE_SIZE, search: q || undefined, role: role !== 'all' ? role : undefined, ...range },
    open,
  );
  const data = historyQ.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const failed = !!historyQ.error && !data;
  const [viewId, setViewId] = useState<string | null>(null);
  const detailSheet = useRef<BottomSheetModal>(null);
  const onView = (id: string) => {
    setViewId(id);
    detailSheet.current?.present();
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}>
        <Icon name="history-clock" size={20} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>Login History</Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.panel, { borderTopColor: theme.colors.border }]}>
          <View style={styles.subRow}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>
              Every account · location is resolved from the login IP and is approximate
            </Text>
            {onOpenSecurity ? <SmallButton label="Security" icon="shield-check" onPress={onOpenSecurity} /> : null}
          </View>

          {failed ? (
            <View accessibilityRole="alert" style={styles.failed}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>Unable to load login history.</Text>
              <SmallButton label={historyQ.isFetching ? 'Retrying…' : 'Retry'} icon="refresh" onPress={() => void historyQ.refetch()} />
            </View>
          ) : (
            <>
              <SearchBar
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(1);
                }}
                placeholder="Search user ID or name…"
              />
              <View style={styles.filters}>
                <View style={{ flex: 1 }}>
                  <Dropdown
                    value={role}
                    options={LOGIN_ROLE_OPTIONS}
                    onChange={(v) => {
                      setRole(v);
                      setPage(1);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Dropdown<LoginDatePreset>
                    value={preset}
                    options={LOGIN_DATE_OPTIONS}
                    onChange={(v) => {
                      setPreset(v);
                      setPage(1);
                    }}
                  />
                </View>
              </View>

              {historyQ.isPending ? (
                <LoadingSkeleton height={180} />
              ) : !data || data.sessions.length === 0 ? (
                <View style={styles.failed}>
                  <Icon name="history-clock" size={28} color={theme.colors.textFaint} />
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>No login history found.</Text>
                </View>
              ) : (
                <View style={{ gap: 8, opacity: historyQ.isPlaceholderData ? 0.6 : 1 }}>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
                    {data.total.toLocaleString('en-US')} {data.total === 1 ? 'sign-in' : 'sign-ins'}
                  </Text>
                  {data.sessions.map((s) => (
                    <SessionRow key={s.id} s={s} onView={() => onView(s.id)} />
                  ))}
                </View>
              )}

              {data && pages > 1 ? (
                <View style={styles.pager}>
                  <SmallButton label="Previous" onPress={() => setPage((p) => Math.max(1, p - 1))} />
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                    Page {page} of {pages}
                  </Text>
                  <SmallButton label="Next" onPress={() => setPage((p) => Math.min(pages, p + 1))} />
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      <FormBottomSheet ref={detailSheet} title="Session detail" onRequestClose={() => detailSheet.current?.dismiss()} onDismiss={() => setViewId(null)}>
        {viewId ? <SessionDetail sessionId={viewId} /> : null}
      </FormBottomSheet>
    </Card>
  );
}

function SessionRow({ s, onView }: { s: LoginSessionRow; onView: () => void }) {
  const theme = useAppTheme();
  const date = karachiDate(s.loginAt);
  const loc = location(s);
  const field = (label: string, value: string, opts: { italic?: boolean; mono?: boolean } = {}) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textFaint }]}>{label}</Text>
      <Text
        numberOfLines={2}
        style={[
          theme.typography.label,
          { color: opts.italic ? theme.colors.textSecondary : theme.colors.text, fontStyle: opts.italic ? 'italic' : 'normal' },
          opts.mono && { fontFamily: 'monospace' },
        ]}>
        {value}
      </Text>
    </View>
  );
  const state = s.state;
  return (
    <View style={[styles.row, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.background, borderRadius: theme.radii.md }]}>
      <View style={styles.rowHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', fontFamily: 'monospace' }]}>{s.userCode ?? '—'}</Text>
          <Text numberOfLines={1} style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {s.userName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {s.isSuspicious ? <Icon name="warning" size={14} color={theme.colors.warning} /> : null}
            {state ? <StatusBadge label={SESSION_STATE_LABELS[state] ?? state} variant={STATE_VARIANT[state] ?? 'neutral'} /> : null}
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {date ? formatDisplayDate(date) : '—'} · {karachiTime(s.loginAt)}
          </Text>
        </View>
      </View>
      <View style={styles.fields}>
        {field('Browser Email', s.browserEmail || 'Not recorded', { italic: !s.browserEmail })}
        {field('Location', loc ?? 'Location unavailable', { italic: !loc })}
        {field('Browser', s.browser || '—')}
        {field('Browser Version', s.browserVersion || '—')}
        {field('Operating System', [s.os, s.osVersion].filter(Boolean).join(' ') || '—')}
        {field('Device', formatDeviceKind(s))}
        {field('IP Address', s.ipAddress || '—', { mono: true })}
        {field('Duration', formatDuration(s.durationMs))}
        {field('Login Status', s.loginStatus === 'SUCCESS' ? 'Success' : '—')}
      </View>
      <View style={styles.viewRow}>
        <SmallButton label="View" onPress={onView} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  failed: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  filters: { flexDirection: 'row', gap: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  row: { borderWidth: 1, padding: 12, gap: 10 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  field: { width: '50%', paddingRight: 8 },
  viewRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
});
