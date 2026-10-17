import { StyleSheet, Text, View } from 'react-native';
import { ON_DARK_CHIP, useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';

export interface BranchClosingHeroCardProps {
  net: number;
  sales: number;
  expenses: number;
}

/**
 * Design lines 947-953 — the one big orange "NET" card with nested dark
 * (#1C1917) Sales/Expenses tiles, mirroring `HeroSalesCard`'s pattern
 * (src/features/dashboard/components/HeroSalesCard.tsx) but built locally
 * since the label/shape (NET first, two nested tiles, no period/sub-line)
 * doesn't match that card's dashboard-specific props.
 */
export function BranchClosingHeroCard({ net, sales, expenses }: BranchClosingHeroCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg + 6, padding: theme.spacing.lg }]}>
      <Text style={[theme.typography.label, { color: theme.colors.primaryText, textTransform: 'uppercase', letterSpacing: 1.2 }]}>NET</Text>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, fontSize: 36, marginTop: theme.spacing.sm }]}>
        {formatCurrency(net)}
      </Text>
      <View style={[styles.grid, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Sales</Text>
          <Text style={[theme.typography.cardTitle, { color: ON_DARK_CHIP.text, marginTop: 2 }]}>{formatCurrency(sales)}</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Expenses</Text>
          <Text style={[theme.typography.cardTitle, { color: ON_DARK_CHIP.text, marginTop: 2 }]}>{formatCurrency(expenses)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  grid: { flexDirection: 'row' },
  tile: { flex: 1, minWidth: 0 },
});
