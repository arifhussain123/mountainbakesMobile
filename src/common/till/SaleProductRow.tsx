import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard, MBMoney, MBPressable } from '@/common/ui';
import { formatCurrency, formatQty } from '@/common/utils/money';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { stockLevel, type StockLevel } from '@/shared/utils/stock';
import type { Product } from '@/shared/types/product.types';

/**
 * Availability wording. A word as well as a colour — never colour alone.
 *
 * `noun` is what the balance is called: a branch sells off its **stock**, the
 * production counter off the central **pool**. Only the healthy level names it —
 * "Out of stock" and "3 left" read correctly for both, and "Out of pool" does
 * not read at all.
 */
function availabilityLabel(level: StockLevel, qty: number, noun: string): string {
  switch (level) {
    case 'out':
      return 'Out of stock';
    case 'healthy':
      return `${formatQty(qty)} in ${noun}`;
    default:
      return `${formatQty(qty)} left`;
  }
}

export interface SaleProductRowProps {
  product: Product;
  currencySymbol?: string;
  /** Balance on the shelf, or `undefined` when the device has never been told. */
  available?: number;
  /** Units of this product already rung up. 0 when it is not in the cart. */
  inCart: number;
  /** What the balance is called — 'stock' at a branch, 'pool' at the counter. */
  availabilityNoun?: string;
  onAdd: (product: Product) => void;
}

/**
 * One tappable product in the till's list. One tap is one unit.
 *
 * ---------------------------------------------------------------------------
 * Stock is shown, and never gates
 * ---------------------------------------------------------------------------
 * The balances are mirrored and can be hours old on a phone that has been
 * offline through a shift. Refusing to add a product because of one would stop a
 * cashier selling what is physically in their hand, which is the one failure
 * this screen must not have — the server is the only authority and refuses a
 * real overdraw with a 409.
 *
 * So the row is loud instead. It carries three things a cashier acts on: what is
 * left, how many are already in the cart, and — when the second exceeds the
 * first — that the sale is over stock. That is what makes the 409 **foreseeable
 * at the counter** rather than arriving hours later as a parked row in Sync
 * Center that somebody has to notice.
 *
 * `undefined` availability draws nothing at all. A device that has never
 * mirrored stock knows nothing, which is not the same as knowing there is none,
 * and "Out of stock" there would be a lie with consequences.
 *
 * Memoised, and at module scope rather than inline in a `renderItem`, because
 * this list re-renders on every keystroke of the search box and every tap. Theme
 * changes still reach it — context bypasses `memo`.
 */
export const SaleProductRow = React.memo(function SaleProductRowView({
  product,
  currencySymbol,
  available,
  inCart,
  availabilityNoun = 'stock',
  onAdd,
}: SaleProductRowProps): React.ReactElement {
  const theme = useTheme();
  // Bound here so the caller can pass one stable handler for the whole list.
  const press = useCallback(() => onAdd(product), [onAdd, product]);

  const level = available === undefined ? null : stockLevel(available);
  const availabilityColor: Record<StockLevel, string> = {
    out: theme.colors.danger,
    critical: theme.colors.danger,
    moderate: theme.colors.warning,
    healthy: theme.colors.textMuted,
  };

  const overStock = available !== undefined && inCart > available;

  return (
    <MBPressable
      onPress={press}
      accessibilityRole="button"
      /* Spoken as one thing: what it is, what it costs, what is left, and what
         is already rung up. A cashier using a screen reader should not have to
         hunt for any of the last three. */
      accessibilityLabel={[
        `Add ${product.name}`,
        formatCurrency(product.price, currencySymbol),
        level ? availabilityLabel(level, available ?? 0, availabilityNoun) : null,
        inCart > 0 ? `${formatQty(inCart)} in cart` : null,
        overStock ? 'over stock' : null,
      ]
        .filter(Boolean)
        .join(', ')}>
      <MBCard>
        <View style={styles.row}>
          <View style={styles.main}>
            <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {product.name}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {product.sku}
            </Text>
          </View>

          <View style={styles.price}>
            <MBMoney value={product.price} symbol={currencySymbol} />
            {level ? (
              <Text style={[theme.type.caption, { color: availabilityColor[level] }]}>
                {availabilityLabel(level, available ?? 0, availabilityNoun)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* The cart's own count, on its own line and only when there is one.
            A "0 in cart" on every row is a column of noise that makes the rows
            that ARE in the cart harder to find at a glance. */}
        {inCart > 0 ? (
          <View style={styles.cartLine}>
            <Text style={[theme.type.label, { color: theme.colors.accent }]}>
              {formatQty(inCart)} in cart
            </Text>
            {overStock ? (
              <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
                · more than the {formatQty(available ?? 0)} on record
              </Text>
            ) : null}
          </View>
        ) : null}
      </MBCard>
    </MBPressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  main: { flex: 1, gap: space.hair },
  price: { alignItems: 'flex-end', gap: space.hair },
  cartLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: space.tight,
    marginTop: space.sm,
  },
});
