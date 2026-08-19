import React, { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBDataRow,
  MBErrorState,
  MBHeader,
  MBMoney,
  MBSkeletonList,
} from '@/components';
import { useAccessProfile } from '@/hooks/useAccessProfile';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { usePriceHistory, useProduct, useSetProductActive } from '@/hooks/useProductAdmin';
import type { ProductsStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { dataAsOfFrom } from '@/utils/dataAsOf';

/**
 * One product: what it is, what it costs now, and the two administrative acts
 * that can change it.
 *
 * ---------------------------------------------------------------------------
 * Why "Current price" is a link to history rather than an editable field
 * ---------------------------------------------------------------------------
 * A price is not a property of a product the way its name is. It is the latest
 * entry in a series, each with an effective date and a reason, and the entries
 * behind it are what historical sales were charged at. Editing it in place would
 * suggest the old number is simply gone; it is not, and the sales that used it
 * still hold it.
 *
 * So this screen has **no price field**. `Change price` opens the versioned
 * endpoint's form, and `Price history` shows the trail. `useUpdateProduct`
 * cannot carry a price even if someone tried — see `productsApi.ts`.
 */

type DetailRoute = RouteProp<ProductsStackParamList, 'ProductDetail'>;

export function ProductDetailScreen(): React.ReactElement {
  const theme = useTheme();
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
  const { productId } = route.params;

  const profile = useAccessProfile();
  const canManage = profile?.capabilities.has('admin') ?? false;

  const { currencySymbol } = useCatalogSettings();
  const product = useProduct(productId);
  // Only the count is wanted here; the trail itself lives on its own screen.
  const history = usePriceHistory(productId);
  const setActive = useSetProductActive(productId);

  const data = product.data;

  /**
   * Deactivating is reversible and does not touch a single historical row, so it
   * confirms rather than warns — but it does confirm, because it removes the
   * product from every till in every branch at once.
   */
  const onToggleActive = useCallback(() => {
    if (!data) return;
    const next = !data.isActive;
    Alert.alert(
      next ? `Activate ${data.name}?` : `Deactivate ${data.name}?`,
      next
        ? 'It will appear in the catalogue, the order form and the till again.'
        : 'It disappears from the catalogue, the order form and the till. Sales already recorded keep their prices and stay in reports.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Activate' : 'Deactivate',
          style: next ? 'default' : 'destructive',
          onPress: () => {
            setActive.mutate(next, {
              onSuccess: () => product.refetch(),
              onError: () =>
                Alert.alert('Could not save', 'The change was not applied. Try again.'),
            });
          },
        },
      ],
    );
  }, [data, product, setActive]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={data?.name ?? 'Product'}
        subtitle={data?.sku}
        onBack={() => navigation.navigate('ProductsList')}
        dataAsOf={dataAsOfFrom(product.dataUpdatedAt)}
      />

      {product.isPending ? (
        <MBSkeletonList rows={6} />
      ) : product.isError ? (
        <MBErrorState
          error={product.error}
          onRetry={() => product.refetch()}
          retrying={product.isFetching}
        />
      ) : !data ? (
        <MBErrorState error={new Error('Product not found')} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}
          refreshControl={
            <RefreshControl
              refreshing={product.isFetching && !product.isPending}
              onRefresh={() => {
                product.refetch();
                history.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }>
          <MBCard>
            <View style={styles.priceBlock}>
              <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
                Current price
              </Text>
              {/* The server's number, not a computed one. */}
              <MBMoney value={data.price} size="lg" symbol={currencySymbol} />
            </View>
          </MBCard>

          <MBCard>
            <MBDataRow label="Product code" value={data.sku} />
            <MBDataRow label="Name" value={data.name} />
            <MBDataRow label="Category" value={data.categoryName} />
            <MBDataRow
              label="Cost price"
              value={<MBMoney value={data.costPrice} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow label="Status" value={data.isActive ? 'Active' : 'Inactive'} />
            {/* The unique product ID. Long and useless to read aloud, but it is
                what a support conversation or a database query needs. */}
            <MBDataRow label="Unique ID" value={data.id} />
          </MBCard>

          {data.description ? (
            <MBCard>
              <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Description</Text>
              <Text style={[theme.type.body, { color: theme.colors.text }]}>
                {data.description}
              </Text>
            </MBCard>
          ) : null}

          {canManage ? (
            <View style={{ gap: theme.space.sm }}>
              <MBButton
                label="Change price"
                onPress={() => navigation.navigate('PriceChange', { productId })}
                testID="change-price"
                fullWidth
              />
              <MBButton
                label={
                  history.data && history.data.length > 0
                    ? `Price history (${history.data.length})`
                    : 'Price history'
                }
                variant="secondary"
                onPress={() => navigation.navigate('PriceHistory', { productId })}
                fullWidth
              />
              <MBButton
                label="Edit details"
                variant="secondary"
                onPress={() => navigation.navigate('ProductForm', { productId })}
                fullWidth
              />
              <MBButton
                label={data.isActive ? 'Deactivate' : 'Activate'}
                variant="ghost"
                onPress={onToggleActive}
                loading={setActive.isPending}
                testID="toggle-active"
                fullWidth
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  priceBlock: { gap: 4 },
});
