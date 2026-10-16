import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { StockTotals } from '../calculations';

export interface StockSummaryStripProps {
  totals: StockTotals;
  /** Hidden when viewing a past date — waiting demand/expected balance only mean something for the live balance. */
  showDemand: boolean;
}

/**
 * Totals strip — respects whatever filter/search narrowed `totals` down to
 * (the caller sums only the visible rows), same as the web's own footer row.
 */
export function StockSummaryStrip({ totals, showDemand }: StockSummaryStripProps) {
  const theme = useAppTheme();

  const tiles: { label: string; value: string; color?: string; highlight?: boolean }[] = [
    { label: 'Opening', value: String(totals.opening) },
    { label: 'New', value: `+${totals.newQty}`, color: theme.colors.success },
    { label: 'Sold', value: `-${totals.sold}`, color: theme.colors.danger },
    { label: 'Returned', value: totals.returned >= 0 ? `-${totals.returned}` : String(totals.returned), color: theme.colors.warning },
    { label: 'Adjustment', value: totals.adjustment >= 0 ? `+${totals.adjustment}` : String(totals.adjustment) },
    { label: 'Balance', value: String(totals.balance), highlight: true },
  ];
  if (showDemand) {
    tiles.push({ label: 'Waiting demand', value: String(totals.waitingDemand) }, { label: 'Expected balance', value: String(totals.expectedBalance) });
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          style={[
            styles.tile,
            {
              backgroundColor: tile.highlight ? theme.colors.primary : theme.colors.cardFill,
              borderColor: tile.highlight ? theme.colors.primary : theme.colors.cardBorder,
              borderRadius: theme.radii.md,
            },
          ]}>
          <Text
            style={[theme.typography.label, { color: tile.highlight ? theme.colors.primaryText : theme.colors.textSecondary }]}
            numberOfLines={1}>
            {tile.label}
          </Text>
          <Text
            style={[theme.typography.cardTitle, { color: tile.highlight ? theme.colors.primaryText : (tile.color ?? theme.colors.text), marginTop: 2 }]}
            numberOfLines={1}>
            {tile.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { minWidth: 104, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
