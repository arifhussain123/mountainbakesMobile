import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, Share, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  exportPriceHistoryCsv,
  getBusinessDate,
  useCatalogProducts,
  usePriceHistoryPages,
  type PriceChange,
} from '@/api';
import { Routes, type PriceHistoryStackParamList } from '@/navigation';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, DateRangeSheet, EmptyState, ErrorState, LoadingSkeleton, Screen, type DropdownOption } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime, resolveDateRangePreset, type DateRange } from '@/shared/utils';
import { PriceChangeCard } from '../../components/PriceChangeCard';
import { ALL, PriceHistoryFilters, type DirectionFilter, type SourceFilter } from '../../components/PriceHistoryFilters';
import { groupByMonth, inForceIds, matchesPriceFilters, priceHints } from '../../utils/priceHistoryHints';
import { styles } from './styles';

interface CachePayload {
  history: PriceChange[];
}

/**
 * Price History — every price change, permanently recorded (Super Admin).
 *
 * READ-ONLY. No edit, delete or revert: a price changes only through the
 * product's Change Price action or a Price List import, and each one is a new
 * `product_price_history` row. This screen only reads them.
 *
 * WHAT THE SERVER FILTERS. Product and search go to the API; the date window
 * (by effective date), who changed it, direction and source are applied here
 * to the loaded rows — the API has no such parameters. While one of those is
 * on, every page is loaded so the narrowed list is complete rather than "the
 * matches in the first page".
 */
export function PriceHistoryScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<PriceHistoryStackParamList>>();
  const dateSheetRef = useRef<BottomSheetModal>(null);
  const today = getBusinessDate();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search).trim();
  const [productId, setProductId] = useState<string>(ALL);
  const [changedBy, setChangedBy] = useState<string>(ALL);
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [exporting, setExporting] = useState(false);

  const serverQuery = useMemo(
    () => ({ productId: productId === ALL ? undefined : productId, search: debouncedSearch || undefined }),
    [productId, debouncedSearch],
  );
  const pagesQ = usePriceHistoryPages(serverQuery);
  const catalogQ = useCatalogProducts();
  const liveRows = useMemo(() => pagesQ.data?.pages.flatMap((p) => p.history) ?? [], [pagesQ.data]);

  // ── Offline: the last loaded rows for this server query.
  const cacheKey = `priceHistory:${JSON.stringify(serverQuery)}`;
  const [cached, setCached] = useState<{ data: CachePayload; updatedAt: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<CachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  useEffect(() => {
    if (liveRows.length > 0) void setCachedResponse(cacheKey, { history: liveRows.slice(0, 200) });
  }, [cacheKey, liveRows]);

  const error = pagesQ.error;
  const showingCache = liveRows.length === 0 && !pagesQ.isLoading && !!error && !!cached;
  const rows = showingCache ? cached!.data.history : liveRows;

  const clientFilters = useMemo(
    () => ({
      from: dateRange?.from,
      to: dateRange?.to,
      changedBy: changedBy === ALL ? undefined : changedBy,
      direction: direction === 'all' ? undefined : direction,
      source: source === 'all' ? undefined : source,
    }),
    [dateRange, changedBy, direction, source],
  );
  const clientFiltering = !!(clientFilters.from || clientFilters.changedBy || clientFilters.direction || clientFilters.source);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = pagesQ;
  useEffect(() => {
    if (clientFiltering && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [clientFiltering, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const costById = useMemo(() => new Map((catalogQ.data?.products ?? []).map((p) => [p.id, p.costPrice])), [catalogQ.data]);
  const inForce = useMemo(() => inForceIds(rows), [rows]);
  const sections = useMemo(() => groupByMonth(rows.filter((r) => matchesPriceFilters(r, clientFilters))), [rows, clientFilters]);

  // Products: the ordinary catalogue plus any (hidden Special Order) product a loaded change is on.
  const productOptions = useMemo<DropdownOption[]>(() => {
    const seen = new Map<string, string>();
    for (const p of catalogQ.data?.products ?? []) if (!p.isSpecial) seen.set(p.id, p.name);
    for (const r of rows) if (!seen.has(r.productId)) seen.set(r.productId, r.productName);
    return [
      { value: ALL, label: 'All products' },
      ...[...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })),
    ];
  }, [catalogQ.data, rows]);
  const changedByOptions = useMemo<DropdownOption[]>(() => {
    const names = [...new Set(rows.map((r) => r.changedByName).filter((n): n is string => !!n))].sort();
    return [{ value: ALL, label: 'Anyone' }, ...names.map((n) => ({ value: n, label: `Changed by ${n}` }))];
  }, [rows]);

  const hasActiveFilters = productId !== ALL || !!debouncedSearch || clientFiltering;
  const clearAll = () => {
    setSearch('');
    setProductId(ALL);
    setChangedBy(ALL);
    setDirection('all');
    setSource('all');
    setDateRange(null);
  };

  const refresh = () => {
    void pagesQ.refetch();
    void catalogQ.refetch();
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = await exportPriceHistoryCsv(productId === ALL ? undefined : productId);
      await Share.share({ title: 'Price History', message: csv });
    } catch (e) {
      Alert.alert('Could Not Export', mapErrorToMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const total = pagesQ.data?.pages[0]?.total;

  return (
    <Screen>
      <AppHeader
        title="Price History"
        subtitle="Every price change, permanently recorded. Read-only."
        actions={[
          { icon: 'file-spreadsheet', onPress: () => void handleExport(), accessibilityLabel: productId === ALL ? 'Export all price history as CSV' : "Export this product's price history as CSV" },
          { icon: 'refresh', onPress: refresh, accessibilityLabel: 'Refresh' },
        ]}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (pagesQ.hasNextPage && !pagesQ.isFetchingNextPage && !showingCache) void pagesQ.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.md }}>
            {showingCache ? (
              <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())}
                </Text>
              </View>
            ) : null}
            <PriceHistoryFilters
              search={search}
              onSearch={setSearch}
              productOptions={productOptions}
              productId={productId}
              onProduct={setProductId}
              changedByOptions={changedByOptions}
              changedBy={changedBy}
              onChangedBy={setChangedBy}
              direction={direction}
              onDirection={setDirection}
              source={source}
              onSource={setSource}
              dateRange={dateRange}
              onOpenDates={() => dateSheetRef.current?.present()}
              onClearDates={() => setDateRange(null)}
              hasActiveFilters={hasActiveFilters}
              onClearAll={clearAll}
            />
            {total !== undefined && !showingCache ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {total} {total === 1 ? 'change' : 'changes'} on record{exporting ? ' · preparing export…' : ''}
              </Text>
            ) : null}
            {pagesQ.isLoading ? <LoadingSkeleton height={120} /> : null}
            {error && !showingCache ? <ErrorState message={mapErrorToMessage(error)} onRetry={refresh} /> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: 4, marginBottom: 8 }]} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <PriceChangeCard
            change={item}
            hints={priceHints(item, rows, costById.get(item.productId))}
            inForce={inForce.has(item.id)}
            onPress={() => navigation.navigate(Routes.PRICE_HISTORY_PRODUCT, { productId: item.productId, productName: item.productName })}
          />
        )}
        ListEmptyComponent={
          !pagesQ.isLoading && !error ? (
            <EmptyState
              title="No Price Changes"
              message={hasActiveFilters ? 'Nothing matches these filters.' : 'Price changes will appear here once a price is changed.'}
              actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
              onAction={hasActiveFilters ? clearAll : undefined}
            />
          ) : undefined
        }
        ListFooterComponent={pagesQ.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        refreshing={pagesQ.isRefetching && !pagesQ.isFetchingNextPage}
        onRefresh={refresh}
      />
      <DateRangeSheet
        ref={dateSheetRef}
        today={today}
        value={dateRange ?? resolveDateRangePreset('last90', today)}
        onApply={setDateRange}
        onRequestClose={() => dateSheetRef.current?.dismiss()}
      />
    </Screen>
  );
}
