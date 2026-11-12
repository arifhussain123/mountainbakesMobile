import { StyleSheet, View } from 'react-native';
import { tintFill, useAppTheme } from '@/shared/theme';
import { MiniStat } from '@/shared/ui';
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
    <View style={[styles.row, { backgroundColor: tintFill(theme) }]}>
      {[
        { label: 'Products', value: totals.products },
        { label: 'Demand Qty', value: totals.qty },
        { label: 'Verified Products', value: totals.verifiedProducts },
        { label: 'Verified Qty', value: totals.verifiedQty },
        { label: 'Packing', value: totals.packing },
      ].map((cell) => (
        <MiniStat key={cell.label} label={cell.label} value={cell.value.toLocaleString()} style={styles.cell} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The redesign's lavender `card tint` strip of mini stats; wraps to two lines on a narrow phone.
  row: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginTop: 10 },
  cell: { flexBasis: '30%', flexGrow: 1 },
});
