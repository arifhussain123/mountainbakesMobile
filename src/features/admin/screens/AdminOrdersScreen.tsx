import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getBusinessDate,
  useBranches,
  useProductionOrderPages,
  useProductionOrders,
  useProductionStock,
  useSpecialOrders,
  type ProductionOrder,
  type ProductionOrderStatus,
  type ProductionOrdersDataQuery,
} from '@/api';
import { Routes, openDrawer, useTabBarHeight } from '@/navigation';
import type { SuperAdminOrdersStackParamList } from '@/navigation/types';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  DateRangeSheet,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  LoadingSkeleton,
  Screen,
  SearchBar,
  type DropdownOption,
} from '@/shared/ui';
import { formatDisplayDate, resolveDateRangePreset, type DateRange } from '@/shared/utils';
import { AdminDemandSummaryCard } from '../components/AdminDemandSummaryCard';
import { AdminProductionOrderRow } from '../components/AdminProductionOrderRow';
import { AdminSpecialOrdersCard } from '../components/AdminSpecialOrdersCard';
import { PRODUCTION_ORDER_STATUS_OPTIONS, buildDemandSummary } from '../utils/productionOrders';

const ALL = 'all';

const STATUS_OPTIONS: DropdownOption<string>[] = [{ value: ALL, label: 'All Statuses' }, ...PRODUCTION_ORDER_STATUS_OPTIONS];

function RangeChip({ label, range, onPress, onClear }: { label: string; range: DateRange | null; onPress: () => void; onClear: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.cardFill, borderColor: range ? theme.colors.primary : theme.colors.cardBorder }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} filter`} onPress={onPress} style={styles.chipBody}>
        <Icon name="calendar" size={12} color={theme.colors.text} />
        <Text style={[theme.typography.label, { color: theme.colors.text }]} numberOfLines={1}>
          {range ? `${label}: ${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}` : label}
        </Text>
      </Pressable>
      {range ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={onClear} hitSlop={8}>
          <Icon name="close" size={11} color={theme.colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Super Admin → Orders: the web `/orders` page ("Production Orders"),
 * read-only. Special Orders, the Demand Summary of every waiting demand
 * (last 7 business days, `/production-orders`), and the full server-paged
 * Orders list (`/data/productionOrders`) with the web's filters. Review,
 * prepare, approve and print stay on the web for now.
 */
export function AdminOrdersScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<SuperAdminOrdersStackParamList>>();
  const today = getBusinessDate();

  // ── Sections A + B ──
  const specialQ = useSpecialOrders();
  const waitingQ = useProductionOrders();
  const stockQ = useProductionStock();
  const summary = useMemo(() => buildDemandSummary(waitingQ.data?.orders ?? []), [waitingQ.data]);
  // `null` until the pool has arrived — an unloaded figure must not print as a shortfall.
  const stockByProduct = useMemo(
    () => (stockQ.data ? new Map(stockQ.data.rows.map((r) => [r.productId, Number(r.balance) || 0])) : null),
    [stockQ.data],
  );

  // ── Section C: Orders ──
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState<string>(ALL);
  const [branchId, setBranchId] = useState<string>(ALL);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [requiredRange, setRequiredRange] = useState<DateRange | null>(null);
  const dateSheetRef = useRef<BottomSheetModal>(null);
  const requiredSheetRef = useRef<BottomSheetModal>(null);

  const branchesQ = useBranches();
  const branchOptions = useMemo<DropdownOption<string>[]>(
    () => [{ value: ALL, label: 'All Branches' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );

  const query = useMemo<ProductionOrdersDataQuery>(
    () => ({
      search: debouncedSearch || undefined,
      status: status === ALL ? undefined : (status as ProductionOrderStatus),
      branchId: branchId === ALL ? undefined : branchId,
      dateFrom: dateRange?.from,
      dateTo: dateRange?.to,
      requiredFrom: requiredRange?.from,
      requiredTo: requiredRange?.to,
    }),
    [debouncedSearch, status, branchId, dateRange, requiredRange],
  );
  const ordersQ = useProductionOrderPages(query);
  const orders = useMemo(() => ordersQ.data?.pages.flatMap((p) => p.data) ?? [], [ordersQ.data]);
  const total = ordersQ.data?.pages[0]?.total ?? 0;

  const refreshing = ordersQ.isRefetching || waitingQ.isRefetching || specialQ.isRefetching;
  const onRefresh = useCallback(() => {
    void ordersQ.refetch();
    void waitingQ.refetch();
    void specialQ.refetch();
    void stockQ.refetch();
  }, [ordersQ, waitingQ, specialQ, stockQ]);

  const onEndReached = useCallback(() => {
    if (ordersQ.hasNextPage && !ordersQ.isFetchingNextPage) void ordersQ.fetchNextPage();
  }, [ordersQ]);

  const renderItem = useCallback(
    ({ item }: { item: ProductionOrder }) => (
      <AdminProductionOrderRow order={item} onPress={() => navigation.navigate(Routes.SUPER_ADMIN_ORDER_DETAIL, { orderId: item.id })} />
    ),
    [navigation],
  );

  const ordersLoading = ordersQ.isLoading;
  const ordersError = ordersQ.error;

  return (
    <Screen>
      <AppHeader
        title="Production Orders"
        subtitle="Every branch's demand"
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={ordersLoading || ordersError ? [] : orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight, gap: 10 }}
        ListHeaderComponent={
          <View>
            <AdminSpecialOrdersCard orders={specialQ.data?.orders ?? []} />

            {waitingQ.isLoading ? (
              <LoadingSkeleton height={140} />
            ) : waitingQ.error ? (
              <View style={{ marginBottom: theme.spacing.lg }}>
                <ErrorState message={mapErrorToMessage(waitingQ.error)} onRetry={() => void waitingQ.refetch()} />
              </View>
            ) : (
              <AdminDemandSummaryCard summary={summary} stockByProduct={stockByProduct} />
            )}

            <View style={styles.ordersHead}>
              <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Orders</Text>
              {!ordersLoading && !ordersError ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  {total} {total === 1 ? 'order' : 'orders'}
                </Text>
              ) : null}
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand #, branch, raised by…" />
            <View style={styles.dropdowns}>
              <View style={{ flex: 1 }}>
                <Dropdown options={STATUS_OPTIONS} value={status} onChange={setStatus} placeholder="All Statuses" />
              </View>
              <View style={{ flex: 1 }}>
                <Dropdown
                  options={branchOptions}
                  value={branchId}
                  onChange={setBranchId}
                  placeholder="All Branches"
                  loading={branchesQ.isLoading}
                />
              </View>
            </View>
            <View style={styles.chips}>
              <RangeChip label="Date" range={dateRange} onPress={() => dateSheetRef.current?.present()} onClear={() => setDateRange(null)} />
              <RangeChip
                label="Required Date"
                range={requiredRange}
                onPress={() => requiredSheetRef.current?.present()}
                onClear={() => setRequiredRange(null)}
              />
            </View>
            {ordersLoading ? <LoadingSkeleton height={120} /> : null}
            {ordersError ? <ErrorState message={mapErrorToMessage(ordersError)} onRetry={() => void ordersQ.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={!ordersLoading && !ordersError ? <EmptyState title="No orders found" /> : undefined}
        ListFooterComponent={
          ordersQ.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined
        }
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={refreshing}
        onRefresh={onRefresh}
        initialNumToRender={8}
        windowSize={7}
      />

      <DateRangeSheet
        ref={dateSheetRef}
        today={today}
        value={dateRange ?? resolveDateRangePreset('last7', today)}
        onApply={setDateRange}
        onRequestClose={() => dateSheetRef.current?.dismiss()}
      />
      <DateRangeSheet
        ref={requiredSheetRef}
        today={today}
        value={requiredRange ?? resolveDateRangePreset('last7', today)}
        onApply={setRequiredRange}
        onRequestClose={() => requiredSheetRef.current?.dismiss()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ordersHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  dropdowns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  chipBody: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
});
