import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  MBAccountButton,
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBFilterChips,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
  MBProductCard,
} from '@/common/ui';
import { useAccessProfile } from '@/common/hooks/useAccessProfile';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { useCategories, useProducts, useSettings } from '@/api/hooks/useCatalogApi';
import type { Product } from '@/shared/types/product.types';
import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { contentColumn, space } from '@/common/theme/spacing';

/**
 * Product catalogue — the read-only vertical slice.
 *
 * Search runs on the SERVER (`?search=`), not over a downloaded list: the API
 * pushes it into Postgres precisely so the whole table is never pulled into
 * memory, and no endpoint in this API paginates.
 *
 * "Special" products are excluded. They are auto-created to carry a branch's
 * one-off order item and are real and active so stock works, but a one-off
 * birthday cake must not show up in a catalogue.
 */

const ALL_CATEGORIES = 'all';

/**
 * Status is a three-way filter, not a checkbox.
 *
 * An admin managing the catalogue needs "everything" as often as either half:
 * finding the product someone deactivated last month is the whole reason to
 * look. The list defaults to Active, which is what the catalogue *is*.
 */
const STATUS_FILTERS = [
  { key: 'active', label: 'Active', isActive: true as boolean | undefined },
  { key: 'inactive', label: 'Inactive', isActive: false as boolean | undefined },
  { key: 'all', label: 'All', isActive: undefined as boolean | undefined },
] as const;

type StatusKey = (typeof STATUS_FILTERS)[number]['key'];

/** The same three, in the shape `MBFilterChips` reads. */
const STATUS_FILTER_OPTIONS = STATUS_FILTERS.map(f => ({ key: f.key, label: f.label }));

export function ProductsScreen(): React.ReactElement {
  const theme = useTheme();
  const isOnline = useNetworkStore(s => s.isOnline);

  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
  const profile = useAccessProfile();
  // Mirrors `requireRole('super_admin')` on every product write endpoint. The
  // server is the boundary; this only decides what is offered.
  const canManage = profile?.capabilities.has('admin') ?? false;

  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [status, setStatus] = useState<StatusKey>('active');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const categories = useCategories();
  const settings = useSettings();
  const statusFilter = STATUS_FILTERS.find(f => f.key === status) ?? STATUS_FILTERS[0];
  const products = useProducts({
    search: search || undefined,
    categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
    // `undefined` asks the server for both halves; it filters only when told to.
    isActive: statusFilter.isActive,
  });

  const currencySymbol = settings.data?.currencySymbol;
  const isSearching = searchInput.trim() !== search;

  const onRefresh = useCallback(() => {
    products.refetch();
    categories.refetch();
  }, [products, categories]);

  const filterChips = useMemo(
    () => [
      { key: ALL_CATEGORIES, label: 'All' },
      ...(categories.data ?? []).map(c => ({ key: c.id, label: c.name })),
    ],
    [categories.data],
  );

  /**
   * One handler for the whole list rather than a closure per row.
   *
   * A `() => navigate(...)` built inside `renderItem` is a new function for
   * every row on every render, which makes `ProductRow`'s memoisation useless:
   * the screen re-renders on each keystroke of the debounced search, and every
   * visible row would re-render with it.
   */
  const onSelect = useCallback(
    (product: Product) => navigation.navigate('ProductDetail', { productId: product.id }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <MBProductCard
        product={item}
        currencySymbol={currencySymbol}
        onSelect={canManage ? onSelect : undefined}
      />
    ),
    [canManage, currencySymbol, onSelect],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Products"
        dataAsOf={dataAsOfFrom(products.dataUpdatedAt)}
        subtitle={products.data ? `${products.data.length} items` : undefined}
        search={{
          value: searchInput,
          onChangeText: setSearchInput,
          placeholder: 'Search by name or code',
          searching: isSearching,
          testID: 'product-search',
        }}
        right={<MBSyncStatus />}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        {/* Both rows are `MBFilterChips` rather than two hand-rolled copies of
            it. They had drifted into a third chip idiom — `radius.pill`, which
            v4 reserves for *status*, a thing that is read rather than chosen —
            and the status row filled itself with `accent` while labelling
            itself with `onPrimary`, two tokens that are now the same ink. */}
        <MBFilterChips
          scroll
          options={filterChips}
          selectedKey={categoryId}
          onSelect={setCategoryId}
          testIDPrefix="category"
        />

        {/* Status sits below the categories rather than beside them: two
            horizontal scrollers on one line is a row nobody can tell apart. It
            takes the `accent` tone so the two rows do not both read as the
            screen's primary choice. */}
        {canManage ? (
          <MBFilterChips
            tone="accent"
            options={STATUS_FILTER_OPTIONS}
            selectedKey={status}
            onSelect={key => setStatus(key as StatusKey)}
            testIDPrefix="status"
          />
        ) : null}
      </View>

      <ProductList
        products={products}
        search={search}
        isOnline={isOnline}
        onRefresh={onRefresh}
        renderItem={renderItem}
        onClearSearch={() => {
          setSearchInput('');
          setCategoryId(ALL_CATEGORIES);
        }}
      />

      {/* The screen's one dominant create action. The list is never empty in the
          way Expenses can be — a catalogue with no products is a first-run state
          — so the FAB is unconditional here. */}
      {canManage ? (
        <MBFab
          label="New product"
          onPress={() => navigation.navigate('ProductForm')}
          testID="new-product"
        />
      ) : null}
    </View>
  );
}

/** The six screen states, kept together so none can be forgotten. */
function ProductList({
  products,
  search,
  isOnline,
  onRefresh,
  renderItem,
  onClearSearch,
}: {
  products: ReturnType<typeof useProducts>;
  search: string;
  isOnline: boolean;
  onRefresh: () => void;
  renderItem: ({ item }: { item: Product }) => React.ReactElement;
  onClearSearch: () => void;
}): React.ReactElement {
  const theme = useTheme();

  // Skeleton only on the FIRST load. A refetch keeps the current list visible.
  if (products.isPending) return <MBSkeletonList rows={8} />;

  if (products.isError) {
    return (
      <MBErrorState error={products.error} onRetry={onRefresh} retrying={products.isFetching} />
    );
  }

  const rows = products.data ?? [];

  if (rows.length === 0) {
    return search ? (
      <MBEmptyState
        title="No products match"
        message={`Nothing found for "${search}".`}
        actionLabel="Clear search"
        onAction={onClearSearch}
      />
    ) : (
      <MBEmptyState
        title="No products found"
        message={
          isOnline
            ? 'No active products in this category yet.'
            : "You're offline, so this may be incomplete."
        }
        icon="products"
      />
    );
  }

  return (
    <FlashList
      data={rows}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={ListSeparator}
      refreshControl={
        <RefreshControl
          refreshing={products.isFetching && !products.isPending}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    />
  );
}

/** Memoised: with a stable `onSelect`, typing in the search box re-renders no rows. */

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet. A list row is a label at
  // one edge and a value at the other; unconstrained on a 10" screen the two
  // end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowMain: { flex: 1, gap: space.hair },
});
