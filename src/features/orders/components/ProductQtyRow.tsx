import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
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
}

/** One row of the Create Order product table — branchApp.md screen 05: PRODUCT/STOCK/RATE/QTY. */
export function ProductQtyRow({ product, qtyInput, availableQty, onChangeQty, returnKeyType, onSubmitEditing, inputRef }: ProductQtyRowProps) {
  const theme = useAppTheme();
  const hasQty = (parseInt(qtyInput, 10) || 0) > 0;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border, backgroundColor: hasQty ? `${theme.colors.primary}0D` : 'transparent' }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        {product.categoryName ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{product.categoryName}</Text>
        ) : null}
      </View>
      <Text style={[styles.stockCol, theme.typography.bodySmall, { color: theme.colors.text }]}>{availableQty ?? '—'}</Text>
      <Text style={[styles.rateCol, theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatCurrency(product.price)}</Text>
      <TextInput
        ref={inputRef}
        value={qtyInput}
        onChangeText={onChangeQty}
        placeholder="0"
        keyboardType="numeric"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={[styles.qtyInput, { borderColor: hasQty ? theme.colors.primary : theme.colors.border, color: theme.colors.text, borderRadius: theme.radii.sm }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1 },
  stockCol: { width: 40, textAlign: 'center' },
  rateCol: { width: 54, textAlign: 'right' },
  qtyInput: { width: 50, height: 36, borderWidth: 1.5, textAlign: 'center', fontWeight: '700' },
});
