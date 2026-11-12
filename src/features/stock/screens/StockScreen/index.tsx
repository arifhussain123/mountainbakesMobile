import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useOfflineQueueStore } from '@/state';
import { Routes, openDrawer, useTabBarHeight, type StockStackParamList } from '@/navigation';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, IconButton, InfoBanner, LoadingSkeleton, Screen, SearchBar, SmallButton } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime } from '@/shared/utils';
import type { StockRowWithDemand } from '../../calculations';
import { computeTotals, filterListedRows, sortStockRows } from '../../calculations';
import { useStock } from '../../api/useStock';
import {
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_KEY,
  StockCard,
  StockInfoSheet,
  StockSortSheet,
  StockSummaryGrid,
  defaultDirectionFor,
  type StockSortDirection,
  type StockSortKey,
} from '../../components';
import { styles } from './styles';

interface StockCachePayload {
  date: string;
  rows: StockRowWithDemand[];
}

const WIDE_LAYOUT_MIN_WIDTH = 900;

export function StockScreen() {
  const theme = useAppTheme();
  const { width } = useResponsive();
  /** Wide tablets / landscape: two cards side by side so each card's seven columns stay a readable width instead of stretching edge to edge. */
  const listColumns = width >= WIDE_LAYOUT_MIN_WIDTH ? 2 : 1;
  const tabBarHeight = useTabBarHeight();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<StockStackParamList>>();
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const sortSheetRef = useRef<BottomSheetModal>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [sortKey, setSortKey] = useState<StockSortKey>(DEFAULT_SORT_KEY);
  const [sortDirection, setSortDirection] = useState<StockSortDirection>(DEFAULT_SORT_DIRECTION);
  const isDefaultSort = sortKey === DEFAULT_SORT_KEY && sortDirection === DEFAULT_SORT_DIRECTION;

  const today = getBusinessDate();
  const dateLabel = format(parseISO(today), 'EEE d MMM yyyy');

  const { rows: rawRows, isLoading, error, refetch, isRefetching } = useStock();
  const pendingWrites = useOfflineQueueStore((state) => state.pendingCount);

  const cacheKey = `stock:${today}`;
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
    if (rawRows.length > 0) void setCachedResponse(cacheKey, { date: today, rows: rawRows });
  }, [cacheKey, rawRows, today]);

  const showingCache = rawRows.length === 0 && !isLoading && !!cached;
  const sourceRows = useMemo(
    () => (rawRows.length > 0 ? rawRows : showingCache ? cached!.data.rows : []),
    [rawRows, showingCache, cached],
  );

  const listed = useMemo(() => filterListedRows(sourceRows), [sourceRows]);

  const searched = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return term ? listed.filter((row) => row.productName.toLowerCase().includes(term)) : listed;
  }, [listed, debouncedSearch]);

  const sorted = useMemo(() => sortStockRows(searched, sortKey, sortDirection), [searched, sortKey, sortDirection]);
  const totals = useMemo(() => computeTotals(searched), [searched]);

  return (
    <Screen>
      <AppHeader
        title="Branch stock"
        subtitle={dateLabel}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <View style={styles.headerPad}>
        <View style={styles.actionRow}>
          <SmallButton
            label="Stock check"
            icon="check"
            kind="soft"
            size="sm"
            accessibilityLabel="Stock Check"
            onPress={() => navigation.navigate(Routes.STOCK_CHECK)}
          />
          <IconButton
            icon="info"
            accessibilityLabel="What do these columns mean?"
            onPress={() => infoSheetRef.current?.present()}
          />
        </View>

        {showingCache ? (
          <InfoBanner kind="info" style={styles.banner}>
            {`Offline · Last updated ${formatDisplayTime(new Date(cached!.updatedAt).toISOString())}`}
          </InfoBanner>
        ) : null}

        {pendingWrites > 0 ? (
          <InfoBanner kind="warn" style={styles.banner}>
            {`${pendingWrites} local ${pendingWrites === 1 ? 'change' : 'changes'} not yet synced. Balances may be higher than actual.`}
          </InfoBanner>
        ) : null}
      </View>

      <FlatList
        key={`stock-columns-${listColumns}`}
        data={sorted}
        numColumns={listColumns}
        columnWrapperStyle={listColumns > 1 ? styles.cardColumns : undefined}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <StockSummaryGrid totals={totals} productCount={searched.length} />
            <InfoBanner kind="brand">
              Opening carries over from yesterday; new stock lands when you verify a delivery. Products with no stock and no movement are hidden.
            </InfoBanner>
            <View style={styles.searchSortRow}>
              <View style={{ flex: 1 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
              </View>
              <IconButton icon="sort" accessibilityLabel="Sort" dot={!isDefaultSort} onPress={() => sortSheetRef.current?.present()} />
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error && !showingCache ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Products" message="No stock to show yet." /> : undefined
        }
        renderItem={({ item }) =>
          listColumns > 1 ? (
            <View style={styles.cardCell}>
              <StockCard row={item} showDemand />
            </View>
          ) : (
            <StockCard row={item} showDemand />
          )
        }
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={infoSheetRef} title="What do these columns mean?" onRequestClose={() => infoSheetRef.current?.dismiss()}>
        <StockInfoSheet />
      </FormBottomSheet>
      <FormBottomSheet ref={sortSheetRef} title="Sort by" onRequestClose={() => sortSheetRef.current?.dismiss()}>
        <StockSortSheet
          sortKey={sortKey}
          direction={sortDirection}
          onChangeDirection={setSortDirection}
          onChangeKey={(key) => {
            setSortKey(key);
            setSortDirection(defaultDirectionFor(key));
            sortSheetRef.current?.dismiss();
          }}
        />
      </FormBottomSheet>
    </Screen>
  );
}
