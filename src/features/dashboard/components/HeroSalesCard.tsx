import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';

export interface HeroSalesCardProps {
  /** e.g. "Today", "This Week", "This Month" — the active `DateFilter` label. */
  periodLabel: string;
  /** e.g. "+12% vs yesterday" — left generic until a comparison endpoint exists. */
  salesSub: string;
  sales: number;
  netAmount: number;
  orders: number;
  pending: number;
  cancelled: number;
}

/**
 * Design lines 107-113 — the one big orange "Sales · <period>" hero card with
 * the Net Amount / Orders tiles nested inside it, replacing the old generic
 * SummaryCard row.
 */
export function HeroSalesCard({ periodLabel, salesSub, sales, netAmount, orders, pending, cancelled }: HeroSalesCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg + 6, padding: theme.spacing.lg }]}>
      <View style={styles.eyebrowRow}>
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primaryText }]}>Sales · {periodLabel}</Text>
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primaryText }]}>{salesSub}</Text>
      </View>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, fontSize: 36, marginTop: theme.spacing.sm }]}>
        {formatCurrency(sales)}
      </Text>
      <View style={[styles.grid, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
        <View style={[styles.tile, { backgroundColor: '#1C1917', borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Net Amount</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>{formatCurrency(netAmount)}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.text, opacity: 0.75, marginTop: 2 }]}>Sales – Expenses</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: '#1C1917', borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Orders</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>{orders}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.text, opacity: 0.75, marginTop: 2 }]}>
            {pending} pending · {cancelled} cancelled
          </Text>
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
