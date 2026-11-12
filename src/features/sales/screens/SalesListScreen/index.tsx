import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Share, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { format, parseISO, subDays } from 'date-fns';
import { exportSalesCsv, getBusinessDate, getBusinessDayBounds, useOrders, useSalesData } from '@/api';
import { Routes, openDrawer, useTabBarHeight, type SalesStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { useDebouncedValue } from '@/shared/hooks';
import { EmptyState, ErrorState, Fab, FAB_CLEARANCE, type FilterChipOption, FilterChipRow, Icon, LoadingSkeleton, PageTitle, Screen, SearchBar, TopBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { summarizeItemsSold, summarizeOrders } from '../../calculations';
import { PaymentMethodTileGrid, SaleCard, SalesDateChipRow, SalesHeroCard, SortSheet, SORT_OPTIONS, type SortField } from '../../components';
import { styles } from './styles';

const PAYMENT_FILTERS = ['All', 'cash', 'easypaisa', 'foodpanda', 'bank_account'] as const;
const PAYMENT_LABEL: Record<string, string> = { All: 'All', cash: 'Cash', easypaisa: 'Easypaisa', foodpanda: 'Foodpanda', bank_account: 'Bank' };
const PAYMENT_CHIPS: FilterChipOption<(typeof PAYMENT_FILTERS)[number]>[] = PAYMENT_FILTERS.map((value) => ({ value, label: PAYMENT_LABEL[value] }));

function isPaymentFilter(value: string): value is (typeof PAYMENT_FILTERS)[number] {
  return (PAYMENT_FILTERS as readonly string[]).includes(value);
}

/** Time/Amount read best most-recent/largest-first; ID/Customer/Comment read best alphabetically. */
const SORT_DIRECTION: Record<SortField, 'asc' | 'desc'> = {
  createdAt: 'desc',
  grandTotal: 'desc',
  orderNumber: 'asc',
  customerName: 'asc',
  notes: 'asc',
};

export function SalesListScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<SalesStackParamList>>();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [paymentFilter, setPaymentFilter] = useState<(typeof PAYMENT_FILTERS)[number]>('All');
  const [selectedDate, setSelectedDate] = useState(() => getBusinessDate());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [exporting, setExporting] = useState(false);
  const sortSheetRef = useRef<BottomSheetModal>(null);

  const today = useMemo(() => getBusinessDate(), []);
  const isToday = selectedDate === today;
  const bounds = useMemo(() => getBusinessDayBounds(selectedDate), [selectedDate]);
  const dateLabel = useMemo(() => format(parseISO(selectedDate), 'EEE d MMM yyyy'), [selectedDate]);

  // Daily Summary — the full business-day order list, exactly like the web's
  // own summary panel (no aggregate endpoint exists for it).
  const { data, isLoading, error, refetch, isRefetching } = useOrders({ status: 'delivered', from: bounds.from, to: bounds.to });
  const orders = useMemo(() => data?.orders ?? [], [data]);
  const summary = useMemo(() => summarizeOrders(orders), [orders]);
  const itemsSold = useMemo(() => summarizeItemsSold(orders), [orders]);

  // Sales list — the Data Engine's `business_date`-scoped, server-searched/
  // sorted/paginated feed (the authoritative count; see `DataEnginePage`'s doc comment).
  const sort = `${sortField}:${SORT_DIRECTION[sortField]}`;
  const salesData = useSalesData({
    businessDate: selectedDate,
    search: debouncedSearch.trim() || undefined,
    paymentMethod: paymentFilter === 'All' ? undefined : paymentFilter,
    sort,
  });
  const rows = useMemo(() => salesData.data?.pages.flatMap((page) => page.data) ?? [], [salesData.data]);
  const recordedCount = salesData.data?.pages[0]?.total ?? null;
  const sortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label ?? 'Time';

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportSalesCsv(selectedDate);
      await Share.share({ title: `Sales ${selectedDate}`, message: csv });
    } catch (e) {
      Alert.alert('Export failed', mapErrorToMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const tiles = useMemo(() => {
    const methods = (Object.entries(summary.byMethod) as [string, { net: number }][])
      // Every method with money on the day, the one being filtered by, and Cash always.
      .filter(([method, totals]) => totals.net !== 0 || method === 'cash' || method === paymentFilter)
      .map(([method, totals]) => ({
        key: method,
        label: PAYMENT_LABEL[method] ?? method,
        value: formatCurrency(totals.net),
        selected: paymentFilter === method,
      }));
    const units = itemsSold.reduce((sum, entry) => sum + entry.qty, 0);
    return [
      ...methods,
      { key: 'items', label: 'Items', value: String(units), sub: `${itemsSold.length} ${itemsSold.length === 1 ? 'product' : 'products'}`, static: true },
    ];
  }, [summary.byMethod, itemsSold, paymentFilter]);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: tabBarHeight + FAB_CLEARANCE }}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (salesData.hasNextPage && !salesData.isFetchingNextPage) void salesData.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <TopBar
              onMenu={openDrawer}
              subtitle={`Sales on ${selectedDate} · ${recordedCount ?? orders.length} recorded`}
              actions={[
                { icon: 'file-spreadsheet', onPress: () => void handleExport(), accessibilityLabel: 'Export sales', loading: exporting },
                { icon: 'refresh', onPress: () => void refetch(), accessibilityLabel: 'Refresh sales' },
              ]}
            />

            <PageTitle eyebrow={dateLabel} title={isToday ? "Today's sales" : 'Sales'} />

            <SalesDateChipRow
              dateLabel={dateLabel}
              isToday={isToday}
              onPrevDay={() => setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}
              onToday={() => setSelectedDate(today)}
            />

            {!isLoading && !error ? (
              <>
                <SalesHeroCard
                  total={formatCurrency(summary.totalSales)}
                  gross={formatCurrency(summary.totalGross)}
                  discount={summary.totalDiscount > 0 ? `− ${formatCurrency(summary.totalDiscount)}` : formatCurrency(0)}
                />
                <PaymentMethodTileGrid
                  tiles={tiles}
                  // Same filter as the chips below; pressing the active tile again
                  // goes back to all methods.
                  onPressTile={(method) => {
                    if (!isPaymentFilter(method)) return;
                    setPaymentFilter((current) => (current === method ? 'All' : method));
                  }}
                />
              </>
            ) : null}

            {isLoading ? <LoadingSkeleton height={220} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            <FilterChipRow options={PAYMENT_CHIPS} value={paymentFilter} onChange={setPaymentFilter} />
            <View style={styles.searchRow}>
              <View style={styles.searchGrow}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer, phone, order #…" />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sort sales, now by ${sortLabel}`}
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.sortChip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                <Icon name="sort" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>{sortLabel}</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          !salesData.isLoading && !salesData.error ? (
            <EmptyState icon="sales" title="No sales recorded" message="Sales for this date will appear here." />
          ) : undefined
        }
        renderItem={({ item }) => <SaleCard order={item} onPress={() => navigation.navigate(Routes.SALE_DETAIL, { orderId: item.id })} />}
        ListFooterComponent={
          salesData.isFetchingNextPage ? (
            <View style={{ paddingVertical: 16 }}>
              <LoadingSkeleton height={60} />
            </View>
          ) : salesData.error ? (
            <ErrorState message={mapErrorToMessage(salesData.error)} onRetry={() => void salesData.refetch()} />
          ) : undefined
        }
        refreshing={isRefetching || salesData.isRefetching}
        onRefresh={() => {
          void refetch();
          void salesData.refetch();
        }}
      />
      <Fab label="New sale" bottom={tabBarHeight + 16} onPress={() => navigation.navigate(Routes.NEW_SALE)} />
      <SortSheet ref={sortSheetRef} value={sortField} onChange={setSortField} onRequestClose={() => sortSheetRef.current?.dismiss()} />
    </Screen>
  );
}
