import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePrepareSpecialOrder, useProductionOrders, useProductionStock, useSpecialOrders } from '@/api';
import { Routes, useTabBarHeight, type ProductionOrdersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { ProductionOrderCard, SpecialOrderCard } from '../../components';
import { styles } from './styles';

const OPEN_SPECIAL_ORDER_STATUSES = new Set(['pending', 'awaiting_verification', 'verified']);

/** A product that is currently waiting for Production to review its demand. */
interface DemandSummaryRow {
  productName: string;
  stock: number;
  demand: number;
  balance: number;
}

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
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionOrdersStackParamList>>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');
  const [showAllDemand, setShowAllDemand] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useProductionOrders();
  const orders = useMemo(() => data?.orders ?? [], [data]);

  // Demand Summary — Waiting Orders (screen 02): derived client-side from two
  // endpoints this screen already fetches (or fetches alongside) rather than a
  // new backend aggregation — both are small, already-paged lists. STOCK comes
  // from the Production Stock pool balance; DEMAND is this week's pending
  // (not-yet-reviewed) requested qty per product; BALANCE is their difference.
  const { data: stockData } = useProductionStock();
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const demandSummaryRows = useMemo<DemandSummaryRow[]>(() => {
    const stockByProduct = new Map((stockData?.rows ?? []).map((r) => [r.productId, r.balance]));
    const demandByProduct = new Map<string, { name: string; qty: number }>();
    for (const order of pendingOrders) {
      for (const item of order.items) {
        if (!item.productId) continue;
        const cur = demandByProduct.get(item.productId) ?? { name: item.productName, qty: 0 };
        cur.qty += item.qty;
        demandByProduct.set(item.productId, cur);
      }
    }
    return [...demandByProduct.entries()]
      .map(([productId, d]) => {
        const stock = stockByProduct.get(productId) ?? 0;
        return { productName: d.name, stock, demand: d.qty, balance: stock - d.qty };
      })
      .sort((a, b) => b.demand - a.demand);
  }, [pendingOrders, stockData]);
  const demandSummaryBranchLabel =
    pendingOrders.length === 0
      ? ''
      : pendingOrders.length === 1
        ? pendingOrders[0]!.branchName
        : `${new Set(pendingOrders.map((o) => o.branchId)).size} branches`;
  const visibleDemandRows = showAllDemand ? demandSummaryRows : demandSummaryRows.slice(0, 5);

  // Special Orders (screen 02): a branch's one-off sent straight to Production —
  // its own resource, never counted in the demand above. Only the still-open
  // ones are shown here (the same window the mockup's single example card is
  // drawn from); finished ones fall back into ordinary history elsewhere.
  const { data: specialOrdersData } = useSpecialOrders();
  const openSpecialOrders = useMemo(
    () => (specialOrdersData?.orders ?? []).filter((o) => OPEN_SPECIAL_ORDER_STATUSES.has(o.status)),
    [specialOrdersData],
  );
  // `/special-orders/:id/prepare` has no `idempotent()` wrapper server-side
  // (unlike `/verify`, which does) — it is already a check-and-set on
  // `status = 'pending'`, so a duplicate tap 409s harmlessly rather than
  // double-preparing. No client idempotency key to thread through here.
  const prepareSpecialOrder = usePrepareSpecialOrder();
  const handlePrepareSpecialOrder = (id: string, orderNumber: string) => {
    Alert.alert('Mark Prepared', `Mark ${orderNumber} prepared in full? It is then handed to the branch to verify.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Prepared',
        onPress: () =>
          prepareSpecialOrder.mutate({ id }, { onError: (e) => Alert.alert('Could Not Prepare', mapErrorToMessage(e)) }),
      },
    ]);
  };

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
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View>
            {openSpecialOrders.length > 0 ? (
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Special Orders</Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2, marginBottom: 10 }]}>
                  Sent straight to Production — separate from demand, and not counted in it.
                </Text>
                {openSpecialOrders.map((so) => (
                  <SpecialOrderCard
                    key={so.id}
                    order={so}
                    onPrepare={so.status === 'pending' ? () => handlePrepareSpecialOrder(so.id, so.orderNumber) : undefined}
                    preparing={prepareSpecialOrder.isPending}
                  />
                ))}
              </View>
            ) : null}

            {demandSummaryRows.length > 0 ? (
              <Card style={{ marginBottom: theme.spacing.lg }}>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Demand Summary — Waiting Orders</Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  {pendingOrders.length} to review · {demandSummaryBranchLabel}
                </Text>
                <View style={[styles.demandHeaderRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.primary, flex: 1 }]}>PRODUCT</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.primary, width: 48, textAlign: 'right' }]}>STOCK</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.primary, width: 52, textAlign: 'right' }]}>DEMAND</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.primary, width: 56, textAlign: 'right' }]}>BALANCE</Text>
                </View>
                {visibleDemandRows.map((row) => (
                  <View key={row.productName} style={[styles.demandRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                      {row.productName}
                    </Text>
                    <Text style={[theme.typography.body, { color: theme.colors.textSecondary, width: 48, textAlign: 'right' }]}>
                      {row.stock}
                    </Text>
                    <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700', width: 52, textAlign: 'right' }]}>
                      {row.demand}
                    </Text>
                    <Text
                      style={[
                        theme.typography.body,
                        {
                          color: row.balance < 0 ? theme.colors.danger : theme.colors.success,
                          fontWeight: '700',
                          width: 56,
                          textAlign: 'right',
                        },
                      ]}>
                      {row.balance}
                    </Text>
                  </View>
                ))}
                {demandSummaryRows.length > 5 ? (
                  <Pressable
                    onPress={() => setShowAllDemand((v) => !v)}
                    style={[styles.demandToggle, { backgroundColor: theme.colors.surface }]}
                    accessibilityRole="button">
                    <Text style={[theme.typography.label, { color: theme.colors.text }]}>
                      {showAllDemand ? 'Show Less' : `Show All (${demandSummaryRows.length})`}
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : null}

            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>Orders</Text>
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
