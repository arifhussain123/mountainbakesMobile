import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';

export interface RevenueHeroCardProps {
  revenue: number;
  orders: number;
  profit: number;
  expenses: number;
}

/**
 * design UIandUX/mountainbakesBranch.html screen 23, lines 1102-1108 — the
 * orange "REVENUE / {N} ORDERS" hero card with Profit/Expenses nested dark
 * tiles. Mirrors `HeroSalesCard`'s shape (same card chrome, same nested-tile
 * pattern) but with this screen's own copy, so it's kept local rather than
 * reusing that component whose labels ("Sales · {period}", "Net Amount") are
 * fixed to the Home dashboard's own wording.
 */
export function RevenueHeroCard({ revenue, orders, profit, expenses }: RevenueHeroCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg + 6, padding: theme.spacing.lg }]}>
      <View style={styles.eyebrowRow}>
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primaryText }]}>REVENUE</Text>
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primaryText }]}>{orders} ORDERS</Text>
      </View>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, fontSize: 36, marginTop: theme.spacing.sm }]}>
        {formatCurrency(revenue)}
      </Text>
      <View style={[styles.grid, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
        <View style={[styles.tile, { backgroundColor: '#1C1917', borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Profit (Sales − Expenses)</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>{formatCurrency(profit)}</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: '#1C1917', borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Expenses</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>{formatCurrency(expenses)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2 },
  grid: { flexDirection: 'row' },
  tile: { flex: 1, minWidth: 0 },
});
