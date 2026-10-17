import { StyleSheet, Text, View } from 'react-native';
import { ON_DARK_CHIP, useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';

export interface DailySaleHeroCardProps {
  /** e.g. "01–12 OCT" — the selected from/to range, short form. */
  rangeLabel: string;
  totalSale: number;
  companyShare: number;
  branchShare: number;
  cashOnTable: number;
}

/**
 * Design "21 Daily Sale Record" lines 1007-1012 — the orange "TOTAL SALE" hero
 * card with two nested dark tiles (Company Share / Cash on Table), the same
 * shape as the dashboard's `HeroSalesCard` (lines 107-113) adapted for this
 * screen's own figures instead of Net Amount/Orders.
 */
export function DailySaleHeroCard({ rangeLabel, totalSale, companyShare, branchShare, cashOnTable }: DailySaleHeroCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg + 6, padding: theme.spacing.lg }]}>
      <View style={styles.eyebrowRow}>
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primaryText }]}>Total Sale</Text>
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.primaryText }]}>{rangeLabel}</Text>
      </View>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, fontSize: 36, marginTop: theme.spacing.sm }]}>
        {formatCurrency(totalSale)}
      </Text>
      <View style={[styles.grid, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Company Share</Text>
          <Text style={[theme.typography.cardTitle, { color: ON_DARK_CHIP.text, marginTop: 2 }]}>{formatCurrency(companyShare)}</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Branch Share</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.success, marginTop: 2, fontWeight: '700' }]}>
            {formatCurrency(branchShare)}
          </Text>
        </View>
        <View style={[styles.tile, { backgroundColor: ON_DARK_CHIP.fill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: ON_DARK_CHIP.textMuted }]}>Cash on Table</Text>
          <Text style={[theme.typography.cardTitle, { color: ON_DARK_CHIP.text, marginTop: 2 }]}>{formatCurrency(cashOnTable)}</Text>
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
