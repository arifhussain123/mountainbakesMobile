import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  getBusinessDate,
  useBranchReturns,
  useBranchReturnsSummary,
  useProducts,
  useReviseBranchReturn,
  useWithdrawBranchReturn,
} from '@/api';
import type { BranchReturn, BranchReturnStatus } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { MonthlyReturnsSummaryCard, ReturnDetailSheet, ReturnOptionSheet, ReturnStockCard, ReviseReturnModal } from '../../components';
import {
  DEFAULT_RETURN_SORT,
  DEFAULT_RETURN_WINDOW,
  RETURN_SORTS,
  RETURN_STATUS_FILTERS,
  RETURN_WINDOWS,
  buildReturnStockParams,
  describeShowing,
  pageCount,
  pagerSlots,
  returnWindowLabel,
  type ReturnWindowKey,
} from '../../returnStockList';
import { styles } from './styles';

const SUMMARY_STATUS_LABEL = { pending: 'Pending', returned: 'Sent Back', accepted: 'Accepted', rejected: 'Rejected' };
const ALL_PRODUCTS = 'all';

/**
 * mountainbakesBranch.html screen 13 — Return Stock: what this branch has
 * sent back to Production.
 *
 * Top to bottom: the month-to-date returns summary (server-summed — see
 * `MonthlyReturnsSummaryCard`), then the mock's search + Sort row, the
 * Product and window pills, the status chips, the return cards and the
 * pager. Every filter, the sort and the page go to the server
 * (`buildReturnStockParams`), so "Showing x of N" and the page order are the
 * whole list's, not the page in hand's. A card opens the full record, where
 * Change and Withdraw sit while Production has not yet decided.
 */
export function ReturnStockListScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<BranchReturnStatus | 'all'>('all');
  const [windowKey, setWindowKey] = useState<ReturnWindowKey>(DEFAULT_RETURN_WINDOW);
  const [productId, setProductId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState(DEFAULT_RETURN_SORT.key);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<BranchReturn | null>(null);
  const [editing, setEditing] = useState<BranchReturn | null>(null);

  const sortSheetRef = useRef<BottomSheetModal>(null);
  const windowSheetRef = useRef<BottomSheetModal>(null);
  const productSheetRef = useRef<BottomSheetModal>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);

  const sort = RETURN_SORTS.find((s) => s.key === sortKey) ?? DEFAULT_RETURN_SORT;
  const today = getBusinessDate();
  const params = useMemo(
    () => buildReturnStockParams({ window: windowKey, today, productId, status, search: debouncedSearch, sort, page }),
    [windowKey, today, productId, status, debouncedSearch, sort, page],
  );

  const list = useBranchReturns(params);
  const summary = useBranchReturnsSummary();
  const products = useProducts();
  const revise = useReviseBranchReturn();
  const withdraw = useWithdrawBranchReturn();

  const returns = list.data?.returns ?? [];
  const total = list.data?.total ?? 0;
  const pages = pageCount(total);
  const productOptions = useMemo(
    () => [
      { value: ALL_PRODUCTS, label: 'All products' },
      ...(products.data?.products ?? []).map((p) => ({ value: p.id, label: p.name, hint: p.sku || undefined })),
    ],
    [products.data],
  );
  const productLabel = productId ? (productOptions.find((p) => p.value === productId)?.label ?? 'Selected') : 'All';
  const filtered = status !== 'all' || productId !== null || debouncedSearch.trim() !== '' || windowKey !== DEFAULT_RETURN_WINDOW;

  // Every filter change starts again from page 1 — page 3 of the old answer
  // is not a page of the new one.
  const refilter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const onSearch = (text: string) => {
    setSearch(text);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setProductId(null);
    setWindowKey(DEFAULT_RETURN_WINDOW);
    setPage(1);
  };

  const onRefresh = () => {
    void list.refetch();
    void summary.refetch();
  };

  const openDetail = useCallback((item: BranchReturn) => {
    setViewing(item);
    detailSheetRef.current?.present();
  }, []);

  const handleChange = () => {
    if (!viewing) return;
    const item = viewing;
    detailSheetRef.current?.dismiss();
    setEditing(item);
  };

  const handleWithdraw = () => {
    if (!viewing) return;
    const item = viewing;
    Alert.alert('Withdraw Return', `Remove this ${item.productName} return? The units go back to your branch stock.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () => {
          withdraw.mutate(item.id, {
            onSuccess: () => detailSheetRef.current?.dismiss(),
            onError: (e) => Alert.alert('Could Not Withdraw', mapErrorToMessage(e)),
          });
        },
      },
    ]);
  };

  const handleReviseSubmit = (qty: number, reason: string) => {
    if (!editing) return;
    revise.mutate({ id: editing.id, input: { qty, reason } }, { onSuccess: () => setEditing(null) });
  };

  const pill = (label: string, value: string, onPress: () => void, accessibilityLabel: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.pill, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.label, styles.pillText, { color: theme.colors.text }]} numberOfLines={1}>
        <Text style={{ color: theme.colors.textFaint }}>{label}</Text>
        {value}
      </Text>
      <Icon name="chevron-down" size={12} color={theme.colors.textSecondary} />
    </Pressable>
  );

  return (
    <Screen>
      <AppHeader
        title="Return Stock"
        subtitle="Sent to production · change or delete a return until production reviews it"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={returns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        style={list.isPlaceholderData ? styles.dimmed : undefined}
        ListHeaderComponent={
          <View>
            <MonthlyReturnsSummaryCard
              summary={summary.data}
              isLoading={summary.isLoading}
              error={summary.error}
              onRetry={() => void summary.refetch()}
              statusLabels={SUMMARY_STATUS_LABEL}
            />

            <View style={styles.searchRow}>
              <View style={styles.flex1}>
                <SearchBar value={search} onChangeText={onSearch} placeholder="Search reason or product…" />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${sort.label}`}
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.sortButton, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md }]}>
                <Icon name="sort" size={14} color={theme.colors.text} />
                <Text style={[theme.typography.label, styles.bold, { color: theme.colors.text }]}>Sort</Text>
              </Pressable>
            </View>

            <View style={styles.pillGrid}>
              {pill('Product · ', productLabel, () => productSheetRef.current?.present(), 'Filter by product')}
              {pill('', returnWindowLabel(windowKey), () => windowSheetRef.current?.present(), 'Choose period')}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                {RETURN_STATUS_FILTERS.map((option) => {
                  const active = option.value === status;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => refilter(setStatus)(option.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                      ]}>
                      <Text style={[theme.typography.label, styles.bold, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[theme.typography.label, styles.sortNote, { color: theme.colors.textFaint }]}>Sorted: {sort.label}</Text>

            {list.isLoading ? (
              <View style={styles.skeletons}>
                <LoadingSkeleton height={86} />
                <LoadingSkeleton height={86} />
                <LoadingSkeleton height={86} />
              </View>
            ) : null}
            {list.error && !list.data ? <ErrorState message={mapErrorToMessage(list.error)} onRetry={() => void list.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !list.isLoading && !list.error ? (
            filtered ? (
              <EmptyState title="No Matching Returns" message="Nothing matches these filters." actionLabel="Clear Filters" onAction={clearFilters} />
            ) : (
              <EmptyState title="No Returns Here" message="Returns waiting on Production show up here until they are reviewed." />
            )
          ) : undefined
        }
        renderItem={({ item }) => <ReturnStockCard item={item} onView={() => openDetail(item)} />}
        ListFooterComponent={
          total > 0 ? (
            <View style={styles.footer}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{describeShowing(page, total)}</Text>
              {pages > 1 ? (
                <View style={styles.pager}>
                  {pagerSlots(page, pages).map((slot, i) =>
                    slot === '…' ? (
                      <Text key={`gap-${i}`} style={[theme.typography.label, styles.pageGap, { color: theme.colors.textFaint }]}>…</Text>
                    ) : (
                      <Pressable
                        key={slot}
                        accessibilityRole="button"
                        accessibilityLabel={`Page ${slot}`}
                        accessibilityState={{ selected: slot === page }}
                        onPress={() => setPage(slot)}
                        style={[
                          styles.pageButton,
                          slot === page
                            ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            : { borderColor: theme.colors.border },
                        ]}>
                        <Text style={[theme.typography.label, styles.bold, { color: slot === page ? theme.colors.primaryText : theme.colors.text }]}>{slot}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
              ) : null}
            </View>
          ) : undefined
        }
        refreshing={list.isRefetching || summary.isRefetching}
        onRefresh={onRefresh}
      />

      <ReturnOptionSheet
        ref={sortSheetRef}
        title="Sort By"
        options={RETURN_SORTS.map((s) => ({ value: s.key, label: s.label }))}
        value={sort.key}
        onChange={refilter(setSortKey)}
        onRequestClose={() => sortSheetRef.current?.dismiss()}
        snapPoints={['62%']}
      />
      <ReturnOptionSheet
        ref={windowSheetRef}
        title="Period"
        options={RETURN_WINDOWS.map((w) => ({ value: w.key, label: w.label }))}
        value={windowKey}
        onChange={(v) => refilter(setWindowKey)(v as ReturnWindowKey)}
        onRequestClose={() => windowSheetRef.current?.dismiss()}
        snapPoints={['42%']}
      />
      <ReturnOptionSheet
        ref={productSheetRef}
        title="Product"
        options={productOptions}
        value={productId ?? ALL_PRODUCTS}
        onChange={(v) => refilter(setProductId)(v === ALL_PRODUCTS ? null : v)}
        onRequestClose={() => productSheetRef.current?.dismiss()}
        searchable
        snapPoints={['80%']}
      />

      <FormBottomSheet
        ref={detailSheetRef}
        title={viewing?.productName ?? 'Return'}
        subtitle="Return details"
        onRequestClose={() => detailSheetRef.current?.dismiss()}
        onDismiss={() => setViewing(null)}
        snapPoints={['85%']}>
        {viewing ? <ReturnDetailSheet item={viewing} onChange={handleChange} onWithdraw={handleWithdraw} /> : null}
      </FormBottomSheet>

      <ReviseReturnModal
        visible={editing !== null}
        item={editing}
        isSubmitting={revise.isPending}
        error={revise.error ? mapErrorToMessage(revise.error) : null}
        onSubmit={handleReviseSubmit}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}
