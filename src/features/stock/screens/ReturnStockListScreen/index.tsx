import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useBranchReturns, useReviseBranchReturn, useWithdrawBranchReturn } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchReturn } from '@/api';
import { ReturnStockCard, ReviseReturnModal } from '../../components';
import { styles } from './styles';

const STATUS_FILTERS = ['All', 'pending', 'returned', 'accepted', 'rejected'] as const;
const STATUS_LABEL: Record<(typeof STATUS_FILTERS)[number], string> = {
  All: 'All',
  pending: 'Pending',
  returned: 'Sent Back',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

/** branchApp.md screen 13 — Return Stock: the branch's own return history, last 90 days. */
export function ReturnStockListScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [editing, setEditing] = useState<BranchReturn | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useBranchReturns();
  const revise = useReviseBranchReturn();
  const withdraw = useWithdrawBranchReturn();

  const returns = useMemo(() => data?.returns ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (!term) return true;
      return r.productName.toLowerCase().includes(term) || r.reason.toLowerCase().includes(term);
    });
  }, [returns, statusFilter, search]);

  const handleWithdraw = (item: BranchReturn) => {
    Alert.alert('Withdraw Return', `Remove this ${item.productName} return? The units go back to your branch stock.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () => {
          withdraw.mutate(item.id, {
            onError: (e) => Alert.alert('Could Not Withdraw', mapErrorToMessage(e)),
          });
        },
      },
    ]);
  };

  const handleReviseSubmit = (qty: number, reason: string) => {
    if (!editing) return;
    revise.mutate(
      { id: editing.id, input: { qty, reason } },
      {
        onSuccess: () => setEditing(null),
      },
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Return Stock"
        subtitle="Sent to production · last 90 days"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search reason or product…" />
            <View style={styles.filterRow}>
              {STATUS_FILTERS.map((option) => {
                const active = option === statusFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setStatusFilter(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {STATUS_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState title="No Returns Here" message="Returns waiting on Production show up here until they are reviewed." />
          ) : undefined
        }
        renderItem={({ item }) => <ReturnStockCard item={item} onChange={() => setEditing(item)} onWithdraw={() => handleWithdraw(item)} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <ReviseReturnModal
        visible={editing !== null}
        item={editing}
        isSubmitting={revise.isPending}
        error={revise.error ? mapErrorToMessage(revise.error) : null}
        onSubmit={handleReviseSubmit}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}
