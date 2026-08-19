import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBSearchBar,
  MBSyncStatus,
  MBSkeletonList,
} from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCategories, useProducts, useSettings } from '@/hooks/useCatalog';
import type { Product } from '@/shared/types/product.types';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/money';

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

export function ProductsScreen(): React.ReactElement {
  const theme = useTheme();
  const isOnline = useNetworkStore(s => s.isOnline);

  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const search = useDebouncedValue(searchInput.trim(), 300);

  const categories = useCategories();
  const settings = useSettings();
  const products = useProducts({
    search: search || undefined,
    categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
    isActive: true,
  });

  const currencySymbol = settings.data?.currencySymbol;
  const isSearching = searchInput.trim() !== search;

  const onRefresh = useCallback(() => {
    products.refetch();
    categories.refetch();
  }, [products, categories]);

  const filterChips = useMemo(
    () => [
      { id: ALL_CATEGORIES, name: 'All' },
      ...(categories.data ?? []).map(c => ({ id: c.id, name: c.name })),
    ],
    [categories.data],
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow product={item} currencySymbol={currencySymbol} />
    ),
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Products"
        subtitle={products.data ? `${products.data.length} items` : undefined}
        right={<MBSyncStatus />}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name or code"
          searching={isSearching}
          testID="product-search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm }}>
          {filterChips.map(chip => {
            const selected = chip.id === categoryId;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setCategoryId(chip.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.space.lg,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    { color: selected ? theme.colors.onPrimary : theme.colors.text },
                  ]}>
                  {chip.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
    return <MBErrorState error={products.error} onRetry={onRefresh} retrying={products.isFetching} />;
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

function ProductRow({
  product,
  currencySymbol,
}: {
  product: Product;
  currencySymbol?: string;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <MBCard accessibilityLabel={`${product.name}, ${formatCurrency(product.price, currencySymbol)}`}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {product.sku} · {product.categoryName}
          </Text>
        </View>

        <Text style={[theme.type.money, { color: theme.colors.text }]}>
          {/* price is numeric(14,2) and can arrive as a string; formatCurrency
              coerces rather than rendering NaN. */}
          {formatCurrency(product.price, currencySymbol)}
        </Text>
      </View>
    </MBCard>
  );
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 8 },
  chip: { height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowMain: { flex: 1, gap: 2 },
});
