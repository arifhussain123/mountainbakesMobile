import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { format, parseISO, subDays } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate } from '@/api';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useOfflineQueueStore } from '@/state';
import { Routes, openDrawer, type StockStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PillButton, Screen, SearchBar } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime } from '@/shared/utils';
import type { StockRowWithDemand } from '../../calculations';
import { computeTotals, filterListedRows } from '../../calculations';
import { useStock } from '../../api/useStock';
import {
  StockCard,
  StockDateChipRow,
  StockFilterChips,
  StockInfoSheet,
  StockSortSheet,
  StockSummaryStrip,
  type StockFilter,
  type StockSortKey,
} from '../../components';
import { ReturnItemsSheetContent } from '../ReturnItemsScreen';
import { styles } from './styles';

interface StockCachePayload {
  date: string;
  rows: StockRowWithDemand[];
}

function matchesFilter(row: StockRowWithDemand, filter: StockFilter): boolean {
  switch (filter) {
    case 'inStock':
      return row.balance > 0;
    case 'zero':
      return row.balance === 0;
    case 'hasMovement':
      return row.newQty !== 0 || row.sold !== 0 || row.returned !== 0;
    case 'waitingDemand':
      return row.waitingDemand > 0;
    case 'adjusted':
      return row.adjustment !== 0;
    case 'all':
    default:
      return true;
  }
}

function sortRows(rows: StockRowWithDemand[], key: StockSortKey): StockRowWithDemand[] {
  const sorted = [...rows];
  if (key === 'productName' || key === 'stockCode') {
    sorted.sort((a, b) => a[key].localeCompare(b[key]));
  } else {
    sorted.sort((a, b) => b[key] - a[key]);
  }
  return sorted;
}

export function StockScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StockStackParamList>>();
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const sortSheetRef = useRef<BottomSheetModal>(null);
  const returnItemsSheetRef = useRef<BottomSheetModal>(null);

  const [selectedDate, setSelectedDate] = useState(() => getBusinessDate());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<StockSortKey>('balance');

  const today = getBusinessDate();
  const isToday = selectedDate === today;
  const dateLabel = format(parseISO(selectedDate), 'EEE d MMM yyyy');

  const { rows: rawRows, isLoading, error, refetch, isRefetching } = useStock(selectedDate);
  const pendingWrites = useOfflineQueueStore((state) => state.pendingCount);

  const cacheKey = `stock:${selectedDate}`;
  const [cached, setCached] = useState<{ data: StockCachePayload; updatedAt: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<StockCachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  useEffect(() => {
    if (rawRows.length > 0) void setCachedResponse(cacheKey, { date: selectedDate, rows: rawRows });
  }, [cacheKey, rawRows, selectedDate]);

  const showingCache = rawRows.length === 0 && !isLoading && !!cached;
  const sourceRows = useMemo(
    () => (rawRows.length > 0 ? rawRows : showingCache ? cached!.data.rows : []),
    [rawRows, showingCache, cached],
  );

  const listed = useMemo(() => filterListedRows(sourceRows), [sourceRows]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return listed.filter((row) => matchesFilter(row, filter) && (!term || row.productName.toLowerCase().includes(term)));
  }, [listed, filter, debouncedSearch]);

  const sorted = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey]);
  const totals = useMemo(() => computeTotals(filtered), [filtered]);

  return (
    <Screen>
      <AppHeader title="Stock" subtitle={dateLabel} actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <View style={styles.headerPad}>
        <StockDateChipRow
          dateLabel={dateLabel}
          isToday={isToday}
          onPrevDay={() => setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}
          onToday={() => setSelectedDate(today)}
          onInfo={() => infoSheetRef.current?.present()}
        />

        <View style={styles.stockCheckRow}>
          <PillButton
            label="Stock Check"
            onPress={() => navigation.navigate(Routes.STOCK_CHECK)}
            disabled={!isToday}
            accessibilityLabel={isToday ? 'Stock Check' : 'Stock Check is for today only'}
          />
        </View>
        {!isToday ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>Stock Check is for today only.</Text>
        ) : null}

        <View style={styles.quickActionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => returnItemsSheetRef.current?.present()}
            style={[styles.quickAction, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Return Items</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(Routes.RETURN_STOCK_LIST)}
            style={[styles.quickAction, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Return Stock</Text>
          </Pressable>
        </View>

        {showingCache ? (
          <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())}
            </Text>
          </View>
        ) : null}

        {pendingWrites > 0 ? (
          <View style={[styles.offlinePill, { backgroundColor: `${theme.colors.warning}1A`, borderColor: theme.colors.warning, marginTop: 8 }]}>
            <Text style={[theme.typography.label, { color: theme.colors.warning }]}>
              {pendingWrites} local {pendingWrites === 1 ? 'change' : 'changes'} not yet synced. Balances may be higher than actual.
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.md }}>
            <StockSummaryStrip totals={totals} showDemand={isToday} />
            <View style={{ marginTop: 12 }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
            </View>
            <View style={styles.filtersSortRow}>
              <View style={{ flex: 1 }}>
                <StockFilterChips value={filter} onChange={setFilter} showWaitingDemand={isToday} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sort"
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.sortButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill }]}>
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Sort</Text>
              </Pressable>
            </View>
            {isLoading ? <View style={{ marginTop: 12 }}><LoadingSkeleton height={100} /></View> : null}
            {error && !showingCache ? (
              <View style={{ marginTop: 12 }}>
                <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Products" message="No stock matches this filter." /> : undefined
        }
        renderItem={({ item }) => <StockCard row={item} showDemand={isToday} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={infoSheetRef} title="What do these columns mean?" onRequestClose={() => infoSheetRef.current?.dismiss()}>
        <StockInfoSheet />
      </FormBottomSheet>
      <FormBottomSheet ref={sortSheetRef} title="Sort by" onRequestClose={() => sortSheetRef.current?.dismiss()}>
        <StockSortSheet
          value={sortKey}
          onChange={(key) => {
            setSortKey(key);
            sortSheetRef.current?.dismiss();
          }}
        />
      </FormBottomSheet>
      <FormBottomSheet ref={returnItemsSheetRef} title="Return Items" onRequestClose={() => returnItemsSheetRef.current?.dismiss()}>
        <ReturnItemsSheetContent onClose={() => returnItemsSheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
