import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCatalogProducts, useProductPriceHistory } from '@/api';
import { Routes, type PriceHistoryStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency } from '@/shared/utils';
import { ProductPriceTimeline } from '../../components/ProductPriceTimeline';
import { priceHints } from '../../utils/priceHistoryHints';

/**
 * One product's price over time: the price in force now (the product's own
 * `price`), then every recorded change, newest first. Read-only.
 *
 * No Audit Trail link: a price change writes only its history row — nothing
 * reaches the audit log — so there is no entry to link to.
 */
export function ProductPriceHistoryScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<PriceHistoryStackParamList, typeof Routes.PRICE_HISTORY_PRODUCT>>();
  const { productId, productName } = route.params;

  const historyQ = useProductPriceHistory(productId);
  const catalogQ = useCatalogProducts();
  const product = useMemo(() => catalogQ.data?.products.find((p) => p.id === productId), [catalogQ.data, productId]);
  const changes = useMemo(() => historyQ.data?.history ?? [], [historyQ.data]);
  const code = product?.sku || changes[0]?.productCode || null;

  return (
    <Screen>
      <AppHeader title={product?.name ?? productName} subtitle={code ?? 'No code'} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={historyQ.isRefetching}
            onRefresh={() => {
              void historyQ.refetch();
              void catalogQ.refetch();
            }}
          />
        }>
        {product ? (
          <Card style={{ marginBottom: theme.spacing.md }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {product.categoryName ?? (product.isSpecial ? 'Special Order item' : 'No category')} · {product.isActive ? 'Active' : 'Inactive'}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4 }]}>
              Cost {product.costPrice === null ? <Text style={{ color: theme.colors.textSecondary }}>Not set</Text> : formatCurrency(product.costPrice)}
            </Text>
          </Card>
        ) : null}

        {historyQ.isLoading ? <LoadingSkeleton height={160} /> : null}
        {historyQ.error ? <ErrorState message={mapErrorToMessage(historyQ.error)} onRetry={() => void historyQ.refetch()} /> : null}
        {!historyQ.isLoading && !historyQ.error && changes.length === 0 ? (
          <EmptyState title="No Price Changes" message="This product's price has never been changed since it was added." />
        ) : null}
        {changes.length > 0 ? (
          <ProductPriceTimeline
            changes={changes}
            currentPrice={product ? product.price : null}
            hintsFor={(c) => priceHints(c, changes, product?.costPrice)}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
