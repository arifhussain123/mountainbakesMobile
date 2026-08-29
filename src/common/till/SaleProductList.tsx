import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { MBEmptyState, MBErrorState, MBSectionHeader, MBSkeletonList } from '@/common/ui';
import type { CartLine } from '@/common/helpers/saleTotals';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { Product } from '@/shared/types/product.types';

import { SaleCartLine } from './SaleCartLine';
import { SaleProductRow } from './SaleProductRow';

export interface SaleProductListProps {
  products: readonly Product[];
  /** Balances keyed by product id. Absent keys are genuinely unknown, not zero. */
  availability: Map<string, number>;
  /** Units per product already in the cart, keyed by product id. */
  inCart: Map<string, number>;
  lines: readonly CartLine[];
  currencySymbol?: string;
  /** What the balance is called — 'stock' at a branch, 'pool' at the counter. */
  availabilityNoun?: string;

  onAdd: (product: Product) => void;
  onQty: (productId: string, qty: number) => void;
  onDiscountPct: (productId: string, pct: number) => void;
  onRemove: (productId: string) => void;

  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * The items stage: what has been rung up, over what can be.
 *
 * ---------------------------------------------------------------------------
 * The cart is the list's header, not a second screen
 * ---------------------------------------------------------------------------
 * One tap is one unit, so a cashier's eyes stay on the price list — and the
 * lines they have just created belong immediately above it, in the same scroll,
 * rather than behind a button. Quantities and discounts are corrected here,
 * which is why the payment stage's recap is read-only: a number is fixed where
 * it was entered, and a stage that let it be changed in two places would be two
 * places to look when the total is wrong.
 *
 * ---------------------------------------------------------------------------
 * Loading, empty and error are the LIST's states, not the screen's
 * ---------------------------------------------------------------------------
 * All three go through `ListEmptyComponent`, so a search with no matches leaves
 * the cart on screen. Swapping the whole body would hide a half-built sale
 * behind "No products match", and the cashier's way out of it — the search box —
 * is above this component anyway.
 *
 * **Empty is not absent.** A search with no matches and a catalogue that could
 * not be reached are different components with different words; the second one
 * offers a retry.
 */
export function SaleProductList({
  products,
  availability,
  inCart,
  lines,
  currencySymbol,
  availabilityNoun,
  onAdd,
  onQty,
  onDiscountPct,
  onRemove,
  isPending,
  isError,
  error,
  isRefreshing,
  onRefresh,
}: SaleProductListProps): React.ReactElement {
  const theme = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <SaleProductRow
        product={item}
        {...(currencySymbol ? { currencySymbol } : {})}
        /**
         * `undefined` means "not known", which is NOT the same as zero and must
         * never be drawn as "out of stock" — that would stop a cashier selling
         * something they are holding, on a device whose stock has simply never
         * been mirrored.
         */
        {...(availability.has(item.id) ? { available: availability.get(item.id) } : {})}
        inCart={inCart.get(item.id) ?? 0}
        {...(availabilityNoun ? { availabilityNoun } : {})}
        onAdd={onAdd}
      />
    ),
    [availability, availabilityNoun, currencySymbol, inCart, onAdd],
  );

  return (
    <FlashList
      data={products as Product[]}
      renderItem={renderItem}
      keyExtractor={keyOf}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        lines.length > 0 ? (
          <View style={styles.cart}>
            <MBSectionHeader
              title="In this sale"
              subtitle={`${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`}
            />
            {lines.map(line => (
              <SaleCartLine
                key={line.productId}
                line={line}
                {...(currencySymbol ? { currencySymbol } : {})}
                onQty={onQty}
                onDiscountPct={onDiscountPct}
                onRemove={onRemove}
              />
            ))}
            <MBSectionHeader title="Price list" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        isPending ? (
          <MBSkeletonList rows={6} />
        ) : isError ? (
          <MBErrorState error={error} onRetry={onRefresh} />
        ) : (
          <MBEmptyState title="No products match" message="Try a different name or code." />
        )
      }
      ItemSeparatorComponent={ListSeparator}
      keyboardShouldPersistTaps="handled"
      /* The catalogue is cached and can be hours old on a phone that has been
         offline through a shift — a price or a new product changed on another
         device is invisible until something asks. The cart is untouched by a
         refetch, so pulling costs nothing mid-sale. */
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    />
  );
}

function keyOf(item: Product): string {
  return item.id;
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  // ...contentColumn caps the measure on a tablet. A row is a name at one edge
  // and a figure at the other; unconstrained on a 10" screen the two end up a
  // hand-span apart with nothing between them.
  content: { ...contentColumn, paddingHorizontal: space.xl, paddingBottom: space.xxl },
  cart: { gap: space.sm, paddingTop: space.md },
  separator: { height: space.sm },
});
