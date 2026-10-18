import { StyleSheet, Text, View } from 'react-native';
import { ON_DARK_CHIP, useAppTheme } from '@/shared/theme';
import { formatCount, formatCurrency } from '@/shared/utils';

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
        {formatCurrency(sales, 'sales')}
      </Text>
      <View style={[styles.grid, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Net Amount</Text>
          <Text style={[theme.typography.cardTitle, { color: ON_DARK_CHIP.text, marginTop: 2 }]}>{formatCurrency(netAmount, 'netAmount')}</Text>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.text, opacity: 0.75, marginTop: 2 }]}>Sales – Expenses</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Orders</Text>
          <Text style={[theme.typography.cardTitle, { color: ON_DARK_CHIP.text, marginTop: 2 }]}>{formatCount(orders, 'orders')}</Text>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.text, opacity: 0.75, marginTop: 2 }]}>
            {formatCount(pending, 'pending')} pending · {formatCount(cancelled, 'cancelled')} cancelled
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
