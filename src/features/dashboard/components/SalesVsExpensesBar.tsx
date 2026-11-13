import { StyleSheet, Text, View } from 'react-native';
import { designType, HERO_CHIP } from '@/shared/theme';
import { HeroSurface } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { barScalePct } from '../calculations';

export interface SalesVsExpensesBarProps {
  /** The period the figures cover ("Today", "This Week"…), shown as the card's eyebrow. */
  dayLabel: string;
  sales: number;
  discounts: number;
  expenses: number;
  net: number;
}

/**
 * "Sales vs deductions" (CLAUDE.md §16) — Sales, Discounts, Expenses and Net
 * on one shared scale, so a deduction that is small against sales draws small.
 * Drawn on the violet hero like the Sales card, so every bar is a light colour.
 */
export function SalesVsExpensesBar({ dayLabel, sales, discounts, expenses, net }: SalesVsExpensesBarProps) {
  const max = Math.max(1, ...[sales, discounts, expenses, Math.abs(net)].filter(Number.isFinite));
  const ink = HERO_CHIP.text;
  const faint = HERO_CHIP.textMuted;

  const rows = [
    { label: 'Sales', kind: 'Total', value: sales, color: '#FFFFFF' },
    { label: 'Discounts', kind: 'Deduction', value: discounts, color: '#FF8A3D' },
    { label: 'Expenses', kind: 'Deduction', value: expenses, color: '#FFD36E' },
    { label: 'Net', kind: 'Result', value: net, color: '#A8EBC4' },
  ];

  return (
    <HeroSurface plain style={styles.card}>
      <Text style={[designType.eyebrow, { color: faint }]}>{dayLabel}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.item}>
          <View style={styles.labelRow}>
            <Text style={[designType.sm, { color: ink, fontWeight: '600' }]}>
              {row.label} <Text style={[designType.xs, { color: faint }]}>{row.kind}</Text>
            </Text>
            <Text style={[designType.amt, { color: ink }]}>{formatCurrency(row.value, `salesVsDeductions.${row.label}`)}</Text>
          </View>
          <View style={[styles.track, styles.trackOnHero]}>
            <View style={[styles.fill, { width: `${barScalePct(Math.abs(row.value), max)}%`, backgroundColor: row.color }]} />
          </View>
        </View>
      ))}
      <Text style={[designType.xs, { color: faint }]}>Bars share one scale, so a deduction that is small against sales draws small.</Text>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  item: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  trackOnHero: { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  fill: { height: '100%', borderRadius: 4 },
});
