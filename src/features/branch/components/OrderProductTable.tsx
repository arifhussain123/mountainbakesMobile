import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { MBEmptyState, MBErrorState, MBSkeletonList } from '@/common/ui';
import { radius } from '@/common/theme/radius';
import { contentColumn, layout, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { Product } from '@/shared/types/product.types';

import { OrderProductRow } from './OrderProductRow';
import type { OrderLine } from '../hooks/useProductionOrderForm';

export interface OrderProductTableProps {
  products: readonly Product[];
  /** The picked lines, keyed by product id — a row reads only its own. */
  lines: Record<string, OrderLine>;
  /** Branch balances keyed by product id. Empty while stock has not been read. */
  stock: Record<string, number>;
  /** True once stock has actually been answered, so 0 can be told from unknown. */
  hasStock: boolean;
  onChange: (product: Product, qty: number) => void;
  currencySymbol?: string;
  disabled?: boolean;

  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefreshing: boolean;
  onRefresh: () => void;

  /** Scrolls above the table: the order's meta grid and the window notice. */
  header: React.ReactNode;
}

/**
 * The product table — one card, ruled between rows, and the only scrolling
 * surface on the screen.
 *
 * ---------------------------------------------------------------------------
 * A card drawn in three pieces, because the middle is virtualised
 * ---------------------------------------------------------------------------
 * `MBListCard` puts rows inside one `MBCard`, which needs every row mounted.
 * The catalogue is hundreds of products, so the rows go through a `FlashList`
 * and the card has to be assembled around it: the list header closes off the top
 * (border, top radii, the column heading), each row carries the left and right
 * edges and its own rule, and the list footer caps the bottom.
 *
 * The one thing given up is `MBCard`'s 7% lift — a shadow cannot be split across
 * three views without showing the seams. The hairline is what separates a card
 * from the field anyway; the lift only stops white-on-lilac looking pasted on,
 * and on a surface this tall there is no "pasted on" to fix.
 *
 * ---------------------------------------------------------------------------
 * Loading, empty and error are the LIST's states, not the screen's
 * ---------------------------------------------------------------------------
 * All three go through `ListEmptyComponent` rather than replacing the list, so
 * `header` stays on screen in every one of them — otherwise a search with no
 * matches would take away the order's own context along with the rows.
 *
 * **Empty is not absent.** A search with no matches and a catalogue that could
 * not be reached are different components with different words; the second one
 * offers a retry.
 */
export function OrderProductTable({
  products,
  lines,
  stock,
  hasStock,
  onChange,
  currencySymbol,
  disabled = false,
  isPending,
  isError,
  error,
  isRefreshing,
  onRefresh,
  header,
}: OrderProductTableProps): React.ReactElement {
  const theme = useTheme();
  const last = products.length - 1;

  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <OrderProductRow
        product={item}
        qty={lines[item.id]?.qty ?? 0}
        stock={hasStock ? stock[item.id] ?? 0 : null}
        onChange={onChange}
        {...(currencySymbol ? { currencySymbol } : {})}
        isLast={index === last}
        disabled={disabled}
      />
    ),
    [currencySymbol, disabled, hasStock, last, lines, onChange, stock],
  );

  const hasRows = products.length > 0;

  return (
    <FlashList
      data={products as Product[]}
      renderItem={renderItem}
      keyExtractor={keyOf}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {hasRows ? <TableHead /> : null}
        </View>
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
      ListFooterComponent={
        hasRows ? (
          <View
            style={[
              styles.cap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderBottomLeftRadius: radius.lg,
                borderBottomRightRadius: radius.lg,
              },
            ]}
          />
        ) : null
      }
      keyboardShouldPersistTaps="handled"
      /* The catalogue is cached and can be hours old on a phone that has been
         offline through a shift — a price or a new product changed on another
         device is invisible until something asks. The basket is untouched by a
         refetch, so pulling costs nothing mid-order. */
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

/**
 * The card's top edge and its column heading.
 *
 * "Rate · Qty" rather than two headings, because the rate sits on the caption
 * line and the stepper is the column — one label over two things that are read
 * together beats two labels over columns that are not both there.
 */
function TableHead(): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.head,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
        },
      ]}>
      <View style={[styles.headRow, { borderBottomColor: theme.colors.border }]}>
        <Text style={[theme.type.label, styles.headLabel, { color: theme.colors.textMuted }]}>
          Product
        </Text>
        <Text style={[theme.type.label, styles.headLabel, { color: theme.colors.textMuted }]}>
          Rate · Qty
        </Text>
      </View>
    </View>
  );
}

function keyOf(item: Product): string {
  return item.id;
}

const styles = StyleSheet.create({
  // ...contentColumn caps the measure on a tablet. A table row is a name at one
  // edge and a control at the other; unconstrained on a 10" screen the two end
  // up a hand-span apart with nothing between them.
  content: { ...contentColumn, paddingHorizontal: space.xl, paddingBottom: space.xxl },
  header: { gap: space.md, paddingTop: space.md },
  head: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: layout.cardPad },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.snug,
    borderBottomWidth: 1,
  },
  headLabel: { textTransform: 'uppercase' },
  cap: { height: space.xs, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1 },
});
