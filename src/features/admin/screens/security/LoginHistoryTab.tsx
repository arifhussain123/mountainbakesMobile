import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  getBusinessDate,
  useBranches,
  useLoginFilterOptions,
  useSecuritySessionPages,
  type SecuritySession,
  type SecuritySessionSortKey,
  type SessionDeviceType,
  type SessionState,
} from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card, DateRangeSheet, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatCount, formatDisplayDate, type DateRange } from '@/shared/utils';
import { ActionChip, ActiveFilterChips, SortControl } from '../../components';
import { activeChips, chipLabel, rangeChipLabel, searchChipLabel, toSortPair, type SortField, type SortState } from '../../utils/listControls';
import { ALL, DateRangeField, FilterSelect, MONO, MoreFilters, NoticeBox, Pill, formatClock, formatDateOnly } from '../../components/AdminDetail';
import { QUICK_RANGES, ToggleRow, isQuickRange, quickRange } from './quickRanges';
import {
  EMAIL_NOT_RECORDED,
  STATE_LABELS,
  STATE_TONES,
  formatBrowser,
  formatDeviceKind,
  formatLocation,
  formatOs,
  formatSessionDuration,
} from './sessionFormat';

const STATES = Object.keys(STATE_LABELS) as SessionState[];
const DEVICE_TYPES: SessionDeviceType[] = ['desktop', 'mobile', 'tablet', 'bot', 'unknown'];
const ROLES = ['super_admin', 'branch_manager', 'production_user', 'finance_admin', 'finance_manager', 'accountant', 'finance_auditor'];

/**
 * The web's Flagged filter. "Not flagged" is offered because the web offers
 * it, with the web's real effect: its query sends `suspiciousOnly` only when
 * true, so "Not flagged" narrows nothing — every sign-in is listed, flagged or
 * not — and only shows as a chip.
 */
type Flagged = 'all' | 'flagged' | 'unflagged';
const FLAGGED_OPTIONS: FilterChipOption<Flagged>[] = [
  { value: 'all', label: 'All' },
  { value: 'flagged', label: 'Flagged only' },
  { value: 'unflagged', label: 'Not flagged' },
];

/**
 * The web table's sortable headers (Location, Duration and the two statuses
 * have no single stored value to sort by), each both ways, sorted by the
 * server. Unset = the server's newest sign-in first.
 */
const SORT_FIELDS: SortField<SecuritySession>[] = [
  { key: 'browserEmail', label: 'Browser email', kind: 'text' },
  { key: 'userName', label: 'Mountain Bakes ID', kind: 'text' },
  { key: 'loginAt', label: 'Login date', kind: 'date' },
  { key: 'browser', label: 'Browser', kind: 'text' },
  { key: 'browserVersion', label: 'Browser version', kind: 'text' },
  { key: 'os', label: 'Operating system', kind: 'text' },
  { key: 'deviceType', label: 'Device', kind: 'text' },
  { key: 'ipAddress', label: 'IP address', kind: 'text' },
];

/** A filter's value, or nothing when it is on "All". */
function pick<T extends string>(v: T | typeof ALL): T | undefined {
  return v === ALL ? undefined : (v as T);
}

/**
 * Security → Login History (`GET /api/login-history`): every sign-in that
 * worked, filtered, sorted and paged by the server — the web's phone-card
 * layout. Tapping a card opens the session detail; a session that can still
 * be ended also offers Sign out.
 */
export function LoginHistoryTab({
  header,
  onView,
  onRevoke,
}: {
  header: ReactNode;
  onView: (sessionId: string) => void;
  onRevoke: (session: SecuritySession) => void;
}) {
  const theme = useAppTheme();
  const today = getBusinessDate();
  const dateSheet = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const [state, setState] = useState<SessionState | typeof ALL>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [range, setRange] = useState<DateRange | null>(null);
  const [flagged, setFlagged] = useState<Flagged>('all');
  const [branchId, setBranchId] = useState<string>(ALL);
  const [role, setRole] = useState<string>(ALL);
  const [city, setCity] = useState<string>(ALL);
  const [browser, setBrowser] = useState<string>(ALL);
  const [deviceType, setDeviceType] = useState<SessionDeviceType | typeof ALL>(ALL);
  const [sort, setSort] = useState<SortState | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const { sortBy, sortDir } = toSortPair<SecuritySessionSortKey>(sort);
  const query = useMemo(
    () => ({
      search: term || undefined,
      state: pick(state),
      country: pick(country),
      from: range?.from,
      to: range?.to,
      suspiciousOnly: flagged === 'flagged' || undefined,
      branchId: pick(branchId),
      role: pick(role),
      city: pick(city),
      browser: pick(browser),
      deviceType: pick(deviceType),
      sortBy,
      sortDir,
    }),
    [term, state, country, range, flagged, branchId, role, city, browser, deviceType, sortBy, sortDir],
  );
  const q = useSecuritySessionPages(query);
  const optionsQ = useLoginFilterOptions();
  const branchesQ = useBranches();
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.sessions) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total;
  const active = !!(term || state !== ALL || country !== ALL || range || flagged !== 'all' || branchId !== ALL || role !== ALL || city !== ALL || browser !== ALL || deviceType !== ALL);

  const toOptions = (values: string[] | undefined) => (values ?? []).map((v) => ({ value: v, label: v }));
  const moreCount = [branchId, role, city, browser, deviceType].filter((v) => v !== ALL).length;
  const branchName = (branchesQ.data?.branches ?? []).find((b) => b.id === branchId)?.name ?? 'Branch';

  const chips = activeChips([
    !!term && { key: 'search', label: searchChipLabel(term), onRemove: () => setSearch('') },
    state !== ALL && { key: 'state', label: chipLabel('Status', STATE_LABELS[state] ?? state), onRemove: () => setState(ALL) },
    country !== ALL && { key: 'country', label: chipLabel('Country', country), onRemove: () => setCountry(ALL) },
    !!range && { key: 'businessDate', label: rangeChipLabel('Date', range.from, range.to, formatDisplayDate), onRemove: () => setRange(null) },
    flagged !== 'all' && {
      key: 'suspiciousOnly',
      label: chipLabel('Flagged', FLAGGED_OPTIONS.find((o) => o.value === flagged)?.label ?? flagged),
      onRemove: () => setFlagged('all'),
    },
    branchId !== ALL && { key: 'branchId', label: chipLabel('Branch', branchName), onRemove: () => setBranchId(ALL) },
    role !== ALL && { key: 'role', label: chipLabel('Role', role.replace(/_/g, ' ')), onRemove: () => setRole(ALL) },
    city !== ALL && { key: 'city', label: chipLabel('City', city), onRemove: () => setCity(ALL) },
    browser !== ALL && { key: 'browser', label: chipLabel('Browser', browser), onRemove: () => setBrowser(ALL) },
    deviceType !== ALL && { key: 'deviceType', label: chipLabel('Device', deviceType), onRemove: () => setDeviceType(ALL) },
  ]);
  const clearAll = () => {
    setSearch('');
    setState(ALL);
    setCountry(ALL);
    setRange(null);
    setFlagged('all');
    setBranchId(ALL);
    setRole(ALL);
    setCity(ALL);
    setBrowser(ALL);
    setDeviceType(ALL);
  };

  return (
    <>
      <FlatList
        data={q.isLoading || q.error ? [] : rows}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.sm }}>
            {header}
            <ToggleRow
              items={[
                ...QUICK_RANGES.map(([label, days]) => ({
                  label,
                  active: isQuickRange(range, days, today),
                  onPress: () => setRange(isQuickRange(range, days, today) ? null : quickRange(days, today)),
                })),
                { label: 'Active only', active: state === 'active', onPress: () => setState(state === 'active' ? ALL : 'active') },
              ]}
            />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search by Mountain Bakes ID, name, email, place, browser, IP or status…" />
            <FilterSelect<SessionState>
              label="Status"
              allLabel="All"
              options={STATES.map((s) => ({ value: s, label: STATE_LABELS[s] }))}
              value={state}
              onChange={setState}
            />
            <FilterSelect label="Country" allLabel="All" options={toOptions(optionsQ.data?.countries)} value={country} onChange={setCountry} />
            <DateRangeField label="Date" range={range} placeholder="Any date" onPress={() => dateSheet.current?.present()} onClear={() => setRange(null)} />
            <View style={{ gap: 4 }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Flagged</Text>
              <FilterChipRow options={FLAGGED_OPTIONS} value={flagged} onChange={setFlagged} />
            </View>
            <MoreFilters open={moreOpen} onToggle={() => setMoreOpen((o) => !o)} activeCount={moreCount}>
              <FilterSelect
                label="Branch"
                allLabel="All"
                options={(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
                value={branchId}
                onChange={setBranchId}
              />
              <FilterSelect label="Role" allLabel="All" options={ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))} value={role} onChange={setRole} />
              <FilterSelect label="City" allLabel="All" options={toOptions(optionsQ.data?.cities)} value={city} onChange={setCity} />
              <FilterSelect label="Browser" allLabel="All" options={toOptions(optionsQ.data?.browsers)} value={browser} onChange={setBrowser} />
              <FilterSelect<SessionDeviceType> label="Device" allLabel="All" options={DEVICE_TYPES.map((d) => ({ value: d, label: d }))} value={deviceType} onChange={setDeviceType} />
            </MoreFilters>
            <SortControl fields={SORT_FIELDS} value={sort} onChange={setSort} defaultLabel="Newest sign-in first" />
            <ActiveFilterChips chips={chips} onClearAll={clearAll} />
            {total !== undefined ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {formatCount(total)} {total === 1 ? 'sign-in' : 'sign-ins'}
              </Text>
            ) : null}
            {q.isLoading ? <LoadingSkeleton height={160} /> : null}
            {q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !q.isLoading && !q.error ? (
            <EmptyState
              title="No sign-ins found"
              message={active ? 'Try widening the filters.' : 'History starts from the first sign-in after this feature went live.'}
            />
          ) : undefined
        }
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        renderItem={({ item }) => <SessionCard session={item} onView={() => onView(item.id)} onRevoke={() => onRevoke(item)} />}
      />
      <DateRangeSheet
        ref={dateSheet}
        today={today}
        value={range ?? quickRange(6, today)}
        onApply={setRange}
        onRequestClose={() => dateSheet.current?.dismiss()}
      />
    </>
  );
}

/** The web's own phone card for a sign-in; Sign out only on a session that can still be ended. */
function SessionCard({ session: s, onView, onRevoke }: { session: SecuritySession; onView: () => void; onRevoke: () => void }) {
  const theme = useAppTheme();
  const cell = (label: string, value: string, mono?: boolean) => (
    <View key={label} style={styles.cell}>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{label}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.text }, mono ? MONO : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
  return (
    <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`${s.userCode ?? ''} ${s.userName}, ${STATE_LABELS[s.state] ?? s.state}`}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }, MONO]}>{s.userCode ?? '—'}</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]} numberOfLines={1}>
              {s.userName}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontStyle: s.browserEmail ? 'normal' : 'italic' }]} numberOfLines={1}>
              {s.browserEmail || EMAIL_NOT_RECORDED}
            </Text>
          </View>
          <Pill label={STATE_LABELS[s.state] ?? s.state} tone={STATE_TONES[s.state] ?? 'neutral'} />
        </View>
        <View style={styles.grid}>
          {cell('Browser', formatBrowser(s))}
          {cell('Operating system', formatOs(s))}
          {cell('Device', formatDeviceKind(s))}
          {cell('Location', formatLocation(s))}
          {cell('Login', `${formatDateOnly(s.loginAt)} · ${formatClock(s.loginAt)}`)}
          {cell('Duration', formatSessionDuration(s.durationMs))}
          {cell('IP address', s.ipAddress || '—', true)}
        </View>
        {s.isSuspicious && s.suspiciousReason ? (
          <View style={{ marginTop: 8 }}>
            <NoticeBox tone="warning">{s.suspiciousReason}</NoticeBox>
          </View>
        ) : null}
        <View style={styles.actions}>
          <ActionChip icon="search" label="View" onPress={onView} />
          {s.canRevoke ? <ActionChip icon="logout" label="Sign out" danger onPress={onRevoke} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cell: { flexBasis: '45%', flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
