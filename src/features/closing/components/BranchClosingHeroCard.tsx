import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { HeroSurface } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface BranchClosingHeroCardProps {
  net: number;
  sales: number;
  expenses: number;
  cashInHand: number;
  cashSales: number;
  cashExpenses: number;
}

/**
 * Redesign B20 — the violet "Net for the day" hero: the net figure, then
 * Sales / Expenses / Cash in hand in three columns (cash in hand picked out
 * in honey, as it is the number staff physically hand over), and the cash
 * working underneath ("cash takings − cash expenses").
 */
export function BranchClosingHeroCard({ net, sales, expenses, cashInHand, cashSales, cashExpenses }: BranchClosingHeroCardProps) {
  const theme = useAppTheme();
  // White on the violet hero (light); the accent's own on-colour on dark mode's flat accent hero.
  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const honey = theme.isDark ? onHero : '#FFD36E';

  const cols = [
    { key: 'sales', label: 'Sales', value: formatCurrency(sales), color: onHero },
    { key: 'expenses', label: 'Expenses', value: formatCurrency(expenses), color: onHero },
    { key: 'cash', label: 'Cash in hand', value: formatCurrency(cashInHand), color: honey },
  ];

  return (
    <HeroSurface style={styles.card}>
      <Text style={[styles.eyebrow, { color: onHero, opacity: 0.8 }]}>Net for the day</Text>
      <Text style={[styles.value, { color: onHero }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(net)}
      </Text>
      <View style={styles.grid}>
        {cols.map((c) => (
          <View key={c.key} style={styles.col}>
            <Text style={[styles.sm, { color: onHero, opacity: 0.84 }]} numberOfLines={1}>
              {c.label}
            </Text>
            <Text
              style={[styles.colValue, { color: c.color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              accessibilityLabel={
                c.key === 'cash'
                  ? `Cash in hand ${cashInHand.toLocaleString()} rupees: cash takings ${cashSales.toLocaleString()} minus cash expenses ${cashExpenses.toLocaleString()}`
                  : undefined
              }>
              {c.value}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.sm, { color: onHero, opacity: 0.84 }]}>
        Cash takings {formatCurrency(cashSales)} − cash expenses {formatCurrency(cashExpenses)}
      </Text>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  value: { fontSize: 36, lineHeight: 42, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 4 },
  col: { flex: 1, minWidth: 0, gap: 2 },
  sm: { fontSize: 13, lineHeight: 18 },
  colValue: { fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
