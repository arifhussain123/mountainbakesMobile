import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '../common/MBCard';
import { MBMoney } from '../common/MBMoney';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';
import type { Product } from '@/shared/types/product.types';
import { formatCurrency } from '@/utils/money';

/**
 * One product in a catalogue list.
 *
 * Tappable only when `onSelect` is given: the same card lists products to read
 * on the catalogue and products to open on the admin screen, and a card that
 * responds to a press leading nowhere is worse than one that does not respond.
 *
 * **Inactive is marked in text, never by greying the row.** A dimmed row reads
 * as "still loading", and it is the first thing lost on a bright screen in a
 * shop window — which is exactly where this list is read.
 *
 * `price` is `numeric(14,2)` and can arrive as a JSON string; `MBMoney` coerces
 * through `toNumber` rather than rendering NaN. The accessibility label is
 * built with the same formatter, so a screen-reader user hears `Rs. 1,250`
 * rather than `1250.00`.
 */

export interface MBProductCardProps {
  product: Product;
  /** Tenant symbol from AppSettings; falls back to "Rs.". */
  currencySymbol?: string;
  /** Omit to render a non-interactive card. */
  onSelect?: (product: Product) => void;
}

export const MBProductCard = React.memo(function MBProductCardView({
  product,
  currencySymbol,
  onSelect,
}: MBProductCardProps): React.ReactElement {
  const theme = useTheme();
  const press = useCallback(() => onSelect?.(product), [onSelect, product]);

  return (
    <MBCard
      onPress={onSelect ? press : undefined}
      accessibilityLabel={`${product.name}, ${formatCurrency(product.price, currencySymbol)}${
        product.isActive ? '' : ', inactive'
      }`}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {product.sku} · {product.categoryName}
            {product.isActive ? '' : ' · Inactive'}
          </Text>
        </View>

        <MBMoney value={product.price} symbol={currencySymbol} />
      </View>
    </MBCard>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  main: { flex: 1, gap: space.hair },
});
