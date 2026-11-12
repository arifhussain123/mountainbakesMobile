import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSupportTickets } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer, openNewQuery, openQueryDetail } from '@/navigation';
import { useOfflineQueueStore } from '@/state';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { AccentFill, ACCENT_GLOW, AppHeader, EmptyState, ErrorState, FilterChipRow, Icon, InfoBanner, ListThumb, LoadingSkeleton, Screen, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { QueryCard } from '../../components';
import type { SupportTicket } from '@/api';

const SUPPORT_ENDPOINT = '/support';

type StatusFilter = 'open' | 'resolved' | 'all';

/** branchApp.md screen 24 — Help Desk: this branch's own queries. */
export function HelpDeskListScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const { isOffline } = useNetworkStatus();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useSupportTickets();
  const tickets = useMemo(() => data?.tickets ?? [], [data]);
  const queuedWrites = useOfflineQueueStore((state) => state.writes);

  const queuedQueries = useMemo(
    () => queuedWrites.filter((w) => w.endpoint === SUPPORT_ENDPOINT),
    [queuedWrites],
  );

  // 2026 redesign B24: the chips carry their counts (from the already-loaded list — no extra request).
  const statusOptions: FilterChipOption<StatusFilter>[] = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length;
    const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'rejected').length;
    return [
      { value: 'open', label: 'Open', count: open },
      { value: 'resolved', label: 'Resolved', count: resolved },
      { value: 'all', label: 'All', count: tickets.length },
    ];
  }, [tickets]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets
      .filter((t) => {
        if (statusFilter === 'open') return t.status === 'open';
        if (statusFilter === 'resolved') return t.status === 'resolved' || t.status === 'rejected';
        return true;
      })
      .filter(
        (t) =>
          !term ||
          t.referenceId.toLowerCase().includes(term) ||
          t.ticketNumber.toLowerCase().includes(term) ||
          t.message.toLowerCase().includes(term),
      );
  }, [tickets, statusFilter, search]);

  return (
    <Screen>
      <AppHeader
        title="Help desk"
        subtitle="Spotted a problem with a record? Forward it to admin. It stays here until resolved."
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />

      <View style={styles.controls}>
        <FilterChipRow options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by reference ID or text..." />
        {isOffline ? <InfoBanner kind="warn">Offline — showing cached queries</InfoBanner> : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: SupportTicket) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            {queuedQueries.map((write) => (
              <InfoBanner key={write.id} kind={write.status === 'failed' ? 'bad' : 'warn'} icon={write.status === 'failed' ? 'warning' : 'clock'}>
                <Text style={[styles.bannerTitle, { color: write.status === 'failed' ? theme.colors.danger : theme.colors.warning }]}>
                  {write.status === 'failed' ? 'Sync failed · Fix' : 'Waiting to sync'}
                </Text>
                <Text style={[styles.bannerSub, { color: theme.colors.textSecondary }]}>
                  Submitted {formatDisplayTime(new Date(write.createdAt).toISOString())}
                </Text>
              </InfoBanner>
            ))}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState icon="headset" title="No Queries Yet" message="Raise one with New query." />
          ) : undefined
        }
        ListFooterComponent={
          !isLoading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New query. Report a problem with a sale, demand, expense, stock or deposit"
              onPress={() => openNewQuery()}
              style={[
                styles.tint,
                { backgroundColor: theme.isDark ? theme.colors.cardFill : '#EFEBFF', borderColor: theme.isDark ? theme.colors.cardBorder : '#E2DBFF' },
              ]}>
              <ListThumb icon="headset" index={1} />
              <View style={styles.grow}>
                <Text style={[styles.tintTitle, { color: theme.colors.text }]}>Need to report something?</Text>
                <Text style={[styles.xs, { color: theme.colors.textSecondary }]}>Sales, demands, expenses, stock or deposits.</Text>
              </View>
              <Icon name="chevron-right" size={18} color={theme.colors.textFaint} />
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => <QueryCard ticket={item} onPress={() => openQueryDetail(item.id)} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New query"
        onPress={() => openNewQuery()}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
          theme.isDark ? null : ACCENT_GLOW,
        ]}>
        <AccentFill borderRadius={20} />
        <Icon name="plus" size={20} color={theme.colors.primaryText} />
        <Text style={[styles.fabText, { color: theme.colors.primaryText }]}>New query</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 20, gap: 12 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 104 },
  header: { gap: 10, marginBottom: 2 },
  bannerTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  bannerSub: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  tint: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 1, padding: 16, marginTop: 6 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  tintTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    height: 56,
    borderRadius: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabText: { fontSize: 15, fontWeight: '600' },
});
