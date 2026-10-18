import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCancelProductionOrder, useProductionOrders } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { useOfflineQueueStore } from '@/state';
import { useNetworkStatus } from '@/shared/hooks';
import { Routes, openDrawer, useTabBarHeight, type OrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, Screen, SearchBar, StatusBadge } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ProductionOrder } from '@/api';
import { CancelDemandModal, DemandTotalModal, OrderCard, QueuedDemandCard, SortSheet, TotalsBar, type OrderSort } from '../../components';
import { CreateOrderSheetContent } from '../CreateOrderScreen';
import { isActiveOrder } from '../../utils/demandLines';
import { styles } from './styles';

const PRODUCTION_ORDERS_ENDPOINT = '/production-orders';

function compareOrders(a: ProductionOrder, b: ProductionOrder, sort: OrderSort): number {
  const dir = sort.dir === 'asc' ? 1 : -1;
  switch (sort.field) {
    case 'requiredDate':
      return ((a.requiredDate ?? '') > (b.requiredDate ?? '') ? 1 : (a.requiredDate ?? '') < (b.requiredDate ?? '') ? -1 : 0) * dir;
    case 'demandNumber':
      return a.demandNumber.localeCompare(b.demandNumber) * dir;
    case 'status':
      return a.status.localeCompare(b.status) * dir;
    case 'reason':
      return (a.cancelReason ?? '').localeCompare(b.cancelReason ?? '') * dir;
    case 'date':
    default:
      return ((a.date + a.time) > (b.date + b.time) ? 1 : -1) * dir;
  }
}

/** branchApp.md screen 04 — "New Orders": the branch's production demand list. */
export function OrdersListScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [sort, setSort] = useState<OrderSort>({ field: 'date', dir: 'desc' });
  const [sortOpen, setSortOpen] = useState(false);
  const [demandTotalFor, setDemandTotalFor] = useState<ProductionOrder | null>(null);
  const [cancelling, setCancelling] = useState<ProductionOrder | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useProductionOrders();
  const { isOffline } = useNetworkStatus();
  const queuedWrites = useOfflineQueueStore((state) => state.writes);
  const cancelOrder = useCancelProductionOrder();

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const activeCount = useMemo(() => orders.filter(isActiveOrder).length, [orders]);
  const historyCount = orders.length - activeCount;

  const queuedDemands = useMemo(
    () => queuedWrites.filter((w) => w.endpoint === PRODUCTION_ORDERS_ENDPOINT && (w.status === 'pending' || w.status === 'syncing')),
    [queuedWrites],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bucket = orders.filter((order) => (tab === 'active' ? isActiveOrder(order) : !isActiveOrder(order)));
    const searched = !term
      ? bucket
      : bucket.filter(
          (order) => order.demandNumber.toLowerCase().includes(term) || order.items.some((i) => i.productName.toLowerCase().includes(term)),
        );
    return [...searched].sort((a, b) => compareOrders(a, b, sort));
  }, [orders, tab, search, sort]);

  const handleCancel = (reason: string) => {
    if (!cancelling) return;
    cancelOrder.mutate(
      { id: cancelling.id, input: { reason } },
      { onSuccess: () => setCancelling(null) },
    );
  };

  return (
    <Screen>
      <AppHeader
        title="New Orders"
        subtitle="Production Orders · Last 7 days"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />

      {isOffline ? (
        <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          <Icon name="warning" size={14} color={theme.colors.warning} />
          <Text style={[theme.typography.label, { color: theme.colors.warning, marginLeft: 6 }]}>Offline — showing cached list</Text>
        </View>
      ) : null}

      <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, marginHorizontal: theme.spacing.lg }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'active' }}
          onPress={() => setTab('active')}
          style={[styles.tab, { backgroundColor: tab === 'active' ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.label, { color: tab === 'active' ? theme.colors.primaryText : theme.colors.text }]}>
            Needs action
          </Text>
          <View style={{ marginLeft: 6 }}>
            <StatusBadge label={String(activeCount)} variant={activeCount > 0 && tab !== 'active' ? 'warning' : 'neutral'} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'history' }}
          onPress={() => setTab('history')}
          style={[styles.tab, { backgroundColor: tab === 'history' ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.label, { color: tab === 'history' ? theme.colors.primaryText : theme.colors.text }]}>
            History
          </Text>
          <View style={{ marginLeft: 6 }}>
            <StatusBadge label={String(historyCount)} variant="neutral" />
          </View>
        </Pressable>
      </View>

      <View style={[styles.searchRow, { paddingHorizontal: theme.spacing.lg }]}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={tab === 'active' ? 'Search active demands...' : 'Search order history...'}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sort"
          onPress={() => setSortOpen(true)}
          style={[styles.sortButton, { borderColor: theme.colors.border }]}>
          <Icon name="chevron-down" size={16} color={theme.colors.text} />
        </Pressable>
      </View>

      {tab === 'history' && filtered.length > 0 ? (
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <TotalsBar orders={filtered} />
        </View>
      ) : null}

      {isLoading ? <LoadingSkeleton height={100} /> : null}
      {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          tab === 'active' && queuedDemands.length > 0 ? (
            <View>
              {queuedDemands.map((write) => (
                <QueuedDemandCard key={write.id} payload={write.payload as never} />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState
              title={tab === 'active' ? 'Nothing waiting on you' : 'No orders in the last 7 days'}
              message={
                tab === 'active'
                  ? 'Demands appear here while Production is reviewing them, and again when a delivery is ready to verify.'
                  : 'No orders in the last 7 days.'
              }
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onView={() => navigation.navigate(Routes.ORDER_DETAIL, { orderId: item.id })}
            onDemand={() => setDemandTotalFor(item)}
            onDelete={item.status === 'pending' ? () => setCancelling(item) : undefined}
          />
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New production order"
        onPress={() => sheetRef.current?.present()}
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: tabBarHeight + 20 }]}>
        <Icon name="plus" size={22} color={theme.colors.primaryText} />
      </Pressable>

      <FormBottomSheet ref={sheetRef} title="Create New Production Order" onRequestClose={() => sheetRef.current?.dismiss()}>
        <CreateOrderSheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>

      <SortSheet visible={sortOpen} value={sort} onChange={setSort} onClose={() => setSortOpen(false)} />
      <DemandTotalModal order={demandTotalFor} onClose={() => setDemandTotalFor(null)} />
      <CancelDemandModal
        order={cancelling}
        isSubmitting={cancelOrder.isPending}
        error={cancelOrder.error ? mapErrorToMessage(cancelOrder.error) : null}
        onSubmit={handleCancel}
        onClose={() => setCancelling(null)}
      />
    </Screen>
  );
}
