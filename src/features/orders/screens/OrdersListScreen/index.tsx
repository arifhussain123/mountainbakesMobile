import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useProductionOrders } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { OrderCard } from '../../components';
import { CreateOrderSheetContent } from '../CreateOrderScreen';
import { styles } from './styles';

const ACTIVE_STATUSES = ['pending', 'awaiting_verification', 'verified'] as const;
const HISTORY_STATUSES = ['approved', 'rejected', 'cancelled'] as const;

/** branchApp.md screen 04 — "New Orders": the branch's production demand list. */
export function OrdersListScreen() {
  const theme = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const { data, isLoading, error, refetch, isRefetching } = useProductionOrders();
  const orders = useMemo(() => data?.orders ?? [], [data]);

  const activeCount = useMemo(() => orders.filter((o) => (ACTIVE_STATUSES as readonly string[]).includes(o.status)).length, [orders]);
  const historyCount = orders.length - activeCount;

  const filtered = useMemo(() => {
    const statuses: readonly string[] = tab === 'active' ? ACTIVE_STATUSES : HISTORY_STATUSES;
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (!statuses.includes(order.status)) return false;
      if (!term) return true;
      return order.demandNumber.toLowerCase().includes(term) || order.items.some((i) => i.productName.toLowerCase().includes(term));
    });
  }, [orders, tab, search]);

  return (
    <Screen>
      <AppHeader title="New Orders" subtitle="Production Orders · Last 7 days" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ New Order" onPress={() => sheetRef.current?.present()} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search active demands…" />
            <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: tab === 'active' }}
                onPress={() => setTab('active')}
                style={[styles.tab, { backgroundColor: tab === 'active' ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                <Text style={[theme.typography.label, { color: tab === 'active' ? theme.colors.primaryText : theme.colors.text }]}>
                  Active ({activeCount})
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: tab === 'history' }}
                onPress={() => setTab('history')}
                style={[styles.tab, { backgroundColor: tab === 'history' ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                <Text style={[theme.typography.label, { color: tab === 'history' ? theme.colors.primaryText : theme.colors.text }]}>
                  History ({historyCount})
                </Text>
              </Pressable>
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState
              title={tab === 'active' ? 'No Active Demands' : 'No Order History'}
              message={tab === 'active' ? 'Submit a new production order to request stock.' : 'Reviewed and closed orders will appear here.'}
            />
          ) : undefined
        }
        renderItem={({ item }) => <OrderCard order={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={sheetRef} title="Create New Production Order" onRequestClose={() => sheetRef.current?.dismiss()}>
        <CreateOrderSheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
