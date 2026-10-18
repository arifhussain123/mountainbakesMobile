import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';
import type { CashTransferTotals } from '../calculations';

export interface TransferSummaryStripProps {
  totals: CashTransferTotals;
  /** True when the loaded set may not be the complete filtered set (more than the server's max page size matched) — shown as a caveat, never silently presented as exact. */
  mayBeIncomplete: boolean;
}

/**
 * There is no server-side aggregate for this list (confirmed — `GET
 * /api/cash-transfers` only returns rows + a row count). These totals are
 * computed over the loaded set, which in the normal case (comfortably under
 * the server's 200-row max) IS the complete filtered set — `mayBeIncomplete`
 * only flips once a filter genuinely matches more than that.
 */
export function TransferSummaryStrip({ totals, mayBeIncomplete }: TransferSummaryStripProps) {
  const theme = useAppTheme();

  const tiles: { label: string; value: string; color?: string; highlight?: boolean }[] = [
    { label: 'Total transferred', value: formatCurrency(totals.totalTransferred), highlight: true },
    { label: 'Cash', value: formatCurrency(totals.cash) },
    { label: 'Easypaisa', value: formatCurrency(totals.easypaisa) },
    { label: 'Bank', value: formatCurrency(totals.bank) },
    { label: 'Fuel charges', value: formatCurrency(totals.fuelCharges), color: theme.colors.warning },
    { label: 'Pending', value: `${formatCurrency(totals.pendingAmount)} (${totals.pendingCount})`, color: theme.colors.warning },
  ];

  return (
    <View>
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
            <Text style={[theme.typography.label, { color: tile.highlight ? theme.colors.primaryText : theme.colors.textSecondary }]} numberOfLines={1}>
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
      {mayBeIncomplete ? (
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 6 }]}>
          More than 200 transfers match this filter — totals above cover the loaded ones only.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { minWidth: 120, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
