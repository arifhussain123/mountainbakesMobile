import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
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
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, PillButton, Screen, SearchBar } from '@/shared/ui';
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

export function StockScreen() {
  const theme = useAppTheme();
  const { clamp, sh } = useResponsive();
  const stockCheckHeight = clamp(48, sh(54), 58);
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
      <AppHeader title="Stock" actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <View style={styles.headerPad}>
        <View style={styles.subtitleRow}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{dateLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="What do these columns mean?"
            hitSlop={8}
            onPress={() => infoSheetRef.current?.present()}
            style={styles.infoButton}>
            <Icon name="info" size={14} color={theme.colors.textFaint} />
          </Pressable>
        </View>

        <View style={styles.stockCheckRow}>
          <PillButton
            label="Stock Check"
            onPress={() => navigation.navigate(Routes.STOCK_CHECK)}
            height={stockCheckHeight}
            accessibilityLabel="Stock Check"
          />
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
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.md }}>
            <StockSummaryGrid totals={totals} productCount={searched.length} />
            <View style={styles.searchSortRow}>
              <View style={{ flex: 1 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sort"
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.sortButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md }]}>
                <Icon name="sort" size={18} color={theme.colors.text} />
                {!isDefaultSort ? <View style={[styles.sortDot, { backgroundColor: theme.colors.primary }]} /> : null}
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
          !isLoading && !error ? <EmptyState title="No Products" message="No stock to show yet." /> : undefined
        }
        renderItem={({ item }) => <StockCard row={item} showDemand />}
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
