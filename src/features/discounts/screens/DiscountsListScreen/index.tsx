import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, useBranchDiscountSummary, useBranchDiscountsList } from '@/api';
import { Routes, openDrawer, type DiscountsStackParamList } from '@/navigation';
import { tintFill, useAppTheme } from '@/shared/theme';
import { useDebouncedValue, useNetworkStatus } from '@/shared/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAuthStore, useOfflineQueueStore } from '@/state';
import { DateRangeSheet, EmptyState, ErrorState, Fab, type FilterChipOption, FilterChipRow, FormBottomSheet, Icon, LoadingSkeleton, PageTitle, Screen, SearchBar, TopBar } from '@/shared/ui';
import { formatDisplayTime, resolveDateRangePreset, type DateRange } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchDiscount, BranchDiscountStatus } from '@/api';
import { DiscountCard, MonthlyDiscountSummaryCard, SortSheet, WithdrawConfirmSheet, type DiscountSortField } from '../../components';
import { useDiscountActions } from '../../hooks';
import { RequestDiscountSheetContent } from '../RequestDiscountScreen';
import { styles } from './styles';

type StatusFilter = 'all' | BranchDiscountStatus;

const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Awaiting Production' },
  { value: 'returned', label: 'Sent Back to Fix' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_DIRECTION: Record<DiscountSortField, 'asc' | 'desc'> = {
  date: 'desc',
  reviewedAt: 'desc',
  demandNumber: 'asc',
  amount: 'desc',
  reason: 'asc',
  status: 'asc',
};

/** Redesign `14 Discounts` — the branch's own claim history, with a "Request" FAB for a new claim. */
export function DiscountsListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<DiscountsStackParamList>>();
  const { isOffline } = useNetworkStatus();
  const branchName = useAuthStore((state) => state.user?.branchName ?? null);

  const requestSheetRef = useRef<BottomSheetModal>(null);
  const dateSheetRef = useRef<BottomSheetModal>(null);
  const sortSheetRef = useRef<BottomSheetModal>(null);
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const withdrawSheetRef = useRef<BottomSheetModal>(null);

  const today = useMemo(() => getBusinessDate(), []);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRangePreset('last90', today));
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [sortField, setSortField] = useState<DiscountSortField>('date');
  const [editItem, setEditItem] = useState<BranchDiscount | null>(null);
  const [withdrawItem, setWithdrawItem] = useState<BranchDiscount | null>(null);

  const { withdrawDiscount, isWithdrawing, raceError, clearRaceError } = useDiscountActions();

  const isDefaultRange = dateRange.from === resolveDateRangePreset('last90', today).from && dateRange.to === resolveDateRangePreset('last90', today).to;

  const queryParams = {
    from: dateRange.from,
    to: dateRange.to,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearch.trim() || undefined,
    sortBy: sortField,
    sortDir: SORT_DIRECTION[sortField],
  };
  const list = useBranchDiscountsList(queryParams);
  const summaryQ = useBranchDiscountSummary();
  const rows = useMemo(() => list.data?.pages.flatMap((page) => page.discounts) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? null;

  // Offline fallback — the first page of whatever filter combination was last fetched successfully.
  const cacheKey = `discounts:${JSON.stringify(queryParams)}`;
  const [cached, setCached] = useState<{ data: BranchDiscount[]; updatedAt: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<BranchDiscount[]>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  useEffect(() => {
    if (rows.length > 0) void setCachedResponse(cacheKey, rows);
  }, [cacheKey, rows]);

  const showingCache = rows.length === 0 && isOffline && !!cached?.data.length && !list.isLoading;
  const displayRows = rows.length > 0 ? rows : showingCache ? cached!.data : [];

  // Select the stable `writes` array and derive the `Set` in a `useMemo`,
  // not inside the selector — zustand v5's hook re-invokes the selector on
  // every render to check for tears, and a selector returning a brand-new
  // `Set` each time makes React think the store changed every single render,
  // which is an infinite re-render loop ("Maximum update depth exceeded"),
  // not just a missed memoization.
  const writes = useOfflineQueueStore((state) => state.writes);
  const pendingDiscountIds = useMemo(
    () =>
      new Set(
        writes
          .filter((w) => (w.status === 'pending' || w.status === 'syncing') && w.endpoint.startsWith('/branch-discounts/'))
          .map((w) => w.endpoint.replace('/branch-discounts/', '')),
      ),
    [writes],
  );

  const activeFilters: { key: string; label: string; onClear: () => void }[] = [];
  if (statusFilter !== 'all') {
    activeFilters.push({ key: 'status', label: STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter, onClear: () => setStatusFilter('all') });
  }
  if (!isDefaultRange) {
    activeFilters.push({ key: 'range', label: `${dateRange.from} – ${dateRange.to}`, onClear: () => setDateRange(resolveDateRangePreset('last90', today)) });
  }
  if (search.trim()) {
    activeFilters.push({ key: 'search', label: `"${search.trim()}"`, onClear: () => setSearch('') });
  }
  const rangeLabel = isDefaultRange ? 'Last 90 days' : `${dateRange.from} – ${dateRange.to}`;
  const clearAll = () => {
    setStatusFilter('all');
    setDateRange(resolveDateRangePreset('last90', today));
    setSearch('');
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawItem) return;
    const result = await withdrawDiscount(withdrawItem.id);
    if (result.ok) {
      withdrawSheetRef.current?.dismiss();
      setWithdrawItem(null);
    } else if (result.error) {
      Alert.alert('Could Not Withdraw', result.error, [{ text: 'OK', onPress: () => {} }]);
    }
  };

  const openRequest = () => {
    setEditItem(null);
    requestSheetRef.current?.present();
  };

  return (
    <Screen>
      <FlatList
        data={displayRows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <TopBar
              onMenu={openDrawer}
              subtitle={branchName ?? undefined}
              actions={[{ icon: 'info', onPress: () => infoSheetRef.current?.present(), accessibilityLabel: 'About discount claims' }]}
            />
            <PageTitle title="Discounts" sub="Money claimed back against a demand · last 90 days." />

            {showingCache ? (
              <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())} · Offline
                </Text>
              </View>
            ) : null}

            <MonthlyDiscountSummaryCard
              summary={summaryQ.data}
              isLoading={summaryQ.isLoading}
              error={summaryQ.error}
              onRetry={() => void summaryQ.refetch()}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Date range, ${rangeLabel}. Change`}
              onPress={() => dateSheetRef.current?.present()}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Date range</Text>
              <View style={[styles.fieldInput, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
                <Icon name="calendar" size={20} color={theme.colors.textFaint} />
                <Text style={[styles.fieldValue, { color: theme.colors.text }]} numberOfLines={1}>
                  {rangeLabel}
                </Text>
                <Icon name="chevron-down" size={18} color={theme.colors.textFaint} />
              </View>
            </Pressable>

            <FilterChipRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />

            <View style={styles.searchRow}>
              <View style={styles.grow}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand # or reason…" />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sort claims"
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.sortChip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                <Icon name="sort" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>Sort</Text>
              </Pressable>
            </View>

            {activeFilters.length > 0 ? (
              <View style={styles.activeFiltersRow}>
                {activeFilters.map((f) => (
                  <Pressable
                    key={f.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Clear filter ${f.label}`}
                    onPress={f.onClear}
                    style={[styles.activeChip, { backgroundColor: tintFill(theme) }]}>
                    <Text style={[theme.typography.label, { color: theme.colors.text }]}>{f.label}</Text>
                    <Icon name="close" size={10} color={theme.colors.textSecondary} />
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" onPress={clearAll} style={styles.activeChip}>
                  <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Clear all</Text>
                </Pressable>
              </View>
            ) : null}
            {total !== null ? (
              <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{total} claims in this range</Text>
            ) : null}
            {list.isLoading ? (
              <View style={{ gap: 10 }}>
                <LoadingSkeleton height={100} />
                <LoadingSkeleton height={100} />
              </View>
            ) : null}
            {list.error && displayRows.length === 0 ? <ErrorState message={mapErrorToMessage(list.error)} onRetry={() => void list.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !list.isLoading && !list.error ? (
            <EmptyState
              title={statusFilter === 'pending' ? 'Nothing awaiting review' : 'No discount claims in this range'}
              message="Try another status, date range, or search."
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <DiscountCard
            item={item}
            onPress={() => navigation.navigate(Routes.DISCOUNT_DETAIL, { discountId: item.id })}
            onChange={() => {
              setEditItem(item);
              requestSheetRef.current?.present();
            }}
            onWithdraw={() => {
              setWithdrawItem(item);
              withdrawSheetRef.current?.present();
            }}
            disableActions={pendingDiscountIds.has(item.id)}
          />
        )}
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View style={{ paddingVertical: 16 }}>
              <LoadingSkeleton height={60} />
            </View>
          ) : undefined
        }
        refreshing={list.isRefetching}
        onRefresh={() => {
          void list.refetch();
          void summaryQ.refetch();
        }}
      />

      <Fab label="Request" accessibilityLabel="Request discount" bottom={20} onPress={openRequest} />

      <FormBottomSheet
        ref={requestSheetRef}
        title={editItem ? 'Change Discount' : 'Request Discount'}
        onRequestClose={() => requestSheetRef.current?.dismiss()}>
        <RequestDiscountSheetContent editItem={editItem} onDone={() => requestSheetRef.current?.dismiss()} />
      </FormBottomSheet>

      <DateRangeSheet ref={dateSheetRef} today={today} value={dateRange} onApply={setDateRange} onRequestClose={() => dateSheetRef.current?.dismiss()} />
      <SortSheet ref={sortSheetRef} value={sortField} onChange={setSortField} onRequestClose={() => sortSheetRef.current?.dismiss()} />

      <WithdrawConfirmSheet
        ref={withdrawSheetRef}
        item={withdrawItem}
        isSubmitting={isWithdrawing}
        error={raceError}
        onConfirm={() => void handleWithdrawConfirm()}
        onRequestClose={() => {
          withdrawSheetRef.current?.dismiss();
          clearRaceError();
          setWithdrawItem(null);
        }}
      />

      <FormBottomSheet ref={infoSheetRef} title="About Discount Claims" onRequestClose={() => infoSheetRef.current?.dismiss()} snapPoints={['32%']}>
        <Text style={[theme.typography.body, { color: theme.colors.text }]}>
          You can change or withdraw a claim until Production reviews it. After review it's final.
        </Text>
      </FormBottomSheet>
    </Screen>
  );
}
