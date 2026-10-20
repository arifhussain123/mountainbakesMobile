import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, useLoginAttemptPages, useLoginFilterOptions, type LoginAttempt, type LoginAttemptReason, type LoginAttemptSortKey } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card, DateRangeSheet, EmptyState, ErrorState, LoadingSkeleton, SearchBar } from '@/shared/ui';
import { formatCount, formatDisplayDate, type DateRange } from '@/shared/utils';
import { ActiveFilterChips, SortControl } from '../../components';
import { activeChips, chipLabel, rangeChipLabel, searchChipLabel, toSortPair, type SortField, type SortState } from '../../utils/listControls';
import { ALL, DateRangeField, FilterSelect, MONO, NoticeBox, Pill, formatClock, formatDateOnly } from '../../components/AdminDetail';
import { QUICK_RANGES, ToggleRow, isQuickRange, quickRange } from './quickRanges';
import { LOGIN_ATTEMPT_REASON_LABELS, formatBrowser, formatPlatform } from './sessionFormat';

const REASONS = Object.keys(LOGIN_ATTEMPT_REASON_LABELS) as LoginAttemptReason[];

/** The web table's sortable headers (Date and Time are one key), each both ways, sorted by the server. */
const SORT_FIELDS: SortField<LoginAttempt>[] = [
  { key: 'attemptedAt', label: 'Date', kind: 'date' },
  { key: 'email', label: 'Email typed', kind: 'text' },
  { key: 'country', label: 'Country', kind: 'text' },
  { key: 'city', label: 'City', kind: 'text' },
  { key: 'ipAddress', label: 'IP address', kind: 'text' },
  { key: 'reason', label: 'Reason', kind: 'text' },
];

/**
 * Security → Failed Logins (`GET /api/login-attempts`, super_admin only):
 * every refused sign-in, newest first unless a web column's sort is picked.
 * Each row is the address that was typed — not an account. No actions on
 * rows, as on the web.
 */
export function FailedLoginsTab({ header }: { header: ReactNode }) {
  const theme = useAppTheme();
  const today = getBusinessDate();
  const dateSheet = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const [reason, setReason] = useState<LoginAttemptReason | typeof ALL>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [range, setRange] = useState<DateRange | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);

  const query = useMemo(
    () => ({
      search: term || undefined,
      reason: reason === ALL ? undefined : reason,
      country: country === ALL ? undefined : country,
      from: range?.from,
      to: range?.to,
      ...toSortPair<LoginAttemptSortKey>(sort),
    }),
    [term, reason, country, range, sort],
  );
  const q = useLoginAttemptPages(query);
  const optionsQ = useLoginFilterOptions();
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.attempts) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total;
  const active = !!(term || reason !== ALL || country !== ALL || range);

  const chips = activeChips([
    !!term && { key: 'search', label: searchChipLabel(term), onRemove: () => setSearch('') },
    reason !== ALL && { key: 'reason', label: chipLabel('Reason', LOGIN_ATTEMPT_REASON_LABELS[reason] ?? reason), onRemove: () => setReason(ALL) },
    country !== ALL && { key: 'country', label: chipLabel('Country', country), onRemove: () => setCountry(ALL) },
    !!range && { key: 'businessDate', label: rangeChipLabel('Date', range.from, range.to, formatDisplayDate), onRemove: () => setRange(null) },
  ]);
  const clearAll = () => {
    setSearch('');
    setReason(ALL);
    setCountry(ALL);
    setRange(null);
  };

  return (
    <>
      <FlatList
        data={q.isLoading || q.error ? [] : rows}
        keyExtractor={(a) => a.id}
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
            <NoticeBox tone="info">
              Sign-ins that were refused. Each row is the address that was typed — not a Mountain Bakes account, and not proof that the account exists. These
              are reported by the browser that saw the failure, so treat a burst as something to look into rather than as evidence on its own. No password, or
              any part of one, is ever recorded.
            </NoticeBox>
            <ToggleRow
              items={QUICK_RANGES.map(([label, days]) => ({
                label,
                active: isQuickRange(range, days, today),
                onPress: () => setRange(isQuickRange(range, days, today) ? null : quickRange(days, today)),
              }))}
            />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search the address that was typed…" />
            <FilterSelect<LoginAttemptReason>
              label="Reason"
              allLabel="All"
              options={REASONS.map((r) => ({ value: r, label: LOGIN_ATTEMPT_REASON_LABELS[r] }))}
              value={reason}
              onChange={setReason}
            />
            <FilterSelect
              label="Country"
              allLabel="All"
              options={(optionsQ.data?.countries ?? []).map((c) => ({ value: c, label: c }))}
              value={country}
              onChange={setCountry}
            />
            <DateRangeField label="Date" range={range} placeholder="Any date" onPress={() => dateSheet.current?.present()} onClear={() => setRange(null)} />
            <SortControl fields={SORT_FIELDS} value={sort} onChange={setSort} defaultLabel="Newest first" />
            <ActiveFilterChips chips={chips} onClearAll={clearAll} />
            {total !== undefined ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {formatCount(total)} {total === 1 ? 'refused sign-in' : 'refused sign-ins'}
              </Text>
            ) : null}
            {q.isLoading ? <LoadingSkeleton height={160} /> : null}
            {q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !q.isLoading && !q.error ? (
            <EmptyState
              title="No failed sign-ins"
              message={active ? 'Try widening the filters.' : 'Nothing has been refused. Records start from the first refusal after this feature went live.'}
            />
          ) : undefined
        }
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        renderItem={({ item }) => <AttemptCard attempt={item} />}
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

function AttemptCard({ attempt: a }: { attempt: LoginAttempt }) {
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
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
          {a.email}
        </Text>
        <Pill label={LOGIN_ATTEMPT_REASON_LABELS[a.reason] ?? a.reason} tone="neutral" />
      </View>
      <View style={styles.grid}>
        {cell('When', `${formatDateOnly(a.attemptedAt)} · ${formatClock(a.attemptedAt)}`)}
        {cell('Location', [a.city, a.country].filter(Boolean).join(', ') || '—')}
        {cell('Device', `${formatBrowser(a)} · ${formatPlatform(a)}`)}
        {cell('IP address', a.ipAddress || '—', true)}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cell: { flexBasis: '45%', flexGrow: 1 },
});
