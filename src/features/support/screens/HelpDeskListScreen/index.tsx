import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSupportTickets } from '@/api';
import { openDrawer, openNewQuery, openQueryDetail } from '@/navigation';
import { useOfflineQueueStore } from '@/state';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FilterChipRow, Icon, LoadingSkeleton, PillButton, Screen, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { QueryCard } from '../../components';
import type { SupportTicket } from '@/api';

const SUPPORT_ENDPOINT = '/support';

type StatusFilter = 'open' | 'resolved' | 'all';

const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

/** branchApp.md screen 24 — Help Desk: this branch's own queries. */
export function HelpDeskListScreen() {
  const theme = useAppTheme();
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
        title="Help Desk"
        subtitle="Spotted a problem with a record? Send it to Admin. It stays here until it's resolved."
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PillButton label="+ New Query" onPress={() => openNewQuery()} />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
        <FilterChipRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by reference ID or text..." />
      </View>

      {isOffline ? (
        <View style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radii.pill, borderWidth: 1, backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          <Icon name="warning" size={14} color={theme.colors.warning} />
          <Text style={[theme.typography.label, { color: theme.colors.warning, marginLeft: 6 }]}>Offline — showing cached queries</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item: SupportTicket) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            {queuedQueries.map((write) => (
              <View
                key={write.id}
                style={{
                  marginBottom: 10,
                  padding: theme.spacing.md,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  backgroundColor: theme.colors.cardFill,
                  borderColor: write.status === 'failed' ? theme.colors.danger : theme.colors.warning,
                }}>
                <Text style={[theme.typography.label, { color: write.status === 'failed' ? theme.colors.danger : theme.colors.warning, fontWeight: '700' }]}>
                  {write.status === 'failed' ? 'Sync failed · Fix' : 'Waiting to sync'}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  Submitted {formatDisplayTime(new Date(write.createdAt).toISOString())}
                </Text>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState icon="headset" title="No Queries Yet" message="Raise one with New Query." />
          ) : undefined
        }
        renderItem={({ item }) => <QueryCard ticket={item} onPress={() => openQueryDetail(item.id)} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
