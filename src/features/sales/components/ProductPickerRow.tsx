import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { Product } from '@/api';
import { FLAT_CARD, TYPE } from './RedesignBits';

export interface ProductPickerRowProps {
  product: Product | null;
  qty: number;
  discountInput: string;
  availableQty: number | null;
  lineAmount: number;
  onPressSelect: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onChangeDiscount: (text: string) => void;
  onRemove: () => void;
}

/**
 * One line item in New Sale (redesign `10 New Sale`): the product (tap to
 * pick) with a ghost remove button, then the qty stepper beside "Rs. r each ·
 * −Rs. d" and the line amount. The per-item discount stays its own small
 * field under them — a sale's discount is entered per item, never for the
 * whole sale.
 */
export function ProductPickerRow({
  product,
  qty,
  discountInput,
  availableQty,
  lineAmount,
  onPressSelect,
  onIncrement,
  onDecrement,
  onChangeDiscount,
  onRemove,
}: ProductPickerRowProps) {
  const theme = useAppTheme();
  const insufficient = availableQty != null && qty > availableQty;
  // The row's own discount, back out of the amount the form already worked out.
  const lineDiscount = product ? Math.max(0, product.price * qty - lineAmount) : 0;
  const stepperBorder = insufficient ? theme.colors.danger : theme.colors.border;

  return (
    <Card style={[FLAT_CARD, styles.card]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={product ? `Product ${product.name}, change` : 'Select product'}
          onPress={onPressSelect}
          style={styles.productButton}>
          <Text style={[TYPE.h3s, styles.productName, { color: product ? theme.colors.text : theme.colors.textFaint }]} numberOfLines={1}>
            {product ? product.name : 'Search product…'}
          </Text>
          <Icon name="chevron-down" size={16} color={theme.colors.textFaint} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Remove item" onPress={onRemove} hitSlop={8} style={styles.removeButton}>
          <Icon name="close" size={18} color={theme.colors.textFaint} />
        </Pressable>
      </View>

      <View style={styles.midRow}>
        <View style={[styles.stepper, { borderColor: stepperBorder, backgroundColor: theme.colors.surface }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" onPress={onDecrement} style={styles.stepperButton}>
            <Text style={[styles.stepperSign, { color: theme.colors.textSecondary }]}>−</Text>
          </Pressable>
          <View style={[styles.stepperQty, { borderColor: stepperBorder }]}>
            <Text style={[styles.qtyText, { color: theme.colors.text }]} accessibilityLabel={`Quantity ${qty}`}>
              {qty}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" onPress={onIncrement} style={styles.stepperButton}>
            <Text style={[styles.stepperSign, { color: theme.colors.primary }]}>+</Text>
          </Pressable>
        </View>
        <View style={styles.amountCol}>
          <Text style={[TYPE.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {product ? `${formatCurrency(product.price)} each` : 'No product yet'}
            {lineDiscount > 0 ? ` · −${formatCurrency(lineDiscount)}` : ''}
          </Text>
          <Text style={[TYPE.amt, { color: theme.colors.text }]}>{formatCurrency(lineAmount)}</Text>
        </View>
      </View>

      <View style={[styles.discountRow, { borderTopColor: theme.colors.border }]}>
        <Text style={[TYPE.xs, { color: theme.colors.textSecondary }]}>Discount</Text>
        <TextInput
          value={discountInput}
          onChangeText={onChangeDiscount}
          placeholder="0"
          placeholderTextColor={theme.colors.textFaint}
          keyboardType="numeric"
          accessibilityLabel="Item discount"
          style={[styles.discountInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
        />
      </View>

      {insufficient ? (
        <Text style={[TYPE.xs, { color: theme.colors.danger }]}>
          Insufficient Stock — Available: {availableQty} / Requested: {qty}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, gap: 10, paddingVertical: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  productName: { flexShrink: 1 },
  removeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  midRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'stretch', height: 38, borderWidth: 1.5, borderRadius: 13, overflow: 'hidden' },
  stepperButton: { width: 36, alignItems: 'center', justifyContent: 'center' },
  stepperSign: { fontSize: 18, fontWeight: '600' },
  stepperQty: { minWidth: 38, paddingHorizontal: 6, borderLeftWidth: 1, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  amountCol: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, paddingTop: 10 },
  discountInput: { width: 110, height: 36, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 0, fontSize: 14, fontWeight: '600', textAlign: 'right' },
});
