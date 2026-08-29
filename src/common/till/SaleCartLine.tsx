import React, { useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { MBCard, MBIcon, MBMoney, MBPressable, MBQtyStepper } from '@/common/ui';
import { formatCurrency } from '@/common/utils/money';
import { lineAmount, type CartLine } from '@/common/helpers/saleTotals';
import { radius } from '@/common/theme/radius';
import { layout, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

export interface SaleCartLineProps {
  line: CartLine;
  currencySymbol?: string;
  onQty: (productId: string, qty: number) => void;
  onDiscountPct: (productId: string, pct: number) => void;
  onRemove: (productId: string) => void;
  disabled?: boolean;
}

/**
 * One rung-up line: quantity, the rate it was rung up at, a percentage
 * discount, and what it comes to.
 *
 * ---------------------------------------------------------------------------
 * The rate is shown and is not editable
 * ---------------------------------------------------------------------------
 * It is the catalogue price captured when the product first entered the cart,
 * and it is display only — the payload carries `{productId, qty, discount}` and
 * no price at all, because the server resolves the rate at commit. That is what
 * makes a price change between opening the till and saving impossible to
 * misprint. Showing it still matters: a cashier reading a total back to a
 * customer needs to see what each thing was rung up at.
 *
 * ---------------------------------------------------------------------------
 * The discount is a percentage, and it survives a quantity change
 * ---------------------------------------------------------------------------
 * `OrderItemSchema.discount` is rupees, so a percentage is resolved before it is
 * sent — but it is **kept** on the line as a percentage (`useCart.setDiscountPct`)
 * and re-applied whenever the quantity moves. Resolving it once and freezing the
 * rupee figure is how "10%" silently becomes 5% the moment a second unit is rung
 * up, on the screen used most often.
 *
 * Removing is its own control rather than "step down to zero". Clearing a line
 * of eight is eight taps otherwise, and the stepper is for correcting a count.
 */
export function SaleCartLine({
  line,
  currencySymbol,
  onQty,
  onDiscountPct,
  onRemove,
  disabled = false,
}: SaleCartLineProps): React.ReactElement {
  const theme = useTheme();

  const setQty = useCallback((qty: number) => onQty(line.productId, qty), [line.productId, onQty]);
  const remove = useCallback(() => onRemove(line.productId), [line.productId, onRemove]);
  const setPct = useCallback(
    (text: string) => {
      const digits = text.replace(/[^0-9]/g, '');
      onDiscountPct(line.productId, digits === '' ? 0 : Number.parseInt(digits, 10));
    },
    [line.productId, onDiscountPct],
  );

  return (
    <MBCard>
      <View style={styles.head}>
        <Text
          numberOfLines={1}
          style={[theme.type.cardTitle, styles.name, { color: theme.colors.text }]}>
          {line.productName}
        </Text>
        <MBMoney
          value={lineAmount(line)}
          size="sm"
          symbol={currencySymbol}
          testID={`line-total-${line.productId}`}
        />
        <MBPressable
          onPress={remove}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${line.productName}`}
          style={styles.remove}
          testID={`remove-${line.productId}`}>
          <MBIcon name="close" size="action" color={theme.colors.textMuted} />
        </MBPressable>
      </View>

      <View style={styles.controls}>
        <MBQtyStepper
          value={line.qty}
          onChange={setQty}
          label={line.productName}
          disabled={disabled}
          testID={`cart-qty-${line.productId}`}
        />

        <Text style={[theme.type.caption, styles.rate, { color: theme.colors.textMuted }]}>
          Rate {formatCurrency(line.unitPrice, currencySymbol)}
        </Text>

        <View
          style={[
            styles.pct,
            {
              height: layout.stepperSize,
              borderRadius: radius.md,
              borderColor: theme.colors.borderControl,
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <TextInput
            value={line.discountPct ? String(line.discountPct) : ''}
            onChangeText={setPct}
            editable={!disabled}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={`Discount percent for ${line.productName}`}
            testID={`discount-${line.productId}`}
            style={[theme.type.number, styles.pctField, { color: theme.colors.text }]}
          />
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>%</Text>
        </View>
      </View>
    </MBCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { flex: 1 },
  remove: {
    width: layout.stepperSize,
    height: layout.stepperSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  /* The rate absorbs the width. The two controls either side of it are fixed,
     because they are what the eye runs down when a cart is eight lines long. */
  rate: { flex: 1, textAlign: 'center' },
  pct: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingRight: space.snug,
  },
  pctField: { width: 44, height: '100%', textAlign: 'center', padding: 0 },
});
