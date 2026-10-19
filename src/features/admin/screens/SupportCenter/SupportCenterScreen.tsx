import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View, type ListRenderItem } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useAdminSupportTickets,
  useFinanceTicketStats,
  useFinanceTicketsPaged,
  useSupportStats,
  type FinanceQueryPriority,
  type FinanceQueryType,
  type FinanceTicket,
  type FinanceTicketStatus,
  type SupportTicket,
} from '@/api';
import { Routes, openDrawer, type SuperAdminSupportStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  EmptyState,
  ErrorState,
  FilterChipRow,
  LoadingSkeleton,
  Screen,
  SearchBar,
  SecondaryButton,
  type FilterChipOption,
} from '@/shared/ui';
import { formatCount } from '@/shared/utils';
import { SummaryTiles } from '../../components';
import { FinanceTicketCard, OpsTicketCard } from './components';
import {
  FINANCE_STAT_CARDS,
  FINANCE_STATUS_ORDER,
  FIN_PRIORITIES,
  FIN_PRIORITY_LABEL,
  FIN_QUERY_TYPES,
  FIN_QUERY_TYPE_LABEL,
  FIN_STATUS_LABEL,
  SOURCES,
  SOURCE_LABELS,
  financeOpenCount,
  queries,
  type SupportSource,
} from './labels';

const PAGE_SIZE = 20;
const ALL = 'all';
type FinView = 'queue' | 'deleted';

type Row =
  | { kind: 'opsHeader' }
  | { kind: 'ops'; ticket: SupportTicket }
  | { kind: 'opsState' }
  | { kind: 'opsMore' }
  | { kind: 'finHeader' }
  | { kind: 'fin'; ticket: FinanceTicket }
  | { kind: 'finState' }
  | { kind: 'finMore' };

const VIEW_OPTIONS: FilterChipOption<FinView>[] = [
  { value: 'queue', label: 'Queue' },
  { value: 'deleted', label: 'Deleted' },
];
const STATUS_OPTIONS: FilterChipOption<FinanceTicketStatus | typeof ALL>[] = [
  { value: ALL, label: 'All statuses' },
  ...FINANCE_STATUS_ORDER.map((s) => ({ value: s, label: FIN_STATUS_LABEL[s] })),
];
const TYPE_OPTIONS: FilterChipOption<FinanceQueryType | typeof ALL>[] = [
  { value: ALL, label: 'All query types' },
  ...FIN_QUERY_TYPES.map((t) => ({ value: t, label: FIN_QUERY_TYPE_LABEL[t] })),
];
const PRIORITY_OPTIONS: FilterChipOption<FinanceQueryPriority | typeof ALL>[] = [
  { value: ALL, label: 'All priorities' },
  ...FIN_PRIORITIES.map((p) => ({ value: p, label: FIN_PRIORITY_LABEL[p] })),
];

/**
 * Web `/support` — the Super Admin Support Center. Two queues under one Source
 * filter: Branches & Production (`GET /api/support`, server-paged) and Finance
 * Queries (the Finance Help Desk, `GET /api/finance/tickets`). Read-only this
 * phase: View only, no resolve/edit/reject/archive, and no "+ New Query" (the
 * server refuses POST /support from super_admin).
 */
export function SupportCenterScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SuperAdminSupportStackParamList>>();

  const [source, setSource] = useState<SupportSource>('all');
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim(), 350);
  const [finView, setFinView] = useState<FinView>('queue');
  const [finStatus, setFinStatus] = useState<FinanceTicketStatus | typeof ALL>(ALL);
  const [finType, setFinType] = useState<FinanceQueryType | typeof ALL>(ALL);
  const [finPriority, setFinPriority] = useState<FinanceQueryPriority | typeof ALL>(ALL);

  const showFinance = source === 'all' || source === 'finance';
  const showOps = source !== 'finance';

  const statsQ = useSupportStats();
  const finStatsQ = useFinanceTicketStats();
  const opsQ = useAdminSupportTickets(
    {
      pageSize: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(source === 'branch' || source === 'production' ? { source } : {}),
    },
    showOps,
  );
  const finQ = useFinanceTicketsPaged(
    {
      pageSize: PAGE_SIZE,
      ...(finStatus !== ALL ? { status: finStatus } : {}),
      ...(finType !== ALL ? { queryType: finType } : {}),
      ...(finPriority !== ALL ? { priority: finPriority } : {}),
      ...(search ? { search } : {}),
      ...(finView === 'deleted' ? { deletedOnly: true as const } : {}),
    },
    showFinance,
  );

  const opsTickets = useMemo(() => opsQ.data?.pages.flatMap((p) => p.tickets) ?? [], [opsQ.data]);
  const opsTotal = opsQ.data?.pages[0]?.total ?? 0;
  const finTickets = useMemo(() => finQ.data?.pages.flatMap((p) => p.tickets) ?? [], [finQ.data]);
  // The section heading and the "All" line count the whole finance queue (web `financeStats.total`).
  const financeTotal = finStatsQ.data?.total ?? 0;
  const finOpen = financeOpenCount(finStatsQ.data);

  const sourceOptions = useMemo<FilterChipOption<SupportSource>[]>(
    () =>
      SOURCES.map((s) => {
        const n = s === 'finance' ? finOpen : s === 'branch' ? (statsQ.data?.branchOpen ?? 0) : s === 'production' ? (statsQ.data?.productionOpen ?? 0) : 0;
        return { value: s, label: SOURCE_LABELS[s], ...(n > 0 ? { count: n } : {}) };
      }),
    [finOpen, statsQ.data],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (showOps) {
      out.push({ kind: 'opsHeader' });
      if (opsQ.isLoading || opsQ.error || opsTickets.length === 0) out.push({ kind: 'opsState' });
      else opsTickets.forEach((ticket) => out.push({ kind: 'ops', ticket }));
      if (opsQ.hasNextPage) out.push({ kind: 'opsMore' });
    }
    if (showFinance) {
      out.push({ kind: 'finHeader' });
      if (finQ.isLoading || finQ.error || finTickets.length === 0) out.push({ kind: 'finState' });
      else finTickets.forEach((ticket) => out.push({ kind: 'fin', ticket }));
      if (finQ.hasNextPage) out.push({ kind: 'finMore' });
    }
    return out;
  }, [showOps, showFinance, opsQ.isLoading, opsQ.error, opsQ.hasNextPage, opsTickets, finQ.isLoading, finQ.error, finQ.hasNextPage, finTickets]);

  const refreshing = statsQ.isRefetching || finStatsQ.isRefetching || opsQ.isRefetching || finQ.isRefetching;
  const onRefresh = useCallback(() => {
    void statsQ.refetch();
    void finStatsQ.refetch();
    if (showOps) void opsQ.refetch();
    if (showFinance) void finQ.refetch();
  }, [statsQ, finStatsQ, opsQ, finQ, showOps, showFinance]);

  // Infinite scroll follows the LAST section on the page; under "All" the
  // Branches & Production section above it pages with its own Show more.
  const onEndReached = () => {
    if (showFinance) {
      if (finQ.hasNextPage && !finQ.isFetchingNextPage) void finQ.fetchNextPage();
    } else if (opsQ.hasNextPage && !opsQ.isFetchingNextPage) {
      void opsQ.fetchNextPage();
    }
  };

  const textMuted = [theme.typography.bodySmall, { color: theme.colors.textSecondary }];
  const sectionTitle = [theme.typography.cardTitle, { color: theme.colors.text, marginTop: theme.spacing.sm }];

  const renderItem: ListRenderItem<Row> = ({ item }) => {
    switch (item.kind) {
      case 'opsHeader':
        return source === 'all' ? (
          <Text style={sectionTitle}>{`Branches & Production (${formatCount(opsTotal)})`}</Text>
        ) : (
          <Text style={textMuted}>
            {queries(opsTotal)} raised from {source === 'branch' ? 'branches' : source === 'production' ? 'production' : 'branches & production'}.
          </Text>
        );
      case 'ops':
        return (
          <OpsTicketCard ticket={item.ticket} onPress={() => navigation.navigate(Routes.SUPER_ADMIN_SUPPORT_TICKET, { ticketId: item.ticket.id })} />
        );
      case 'opsState':
        if (opsQ.isLoading) return <LoadingSkeleton height={140} />;
        if (opsQ.error) return <ErrorState message={mapErrorToMessage(opsQ.error)} onRetry={() => void opsQ.refetch()} />;
        return <EmptyState title="No results found" message={search ? 'Try a different search term.' : undefined} />;
      case 'opsMore':
        return opsQ.isFetchingNextPage ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : source === 'all' ? (
          <SecondaryButton label={`Show more (${opsTickets.length} of ${opsTotal})`} onPress={() => void opsQ.fetchNextPage()} />
        ) : null;
      case 'finHeader':
        return (
          <View style={{ gap: 8 }}>
            {source === 'all' ? <Text style={sectionTitle}>Finance Queries ({formatCount(financeTotal)})</Text> : null}
            <FilterChipRow options={VIEW_OPTIONS} value={finView} onChange={setFinView} />
            <FilterChipRow options={STATUS_OPTIONS} value={finStatus} onChange={setFinStatus} />
            <FilterChipRow options={TYPE_OPTIONS} value={finType} onChange={setFinType} />
            <FilterChipRow options={PRIORITY_OPTIONS} value={finPriority} onChange={setFinPriority} />
          </View>
        );
      case 'fin':
        return <FinanceTicketCard ticket={item.ticket} onPress={() => navigation.navigate(Routes.SUPER_ADMIN_FINANCE_TICKET, { ticketId: item.ticket.id })} />;
      case 'finState':
        if (finQ.isLoading) return <LoadingSkeleton height={140} />;
        if (finQ.error) return <ErrorState message={mapErrorToMessage(finQ.error)} onRetry={() => void finQ.refetch()} />;
        return (
          <EmptyState
            icon="headset"
            title={finView === 'deleted' ? 'No deleted queries.' : 'No queries here.'}
            message={finView === 'deleted' ? undefined : 'Finance has nothing outstanding with you.'}
          />
        );
      case 'finMore':
        return finQ.isFetchingNextPage ? <ActivityIndicator color={theme.colors.primary} /> : null;
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Support Center"
        subtitle="Queries raised from branches, production and Finance — all of them land here."
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.kind === 'ops' ? `o:${r.ticket.id}` : r.kind === 'fin' ? `f:${r.ticket.id}` : `${r.kind}:${i}`)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.xs }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Source</Text>
            <FilterChipRow options={sourceOptions} value={source} onChange={setSource} />
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholder={source === 'finance' ? 'Search Query ID, reference, subject, user or branch…' : 'Search tickets…'}
            />
            {source === 'all' ? <Text style={textMuted}>{queries(opsTotal + financeTotal)} raised from branches, production and finance.</Text> : null}
            {source === 'finance' ? (
              finStatsQ.isLoading ? (
                <LoadingSkeleton height={120} />
              ) : (
                <SummaryTiles
                  tiles={FINANCE_STAT_CARDS.map((c) => ({
                    label: c.label,
                    value: formatCount(finStatsQ.data?.[c.key] ?? 0),
                    ...(c.tone && (finStatsQ.data?.[c.key] ?? 0) > 0 ? { tone: c.tone } : {}),
                  }))}
                />
              )
            ) : null}
          </View>
        }
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={refreshing}
        onRefresh={onRefresh}
        removeClippedSubviews
        initialNumToRender={8}
        windowSize={7}
      />
    </Screen>
  );
}
