import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { QtyStepper } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { Product } from '@/api';

export interface ProductQtyRowProps {
  product: Product;
  qtyInput: string;
  availableQty: number | null;
  onChangeQty: (text: string) => void;
  /** "Next" for every row but the last, which gets "Done" — see `CreateOrderScreen`'s focus-chaining. */
  returnKeyType?: 'next' | 'done';
  /** Focuses the next product's qty field — wired by the screen, which owns the full list of row refs. */
  onSubmitEditing?: () => void;
  /** A plain ref object, not `forwardRef` — same reasoning as `QtyStepper`'s own `inputRef`. */
  inputRef?: React.RefObject<any>;
  /** First row of the list draws no divider above itself. */
  first?: boolean;
}

/**
 * One row of the Create Order product list — 2026 redesign B05 `.li`: the
 * product name over "category · stock N · Rs. rate", and a −/qty/+ stepper.
 * Typing in the field is still the main input (keypad Next chains rows).
 */
export function ProductQtyRow({ product, qtyInput, availableQty, onChangeQty, returnKeyType, onSubmitEditing, inputRef, first }: ProductQtyRowProps) {
  const theme = useAppTheme();
  const parsed = parseInt(qtyInput, 10);
  const value = qtyInput.trim() === '' || Number.isNaN(parsed) ? null : parsed;
  const hasQty = (value ?? 0) > 0;
  const meta = [product.categoryName, `stock ${availableQty ?? '—'}`, formatCurrency(product.price)].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, first ? null : [styles.divider, { borderTopColor: theme.colors.border }]]}>
      <View style={styles.nameCol}>
        <Text style={[styles.name, { color: hasQty ? theme.colors.primary : theme.colors.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textFaint }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <QtyStepper
        inputRef={inputRef}
        value={value}
        onChange={(next) => onChangeQty(next === null ? '' : String(next))}
        accessibilityLabel={`Quantity for ${product.name}`}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  nameCol: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  divider: { borderTopWidth: 1 },
});
