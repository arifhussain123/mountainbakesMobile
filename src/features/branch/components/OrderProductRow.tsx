import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBQtyStepper } from '@/common/ui';
import { formatCurrency } from '@/common/utils/money';
import { layout, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { Product } from '@/shared/types/product.types';


export interface OrderProductRowProps {
  product: Product;
  qty: number;
  /**
   * Branch stock on hand, or null when the balances have not been read.
   *
   * Null and zero are different answers and are drawn differently: "we have none
   * of these" is the reason to order a tray, and "we could not ask" is not.
   */
  stock: number | null;
  /** The whole product, so the caller records its name and rate at selection. */
  onChange: (product: Product, qty: number) => void;
  currencySymbol?: string;
  /** The last row is not ruled — see `OrderProductTable`. */
  isLast?: boolean;
  disabled?: boolean;
}

/**
 * One product, as a ruled row inside the table card.
 *
 * ---------------------------------------------------------------------------
 * It is a row, not a card
 * ---------------------------------------------------------------------------
 * v6 draws the whole catalogue as a single card with hairlines between the
 * rows, which is the shape `MBListCard` exists for and the one this app uses
 * more than any other. A card per product rules the rows with the card's own
 * edge weight instead, and the grouping disappears: the screen becomes a stack
 * of boxes. So the row carries the card's left and right edges and its own
 * bottom rule, and `OrderProductTable` supplies the two ends.
 *
 * ---------------------------------------------------------------------------
 * Four columns folded into two
 * ---------------------------------------------------------------------------
 * v6 lays out product / rate / stock / qty as four columns on a 390pt canvas
 * with a 114pt stepper. This app's stepper is `layout.stepperSize` (44) per
 * button, which is 18pt wider, and at 360dp the product name is left with under
 * 90pt — a column too narrow to read "German Fudge Cake Bento" in. So the rate
 * joins the category and the stock on the caption line, exactly where v6
 * already puts the stock:
 *
 *   German Fudge Cake Bento                [ −  0  + ]
 *   Cakes · stock 1 · Rs. 500
 *
 * Nothing is lost — all four values are on the row — and the name gets the width
 * a name needs. The stepper stays the fixed column, because it is the one thing
 * that must line up down the list.
 *
 * There is deliberately **no per-line amount**: v6 does not draw one either, and
 * the footer's total is the figure the branch is actually judging.
 *
 * Memoised, with a stable `onChange`: the list re-renders on every keystroke in
 * the search box and every stepper tap, and without this the whole visible
 * catalogue re-renders because one quantity moved. Theme changes still reach it
 * — context bypasses `memo`.
 */
export const OrderProductRow = React.memo(function OrderProductRowView({
  product,
  qty,
  stock,
  onChange,
  currencySymbol,
  isLast = false,
  disabled = false,
}: OrderProductRowProps): React.ReactElement {
  const theme = useTheme();
  const rate = Number(product.price) || 0;

  const setQty = useCallback((next: number) => onChange(product, next), [onChange, product]);

  return (
    <View
      style={[
        styles.side,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}>
      <View
        style={[
          styles.row,
          isLast
            ? null
            : {
                borderBottomWidth: StyleSheet.hairlineWidth * 2,
                borderBottomColor: theme.colors.divider,
              },
        ]}>
        <View style={styles.main}>
          <Text
            numberOfLines={1}
            style={[theme.type.cardTitle, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          {/* Category, stock and rate as one run rather than three cells — at
              caption size three columns are narrower than the words in them.
              `·` is the separator v6 uses for the same line. */}
          <Text
            numberOfLines={1}
            style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {[
              product.categoryName || product.sku,
              stock === null ? 'stock unknown' : `stock ${stock}`,
              formatCurrency(rate, currencySymbol),
            ].join(' · ')}
          </Text>
        </View>

        <MBQtyStepper
          value={qty}
          onChange={setQty}
          label={product.name}
          disabled={disabled}
          testID={`qty-${product.id}`}
        />
      </View>
    </View>
  );
});

/*
 * The rate is FORMATTED rather than rendered, and that is the one departure from
 * "MBMoney is the only component that renders currency".
 *
 * It is part of a run of prose built with `join`, and a `Text` element cannot be
 * spliced into a string. `formatCurrency` is the same function `MBMoney` calls,
 * so the two cannot drift; what the caption gives up is the tabular figures,
 * which a sentence does not need. Every figure a person acts on — the footer's
 * three totals, the review's amounts — still goes through `MBMoney`.
 */

const styles = StyleSheet.create({
  /* The card's left and right edges. Vertical padding belongs to the row, so
     the rule below runs the full width of the content rather than stopping
     short of it — `MBListCard`'s arrangement, reproduced for a virtualised list. */
  side: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: layout.cardPad },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.snug,
    minHeight: layout.tapMin,
  },
  main: { flex: 1, gap: space.hair },
});
