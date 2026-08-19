import React, { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBHeader,
  MBPressable,
  MBSkeletonList,
} from '@/components';
import { useCategories, useProducts } from '@/hooks/useCatalog';
import { useDeactivateCategory } from '@/hooks/useCategoryAdmin';
import type { Category } from '@/shared/types/product.types';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumn, space } from '@/theme/spacing';
import { dataAsOfFrom } from '@/utils/dataAsOf';

/**
 * Product categories.
 *
 * Short by nature — a bakery has a handful — so this is a plain `ScrollView`
 * rather than a virtualised list. Every unbounded list in the app is a
 * `FlashList`; this one is bounded by what a person is willing to maintain.
 *
 * ---------------------------------------------------------------------------
 * Order comes from the server, and is not editable here
 * ---------------------------------------------------------------------------
 * `GET /api/products/categories` sorts by `sort_order` in Postgres, and the app
 * mirrors the response order verbatim. `sortOrder` is a real field on the
 * create/update schemas, so it is set on the form — but there is no drag handle,
 * because reordering by dragging would need a bulk write the API does not offer
 * and would fire one PUT per row.
 *
 * ---------------------------------------------------------------------------
 * Removing deactivates
 * ---------------------------------------------------------------------------
 * `DELETE /api/products/categories/:id` sets `is_active = false`. Products carry
 * a `category_id`; a hard delete would orphan them or cascade into the
 * catalogue. The count shown per row is the reason made visible — an admin can
 * see what a category still holds before taking it out of the pickers.
 */

export function CategoriesScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();

  const categories = useCategories();
  // Products are already cached by the catalogue screens; this reuses that
  // entry to count members rather than adding a per-category request.
  const products = useProducts({});
  const deactivate = useDeactivateCategory();

  const countFor = useCallback(
    (categoryId: string) => (products.data ?? []).filter(p => p.categoryId === categoryId).length,
    [products.data],
  );

  const onRemove = useCallback(
    (category: Category) => {
      const count = countFor(category.id);
      Alert.alert(
        `Remove ${category.name}?`,
        count > 0
          ? `${count} ${count === 1 ? 'product is' : 'products are'} in this category. They keep their history and stay sellable — the category just stops appearing in pickers.`
          : 'It stops appearing in pickers. Nothing is deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () =>
              deactivate.mutate(category.id, {
                onError: () =>
                  Alert.alert('Not removed', 'The category was not changed. Try again.'),
              }),
          },
        ],
      );
    },
    [countFor, deactivate],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Categories"
        dataAsOf={dataAsOfFrom(categories.dataUpdatedAt)}
        subtitle={categories.data ? `${categories.data.length} categories` : undefined}
      />

      {categories.isPending ? (
        <MBSkeletonList rows={6} />
      ) : categories.isError ? (
        <MBErrorState
          error={categories.error}
          onRetry={categories.refetch}
          retrying={categories.isFetching}
        />
      ) : (categories.data ?? []).length === 0 ? (
        <MBEmptyState
          title="No categories yet"
          message="Add one so products have somewhere to sit."
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.sm, paddingBottom: space.xxl },
          ]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={categories.refetch} />
          }>
          {(categories.data ?? []).map(category => (
            <CategoryRow
              key={category.id}
              category={category}
              productCount={countFor(category.id)}
              countKnown={!products.isPending && !products.isError}
              onEdit={() =>
                navigation.navigate('CategoryForm', { categoryId: category.id })
              }
              onRemove={() => onRemove(category)}
            />
          ))}
        </ScrollView>
      )}

      <MBFab
        label="New category"
        onPress={() => navigation.navigate('CategoryForm', {})}
        testID="new-category"
      />
    </View>
  );
}

function CategoryRow({
  category,
  productCount,
  countKnown,
  onEdit,
  onRemove,
}: {
  category: Category;
  productCount: number;
  countKnown: boolean;
  onEdit: () => void;
  onRemove: () => void;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <MBCard>
      <MBPressable onPress={onEdit} accessibilityRole="button">
        <View style={styles.rowHeader}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]} numberOfLines={1}>
            {category.name}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {/* Silent rather than "0 products" while the catalogue is still
                loading — a confident zero would read as an empty category. */}
            {countKnown
              ? `${productCount} ${productCount === 1 ? 'product' : 'products'}`
              : ''}
          </Text>
        </View>
      </MBPressable>

      <View style={styles.actions}>
        <MBPressable
          onPress={onRemove}
          accessibilityRole="button"
          testID={`remove-${category.id}`}>
          <Text style={[theme.type.label, { color: theme.colors.danger }]}>Remove</Text>
        </MBPressable>
      </View>
    </MBCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.sm },
});
