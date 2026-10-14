import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { Product } from '@/api';

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

/** One line item in New Sale — CLAUDE.md Section 18: product/qty/price/discount/total. */
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

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPressSelect}
          style={[styles.productButton, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.body, { color: product ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
            {product ? product.name : 'Search product…'}
          </Text>
          <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeButton}>
          <Icon name="close" size={16} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.qtyBlock}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>QTY</Text>
          <View style={[styles.stepper, { borderColor: insufficient ? theme.colors.danger : theme.colors.border, borderRadius: theme.radii.sm }]}>
            <Pressable onPress={onDecrement} style={styles.stepperButton}>
              <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>−</Text>
            </Pressable>
            <Text style={[theme.typography.body, { color: theme.colors.text, minWidth: 24, textAlign: 'center' }]}>{qty}</Text>
            <Pressable onPress={onIncrement} style={styles.stepperButton}>
              <Text style={[theme.typography.body, { color: theme.colors.primary }]}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.rateBlock}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>RATE</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 10 }]}>{product ? formatCurrency(product.price) : '—'}</Text>
        </View>
        <View style={styles.discountBlock}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DISCOUNT</Text>
          <TextInput
            value={discountInput}
            onChangeText={onChangeDiscount}
            placeholder="0"
            keyboardType="numeric"
            style={[styles.discountInput, { borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radii.sm }]}
          />
        </View>
      </View>

      {insufficient ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 8 }]}>
          Insufficient Stock — Available: {availableQty} / Requested: {qty}
        </Text>
      ) : null}

      <View style={[styles.amountRow, { borderTopColor: theme.colors.border }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Amount</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(lineAmount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productButton: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  removeButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' },
  qtyBlock: { flexShrink: 0 },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 36, borderWidth: 1, marginTop: 4 },
  stepperButton: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rateBlock: { flex: 1 },
  discountBlock: { flex: 1 },
  discountInput: { height: 36, borderWidth: 1, paddingHorizontal: 10, marginTop: 4, fontSize: 13 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
});
