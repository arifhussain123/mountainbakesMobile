import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBMoney,
  MBSkeletonList,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { usePriceHistory, useProduct } from '@/hooks/useProductAdmin';
import type { ProductsStackParamList } from '@/navigation/types';
import type { PriceHistoryDoc } from '@/shared/types/price.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';

/**
 * The price trail for one product, newest first.
 *
 * This is an **append-only audit trail**, not an editable list: each row is one
 * `product_price_history` document written by the `apply_price_change` function,
 * carrying its own version number, effective date, reason and author. Nothing on
 * this screen can change one, and nothing anywhere can — which is what makes it
 * worth reading when someone asks why a receipt from March says a different
 * number to the shelf today.
 *
 * Status is per row and means what the server means by it:
 *   `active`      — the price in force now
 *   `scheduled`   — dated ahead, not yet applied
 *   `superseded`  — was in force, replaced by a later version
 *
 * A superseded row is not a correction. The sales taken while it was active are
 * still recorded at that price.
 */

type HistoryRoute = RouteProp<ProductsStackParamList, 'PriceHistory'>;

export function PriceHistoryScreen(): React.ReactElement {
  const theme = useTheme();
  const route = useRoute<HistoryRoute>();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { productId } = route.params;

  const { currencySymbol } = useCatalogSettings();
  const product = useProduct(productId);
  const history = usePriceHistory(productId);

  const renderItem = useCallback(
    ({ item }: { item: PriceHistoryDoc }) => (
      <PriceHistoryRow entry={item} currencySymbol={currencySymbol} />
    ),
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Price history"
        subtitle={product.data?.name}
        onBack={() => navigation.goBack()}
      />

      {history.isPending ? (
        <MBSkeletonList rows={6} />
      ) : history.isError ? (
        <MBErrorState
          error={history.error}
          onRetry={() => history.refetch()}
          retrying={history.isFetching}
        />
      ) : (history.data ?? []).length === 0 ? (
        <MBEmptyState
          title="No price changes yet"
          message="This product still has the price it was created with."
        />
      ) : (
        <FlashList
          data={history.data ?? []}
          keyExtractor={entry => entry.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={history.isFetching && !history.isPending}
              onRefresh={() => history.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

/**
 * Memoised. This list re-renders whenever the screen does — a filter chip, a
 * refetch, a keystroke — and with props that do not change, none of the visible
 * rows re-render with it. Theme changes still reach it: context bypasses `memo`.
 */
const PriceHistoryRow = React.memo(function PriceHistoryRowView({
  entry,
  currencySymbol,
}: {
  entry: PriceHistoryDoc;
  currencySymbol?: string;
}): React.ReactElement {
  const theme = useTheme();

  // `toNumber` before comparing, not decoration: `numeric(14,2)` reaches the
  // client as a STRING, and `'90.00' > '1250.00'` is a lexicographic comparison
  // that answers true. A cut from Rs. 1,250 to Rs. 90 would render green, on the
  // one screen whose entire job is showing which way a price moved. The fields
  // are typed `number`, so nothing but this call catches it.
  const rose = toNumber(entry.newPrice) > toNumber(entry.oldPrice);
  const tone =
    entry.status === 'scheduled'
      ? theme.colors.warning
      : rose
        ? theme.colors.success
        : theme.colors.danger;

  return (
    <MBCard
      accessibilityLabel={`Version ${entry.versionNumber}, ${formatCurrency(
        entry.oldPrice,
        currencySymbol,
      )} to ${formatCurrency(entry.newPrice, currencySymbol)}, effective ${
        entry.effectiveDate
      }, ${entry.status}`}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {entry.priceNumber} · v{entry.versionNumber}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Effective {entry.effectiveDate} · {entry.source}
          </Text>
        </View>
        <View style={styles.amounts}>
          <MBMoney value={entry.newPrice} size="sm" color={tone} symbol={currencySymbol} />
          {/* The old price stays visible: the change is the story, not the number. */}
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            was {formatCurrency(entry.oldPrice, currencySymbol)}
          </Text>
        </View>
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {entry.status} · by {entry.changedByName}
      </Text>

      {entry.reason ? (
        <Text style={[theme.type.body, { color: theme.colors.text }]}>{entry.reason}</Text>
      ) : null}
    </MBCard>
  );
});

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 16 },
  separator: { height: 8 },
  row: { flexDirection: 'row', gap: 12 },
  main: { flex: 1, gap: 2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
});
