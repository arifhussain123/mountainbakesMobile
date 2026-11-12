import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
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
import { AppHeader, EmptyState, ErrorState, Fab, FilterChipRow, FormBottomSheet, IconButton, InfoBanner, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ProductionOrder } from '@/api';
import { CancelDemandModal, DemandTotalModal, OrderCard, QueuedDemandCard, SortSheet, TotalsBar, type OrderSort } from '../../components';
import { CreateOrderSheetContent } from '../CreateOrderScreen';
import { isActiveOrder } from '../../utils/demandLines';
import { styles } from './styles';

const PRODUCTION_ORDERS_ENDPOINT = '/production-orders';
/** Room under the last card so the "New order" FAB never covers it. */
const FAB_CLEARANCE = 96;

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

/** 2026 redesign B04 — "New orders": the branch's production demand list. */
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
        title="New orders"
        subtitle="Production orders · last 7 days"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />

      {isOffline ? (
        <InfoBanner kind="warn" style={[styles.offlineBanner, { marginHorizontal: theme.spacing.lg }]}>
          Offline — showing cached list
        </InfoBanner>
      ) : null}

      <View style={[styles.chipsRow, { paddingHorizontal: theme.spacing.lg }]}>
        <FilterChipRow
          options={[
            { value: 'active' as const, label: 'Needs action', count: activeCount },
            { value: 'history' as const, label: 'History', count: historyCount },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <View style={[styles.searchRow, { paddingHorizontal: theme.spacing.lg }]}>
        <View style={styles.flex1}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={tab === 'active' ? 'Search active demands...' : 'Search order history...'}
          />
        </View>
        <IconButton
          icon="sort"
          accessibilityLabel="Sort"
          dot={sort.field !== 'date' || sort.dir !== 'desc'}
          onPress={() => setSortOpen(true)}
        />
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
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: tabBarHeight + FAB_CLEARANCE }}
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

      <Fab
        label="New order"
        accessibilityLabel="New production order"
        onPress={() => sheetRef.current?.present()}
        bottom={tabBarHeight + 20}
      />

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
