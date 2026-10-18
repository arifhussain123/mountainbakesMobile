import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { ProductionOrder } from '@/api';
import { fulfilledTotals, isVerified, livePackingItems, requestedTotals } from '../utils/demandLines';

export interface TotalsBarProps {
  orders: ProductionOrder[];
}

/** The History tab's TOTAL row, ported from the web's own filtered-rows sum — never the whole history, only what's currently shown. */
export function TotalsBar({ orders }: TotalsBarProps) {
  const theme = useAppTheme();

  const totals = orders.reduce(
    (acc, order) => {
      const requested = requestedTotals(order);
      acc.products += requested.products;
      acc.qty += requested.qty;
      if (isVerified(order)) {
        const fulfilled = fulfilledTotals(order);
        acc.verifiedProducts += fulfilled.products;
        acc.verifiedQty += fulfilled.qty;
      }
      acc.packing += livePackingItems(order.packingItems).length;
      return acc;
    },
    { products: 0, qty: 0, verifiedProducts: 0, verifiedQty: 0, packing: 0 },
  );

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
      {[
        { label: 'Products', value: totals.products },
        { label: 'Demand Qty', value: totals.qty },
        { label: 'Verified Products', value: totals.verifiedProducts },
        { label: 'Verified Qty', value: totals.verifiedQty },
        { label: 'Packing', value: totals.packing },
      ].map((cell) => (
        <View key={cell.label} style={styles.cell}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {cell.label.toUpperCase()}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', marginTop: 2 }]}>
            {cell.value.toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, padding: 10, marginTop: 8 },
  cell: { flex: 1 },
});
