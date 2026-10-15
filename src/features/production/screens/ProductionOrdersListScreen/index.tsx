import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProductionOrders } from '@/api';
import { Routes, type ProductionOrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { ProductionOrderCard } from '../../components';
import { styles } from './styles';

const TABS = ['pending', 'awaiting_verification', 'history'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  pending: 'Pending',
  awaiting_verification: 'Awaiting Verify',
  history: 'History',
};
const HISTORY_STATUSES = ['verified', 'approved', 'rejected', 'cancelled'];

/** mountainbakesProduction.html screen 02 — Production Orders: every branch's demand. */
export function ProductionOrdersListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionOrdersStackParamList>>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');

  const { data, isLoading, error, refetch, isRefetching } = useProductionOrders();
  const orders = useMemo(() => data?.orders ?? [], [data]);

  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === 'pending').length,
      awaiting_verification: orders.filter((o) => o.status === 'awaiting_verification').length,
      history: orders.filter((o) => HISTORY_STATUSES.includes(o.status)).length,
    }),
    [orders],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (tab === 'history' ? !HISTORY_STATUSES.includes(order.status) : order.status !== tab) return false;
      if (!term) return true;
      return order.demandNumber.toLowerCase().includes(term) || order.branchName.toLowerCase().includes(term);
    });
  }, [orders, tab, search]);

  return (
    <Screen>
      <AppHeader title="Production Orders" subtitle="Every branch's demand" actions={[]} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand # or branch…" />
            <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
              {TABS.map((option) => {
                const active = option === tab;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTab(option)}
                    style={[styles.tab, { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {TAB_LABEL[option]} ({counts[option]})
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
          !isLoading && !error ? <EmptyState title="Nothing Here" message="No demands in this queue right now." /> : undefined
        }
        renderItem={({ item }) => (
          <ProductionOrderCard order={item} onPress={() => navigation.navigate(Routes.PRODUCTION_ORDER_DETAIL, { orderId: item.id })} />
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
