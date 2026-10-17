import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { formatSigned } from '@/shared/utils';
import type { StockTotals } from '../calculations';

export interface StockSummaryGridProps {
  totals: StockTotals;
  /** Count of products currently listed (after the listing rule, before any sort) — the grid's own "Products" tile. */
  productCount: number;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  color?: string;
  highlight?: boolean;
}

/**
 * 3x3 summary grid replacing the old horizontal-scroll strip — every figure
 * visible at once, no swiping. Row 1: Opening/New/Sold. Row 2:
 * Returned/Adjustment/Waiting demand. Row 3: Balance (highlighted)/Expected
 * balance/Products. Signed figures go through `formatSigned` so a zero
 * movement always reads as plain "0", never "+0"/"-0".
 */
export function StockSummaryGrid({ totals, productCount }: StockSummaryGridProps) {
  const theme = useAppTheme();
  const { clamp, ms } = useResponsive();
  const valueFontSize = clamp(18, ms(22), 26);

  const rows: Tile[][] = [
    [
      { key: 'opening', label: 'Opening', value: String(totals.opening) },
      { key: 'newQty', label: 'New', value: formatSigned(totals.newQty), color: theme.colors.success },
      { key: 'sold', label: 'Sold', value: formatSigned(-totals.sold), color: theme.colors.danger },
    ],
    [
      { key: 'returned', label: 'Returned', value: formatSigned(-totals.returned), color: theme.colors.orange },
      { key: 'adjustment', label: 'Adjustment', value: formatSigned(totals.adjustment) },
      { key: 'waitingDemand', label: 'Waiting demand', value: String(totals.waitingDemand), color: theme.colors.warning },
    ],
    [
      { key: 'balance', label: 'Balance', value: String(totals.balance), highlight: true },
      { key: 'expectedBalance', label: 'Expected balance', value: String(totals.expectedBalance) },
      { key: 'productCount', label: 'Products', value: String(productCount) },
    ],
  ];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((tile) => (
            <View
              key={tile.key}
              style={[
                styles.tile,
                {
                  borderRadius: theme.radii.md,
                  backgroundColor: tile.highlight ? `${theme.colors.primary}1A` : theme.colors.cardFill,
                  borderColor: tile.highlight ? theme.colors.primary : theme.colors.cardBorder,
                  borderWidth: tile.highlight ? 1.5 : 1,
                },
              ]}>
              <Text
                style={[theme.typography.label, { color: tile.highlight ? theme.colors.primary : theme.colors.textSecondary, textAlign: 'center' }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {tile.label}
              </Text>
              <Text
                style={[
                  styles.value,
                  {
                    fontSize: valueFontSize,
                    color: tile.highlight ? theme.colors.primary : (tile.color ?? theme.colors.text),
                    fontVariant: ['tabular-nums'],
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {tile.value}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 10 },
  value: { fontWeight: '700', marginTop: 4 },
});
