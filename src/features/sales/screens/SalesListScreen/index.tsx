import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Share, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { format, parseISO, subDays } from 'date-fns';
import { exportSalesCsv, getBusinessDate, getBusinessDayBounds, useOrders, useSalesData } from '@/api';
import { Routes, openDrawer, type SalesStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { useDebouncedValue } from '@/shared/hooks';
import { ErrorState, Icon, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { summarizeItemsSold, summarizeOrders } from '../../calculations';
import { ItemsSoldCard, paymentMethodColor, PaymentMethodTileGrid, SaleCard, SalesDateChipRow, SalesHeroCard, SortSheet, SORT_OPTIONS, type SortField } from '../../components';
import { styles } from './styles';

const PAYMENT_FILTERS = ['All', 'cash', 'easypaisa', 'foodpanda', 'bank_account'] as const;
const PAYMENT_LABEL: Record<string, string> = { All: 'All', cash: 'Cash', easypaisa: 'Easypaisa', foodpanda: 'Foodpanda', bank_account: 'Bank' };

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

  // Daily Summary / Items Sold — the full business-day order list, exactly like
  // the web's own summary panel (no aggregate endpoint exists for these).
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

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (salesData.hasNextPage && !salesData.isFetchingNextPage) void salesData.fetchNextPage();
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.eyebrowRow}>
              <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
                Sales on {selectedDate} · {recordedCount ?? orders.length} recorded
              </Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Export sales" disabled={exporting} onPress={() => void handleExport()} style={styles.refreshAction}>
                  <Icon name="file-spreadsheet" size={13} color={theme.colors.textSecondary} />
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>{exporting ? 'Exporting…' : 'Export'}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Refresh sales" onPress={() => void refetch()} style={styles.refreshAction}>
                  <Icon name="refresh" size={13} color={theme.colors.textSecondary} />
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Refresh</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.titleRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openDrawer} style={{ marginRight: 10 }}>
                <Icon name="menu" size={22} color={theme.colors.text} />
              </Pressable>
              <Text style={[theme.typography.screenTitle, { color: theme.colors.text, textTransform: 'uppercase', flex: 1 }]}>
                Today's{'\n'}
                <Text style={{ color: theme.colors.primary }}>Sales</Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(Routes.NEW_SALE)}
                style={[styles.newSalePill, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill }]}>
                <Icon name="plus" size={16} color={theme.colors.primaryText} />
                <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>New Sale</Text>
              </Pressable>
            </View>

            <SalesDateChipRow
              dateLabel={dateLabel}
              isToday={isToday}
              onPrevDay={() => setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}
              onToday={() => setSelectedDate(today)}
            />

            {!isLoading && !error ? (
              <>
                <View style={{ marginTop: 14 }}>
                  <SalesHeroCard total={formatCurrency(summary.totalSales)} gross={formatCurrency(summary.totalGross)} discount={formatCurrency(summary.totalDiscount)} />
                </View>
                <PaymentMethodTileGrid
                  tiles={Object.entries(summary.byMethod).map(([method, totals]) => ({
                    key: method,
                    label: PAYMENT_LABEL[method] ?? method,
                    value: formatCurrency(totals.net),
                    dotColor: paymentMethodColor(theme, method),
                  }))}
                />
                <ItemsSoldCard
                  totalUnits={itemsSold.reduce((sum, i) => sum + i.qty, 0)}
                  totalProducts={itemsSold.length}
                  chips={itemsSold.map((i) => ({ key: i.productName, n: i.productName, q: `× ${i.qty}` }))}
                />
              </>
            ) : null}

            {isLoading ? <LoadingSkeleton height={220} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            <View style={{ marginTop: 18 }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer, phone, order #…" />
            </View>
            <View style={styles.filterChipsRow}>
              {PAYMENT_FILTERS.map((option) => {
                const active = option === paymentFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setPaymentFilter(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.cardFill, borderColor: active ? theme.colors.primary : theme.colors.cardBorder },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {PAYMENT_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sort sales"
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.chip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, flexDirection: 'row', gap: 4 }]}>
                <Icon name="bar-chart" size={12} color={theme.colors.text} />
                <Text style={[theme.typography.label, { color: theme.colors.text }]}>
                  Sort: {SORT_OPTIONS.find((o) => o.field === sortField)?.label}
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          !salesData.isLoading && !salesData.error ? (
            <View style={[styles.emptyBox, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.textSecondary }]}>No sales recorded</Text>
            </View>
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
      <SortSheet ref={sortSheetRef} value={sortField} onChange={setSortField} onRequestClose={() => sortSheetRef.current?.dismiss()} />
    </Screen>
  );
}
